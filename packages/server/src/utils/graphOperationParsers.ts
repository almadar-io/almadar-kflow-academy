/**
 * Graph Operation Parsers
 * 
 * Helper functions to parse LLM response content and generate mutations
 * for use in streaming scenarios where content is accumulated first.
 */

import type { GraphNode, NodeBasedKnowledgeGraph } from '../types/nodeBasedKnowledgeGraph';
import { generateNodeId, generateRelationshipId } from '../types/nodeBasedKnowledgeGraph';
import type { GraphMutation, MutationBatch, MutationContext } from '../types/mutations';
import type { LearningGoal, Milestone } from '../types/goal';
import { extractJSONArray } from '../services/llm';

/**
 * Find concept node by name or ID
 */
function findConceptNode(
  graph: NodeBasedKnowledgeGraph,
  identifier: string
): GraphNode | undefined {
  return Object.values(graph.nodes).find(n => 
    n.type === 'Concept' && 
    (n.id === identifier || n.properties.name === identifier)
  );
}

/**
 * Parse progressive expansion content and generate mutations
 */
export async function parseProgressiveExpandContent(
  content: string,
  graph: NodeBasedKnowledgeGraph,
  mutationContext: MutationContext,
  learningGoal?: LearningGoal,
  numConcepts: number = 5
): Promise<{
  mutations: MutationBatch;
  parsedContent: {
    narrative: string;
    goal?: string;
    levelName?: string;
    concepts: Array<{ name: string; description: string; parents: string[] }>;
  };
}> {
  // Get existing layer nodes to determine next layer number
  const existingLayers = Object.values(graph.nodes).filter(n => n.type === 'Layer');
  const nextLayerNumber = existingLayers.length > 0
    ? Math.max(...existingLayers.map(n => n.properties.layerNumber || 0)) + 1
    : 1;

  // Get milestone nodes and determine target milestone for this layer
  const milestoneNodes = Object.values(graph.nodes).filter(n => n.type === 'Milestone');
  
  // Sort milestones by their sequence property
  const sortedMilestones = milestoneNodes
    .map(node => ({
      id: node.id,
      sequence: node.properties.sequence ?? 0,
      title: node.properties.name || node.properties.title || 'Milestone',
      description: node.properties.description,
      completed: node.properties.completed || false
    }))
    .sort((a, b) => a.sequence - b.sequence);
  
  // Fallback to learningGoal.milestones if no nodes found
  const milestonesWithSequence = sortedMilestones.length > 0 
    ? sortedMilestones 
    : (learningGoal?.milestones || []).map((m, idx) => ({
        id: m.id,
        sequence: idx,
        title: m.title,
        description: m.description,
        completed: m.completed
      }));
  
  // Find target milestone for this layer (Layer N targets Milestone with sequence N-1)
  let targetMilestone: { id: string; sequence: number; title: string; description?: string } | undefined;
  let targetMilestoneNode: GraphNode | undefined;
  
  if (milestonesWithSequence.length > 0) {
    const targetSequence = nextLayerNumber - 1;
    const clampedSequence = Math.min(targetSequence, milestonesWithSequence.length - 1);
    const milestone = milestonesWithSequence[clampedSequence];
    
    if (milestone) {
      targetMilestone = {
        id: milestone.id,
        sequence: milestone.sequence,
        title: milestone.title,
        description: milestone.description
      };
      targetMilestoneNode = milestoneNodes.find(n => n.id === milestone.id);
    }
  }

  // Extract level name, goal, and concepts from content
  const levelNameMatch = content.match(/<level-name>(.*?)<\/level-name>/i);
  const goalMatch = content.match(/<goal>(.*?)<\/goal>/i);
  
  const levelName = levelNameMatch?.[1]?.trim() || `Level ${nextLayerNumber}`;
  const goal = goalMatch?.[1]?.trim();

  // Extract concepts
  const conceptMatches = content.matchAll(/<concept>(.*?)<\/concept>/gi);
  const concepts: Array<{ name: string; description: string; parents: string[] }> = [];

  for (const match of conceptMatches) {
    const conceptName = match[1]?.trim();
    if (!conceptName) continue;

    // Extract description - find the description that comes after this concept tag
    const descMatch = content.match(
      new RegExp(`<concept>${conceptName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}<\/concept>\\s*<description>(.*?)<\/description>`, 'is')
    );
    
    // Extract parents - find the parents tag that comes after this concept's description
    // Use a more specific pattern that matches the concept -> description -> parents sequence
    const conceptSectionMatch = content.match(
      new RegExp(`<concept>${conceptName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}<\/concept>\\s*<description>.*?<\/description>\\s*<parents>(.*?)<\/parents>`, 'is')
    );
    
    const parents = conceptSectionMatch?.[1]?.split(',').map(p => p.trim()).filter(Boolean) || [];

    concepts.push({
      name: conceptName,
      description: descMatch?.[1]?.trim() || '',
      parents
    });
  }

  // Generate mutations
  const mutations: GraphMutation[] = [];

  // 1. Create Layer node with milestone reference
  const layerNodeId = `layer-${mutationContext.graphId}-${nextLayerNumber}`;
  const layerNode: GraphNode = {
    id: layerNodeId,
    type: 'Layer',
    properties: {
      layerNumber: nextLayerNumber,
      name: levelName,  // Store levelName as name property
      goal: goal || levelName,
      prompt: '',  // Will be set by the operation
      response: content,
      createdAt: Date.now(),
      // Store target milestone reference for easy lookup
      targetMilestoneId: targetMilestone?.id || null,
      targetMilestoneSequence: targetMilestone?.sequence ?? null,
      targetMilestoneTitle: targetMilestone?.title || null,
    },
    createdAt: Date.now(),
    updatedAt: Date.now()
  };

  mutations.push({
    type: 'create_node',
    node: layerNode,
    updateIndex: true
  });

  // 2. Create relationship from seed concept to layer
  // Use graph.seedConceptId as primary source (it's the source of truth)
  // Fallback to mutationContext.seedConceptId for backward compatibility
  const seedConceptId = graph.seedConceptId || mutationContext.seedConceptId;
  
  if (!seedConceptId) {
    throw new Error('Seed concept not found - graph does not have a seedConceptId. Cannot create layer without a seed concept.');
  }
  
  // Verify seed concept exists in graph nodes
  const seedConcept = graph.nodes[seedConceptId];
  if (!seedConcept || seedConcept.type !== 'Concept') {
    throw new Error(`Seed concept ${seedConceptId} not found in graph nodes or is not a Concept node`);
  }
  
  mutations.push({
    type: 'create_relationship',
    relationship: {
      id: generateRelationshipId(seedConceptId, layerNodeId, 'hasLayer'),
      source: seedConceptId,
      target: layerNodeId,
      type: 'hasLayer',
      direction: 'forward',
      createdAt: Date.now()
    }
  });

  // 2b. Create hasMilestone relationship from Layer to its target Milestone
  if (targetMilestoneNode) {
    mutations.push({
      type: 'create_relationship',
      relationship: {
        id: generateRelationshipId(layerNodeId, targetMilestoneNode.id, 'hasMilestone'),
        source: layerNodeId,
        target: targetMilestoneNode.id,
        type: 'hasMilestone',
        direction: 'forward',
        metadata: {
          layerNumber: nextLayerNumber,
          milestoneSequence: targetMilestone?.sequence ?? 0
        },
        createdAt: Date.now()
      }
    });
  }

  // 3. Create Concept nodes and relationships
  // Track concepts created in this batch for parent lookup
  const conceptsCreatedInBatch: Map<string, GraphNode> = new Map();
  
  for (const concept of concepts) {
    const conceptNodeId = generateNodeId('Concept', {
      graphId: mutationContext.graphId,
      name: concept.name,
      layerNumber: nextLayerNumber
    });

    // Check if concept already exists
    const existingNode = mutationContext.existingNodes[conceptNodeId];
    let conceptNode: GraphNode;
    
    if (existingNode) {
      mutations.push({
        type: 'update_node',
        nodeId: conceptNodeId,
        properties: {
          description: concept.description || existingNode.properties.description,
          layer: nextLayerNumber,
          updatedAt: Date.now()
        },
        updateTimestamp: true
      });
      conceptNode = existingNode;
    } else {
      conceptNode = {
        id: conceptNodeId,
        type: 'Concept',
        properties: {
          name: concept.name,
          description: concept.description,
          layer: nextLayerNumber,
          createdAt: Date.now()
        },
        createdAt: Date.now(),
        updatedAt: Date.now()
      };

      mutations.push({
        type: 'create_node',
        node: conceptNode,
        updateIndex: true
      });
    }
    
    // Track this concept for parent lookup in subsequent iterations
    conceptsCreatedInBatch.set(conceptNodeId, conceptNode);
    conceptsCreatedInBatch.set(concept.name, conceptNode); // Also index by name for lookup

    // Create bidirectional relationships between layer and concept
    // Layer -> containsConcept -> Concept
    mutations.push({
      type: 'create_relationship',
      relationship: {
        id: generateRelationshipId(layerNodeId, conceptNodeId, 'containsConcept'),
        source: layerNodeId,
        target: conceptNodeId,
        type: 'containsConcept',
        direction: 'forward',
        createdAt: Date.now()
      }
    });
    
    // Concept -> belongsToLayer -> Layer
    mutations.push({
      type: 'create_relationship',
      relationship: {
        id: generateRelationshipId(conceptNodeId, layerNodeId, 'belongsToLayer'),
        source: conceptNodeId,
        target: layerNodeId,
        type: 'belongsToLayer',
        direction: 'forward',
        createdAt: Date.now()
      }
    });

    // Create parent-child relationships (bidirectional)
    for (const parentName of concept.parents) {
      const trimmedParentName = parentName?.trim();
      if (!trimmedParentName) continue;
      
      // First check in existing graph
      let parentNode = findConceptNode(graph, trimmedParentName);
      
      // If not found, check in concepts created in this batch
      // Since Concept IDs use the name, we can look up directly by name
      if (!parentNode) {
        // Try lookup by name (Concept IDs are the name)
        parentNode = conceptsCreatedInBatch.get(trimmedParentName);
        
        // Also try by generated ID (in case it's different)
        if (!parentNode) {
          const parentNodeId = generateNodeId('Concept', {
            graphId: mutationContext.graphId,
            name: trimmedParentName,
            layerNumber: nextLayerNumber
          });
          parentNode = conceptsCreatedInBatch.get(parentNodeId);
        }
        
        // Fallback: search by name in all tracked concepts
        if (!parentNode) {
          for (const node of conceptsCreatedInBatch.values()) {
            if (node.properties.name === trimmedParentName) {
              parentNode = node;
              break;
            }
          }
        }
      }
      
      if (parentNode) {
        // Create hasChild: parent -> hasChild -> child
        mutations.push({
          type: 'create_relationship',
          relationship: {
            id: generateRelationshipId(parentNode.id, conceptNodeId, 'hasChild'),
            source: parentNode.id,
            target: conceptNodeId,
            type: 'hasChild',
            direction: 'forward',
            createdAt: Date.now()
          }
        });
        
        // Create hasParent: child -> hasParent -> parent
        mutations.push({
          type: 'create_relationship',
          relationship: {
            id: generateRelationshipId(conceptNodeId, parentNode.id, 'hasParent'),
            source: conceptNodeId,
            target: parentNode.id,
            type: 'hasParent',
            direction: 'forward',
            createdAt: Date.now()
          }
        });
      }
    }
  }

  return {
    mutations: {
      mutations,
      metadata: {
        operation: 'progressiveExpandMultipleFromText',
        timestamp: Date.now()
      }
    },
    parsedContent: {
      narrative: content,
      goal,
      levelName,
      concepts
    }
  };
}

/**
 * Parse explain content and generate mutations
 */
export async function parseExplainContent(
  content: string,
  graph: NodeBasedKnowledgeGraph,
  mutationContext: MutationContext,
  targetNodeId: string
): Promise<{
  mutations: MutationBatch;
  parsedContent: {
    lesson: string;
    prerequisites: string[];
  };
}> {
  const { processPrerequisitesFromLesson } = require('../utils/prerequisites');
  
  const lessonMarkdown = content.trim();

  if (!lessonMarkdown) {
    throw new Error('Explain operation returned empty lesson content');
  }

  // Get target concept
  const concept = graph.nodes[targetNodeId];
  if (!concept || concept.type !== 'Concept') {
    throw new Error(`Concept node ${targetNodeId} not found`);
  }

  // Process prerequisites from lesson
  const processedPrerequisites = processPrerequisitesFromLesson(
    lessonMarkdown,
    {
      id: concept.id,
      name: concept.properties.name,
      description: concept.properties.description || '',
      parents: [],
      children: []
    },
    undefined
  ) || [];

  // Convert prerequisites to string array
  const prerequisiteNames = processedPrerequisites.map((p: any) => 
    typeof p === 'string' ? p : (p as any).name || String(p)
  );

  // Generate mutations
  const mutations: GraphMutation[] = [];

  // 1. Create Lesson node
  const lessonNodeId = `lesson-${targetNodeId}-${Date.now()}`;
  const lessonNode: GraphNode = {
    id: lessonNodeId,
    type: 'Lesson',
    properties: {
      content: lessonMarkdown,
      generatedAt: Date.now(),
      prerequisites: prerequisiteNames
    },
    createdAt: Date.now(),
    updatedAt: Date.now()
  };

  mutations.push({
    type: 'create_node',
    node: lessonNode,
    updateIndex: true
  });

  // 2. Create relationship from concept to lesson
  mutations.push({
    type: 'create_relationship',
    relationship: {
      id: generateRelationshipId(targetNodeId, lessonNodeId, 'hasLesson'),
      source: targetNodeId,
      target: lessonNodeId,
      type: 'hasLesson',
      direction: 'forward',
      createdAt: Date.now()
    }
  });

  // 3. Update concept node with lesson reference
  mutations.push({
    type: 'update_node',
    nodeId: targetNodeId,
    properties: {
      hasLesson: true,
      lessonGeneratedAt: Date.now()
    },
    updateTimestamp: true
  });

  return {
    mutations: {
      mutations,
      metadata: {
        operation: 'explain',
        timestamp: Date.now()
      }
    },
    parsedContent: {
      lesson: lessonMarkdown,
      prerequisites: prerequisiteNames
    }
  };
}

/**
 * Parse answer question content (ephemeral - no mutations by default)
 */
export async function parseAnswerQuestionContent(
  content: string,
  storeQA: boolean = false
): Promise<{
  mutations: MutationBatch;
  parsedContent: {
    answer: string;
  };
}> {
  const answer = content.trim();

  if (!answer) {
    throw new Error('Answer question operation returned empty content');
  }

  // By default, answerQuestion is ephemeral (no mutations)
  // Mutations are only created if storeQA is true
  const mutations: GraphMutation[] = [];

  // If storeQA is true, we would create ConceptMetadata node here
  // For now, we'll leave mutations empty as the default behavior is ephemeral

  return {
    mutations: {
      mutations,
      metadata: {
        operation: 'answerQuestion',
        timestamp: Date.now()
      }
    },
    parsedContent: {
      answer
    }
  };
}

/**
 * Parse generate goals content and generate mutations
 */
export async function parseGenerateGoalsContent(
  content: string,
  graph: NodeBasedKnowledgeGraph,
  mutationContext: MutationContext,
  anchorAnswer?: string,
  manualGoal?: {
    title: string;
    description?: string;
    type?: string;
    target?: string;
    estimatedTime?: number | null;
  }
): Promise<{
  mutations: MutationBatch;
  parsedContent: {
    goal: LearningGoal;
  };
  seedConceptId?: string;
}> {
  // Parse JSON response from streamed content
  let goalData: any;
  try {
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in response');
    }
    goalData = JSON.parse(jsonMatch[0]);
  } catch (error) {
    throw new Error(`Failed to parse goal JSON: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }

  // Generate mutations
  const mutations: GraphMutation[] = [];

  // 0. Create seed concept node (if not already exists)
  let seedConceptId = graph.seedConceptId;
  if (!seedConceptId) {
    // Create seed concept from anchorAnswer or goal name
    // For manual goals, use manualGoal title; otherwise use LLM response
    const goalName = manualGoal?.title || goalData.name || goalData.title || 'Learning Goal';  // Support both name and title for backward compatibility
    const seedConceptName = anchorAnswer?.trim() || goalName;
    const goalDescription = manualGoal?.description || goalData.description || '';
    const seedConceptDescription = goalDescription || `${goalName}: ${goalDescription}`;
    
    seedConceptId = generateNodeId('Concept', {
      graphId: mutationContext.graphId,
      name: seedConceptName
    });

    const seedConceptNode: GraphNode = {
      id: seedConceptId,
      type: 'Concept',
      properties: {
        name: seedConceptName,
        description: seedConceptDescription,
        isSeed: true,
        goal: `${goalName}: ${goalDescription}`,
        createdAt: Date.now(),
        updatedAt: Date.now()
      },
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    mutations.push({
      type: 'create_node',
      node: seedConceptNode,
      updateIndex: true
    });

    // Note: seedConceptId is a graph-level property, not a node property
    // We'll need to set it directly on the graph after mutations are applied
    // For now, we'll return it in the parsedContent so the controller can set it
  }

  // 1. Create LearningGoal node
  const goalNodeId = generateNodeId('LearningGoal', {
    graphId: mutationContext.graphId
  });

  // For manual goals, use manualGoal data; otherwise use LLM response
  const goalName = manualGoal?.title || goalData.name || goalData.title || 'Learning Goal';
  const goalDescription = manualGoal?.description || goalData.description || '';
  const goalType = manualGoal?.type || goalData.type || 'custom';
  const goalTarget = manualGoal?.target || goalData.target || goalName;
  const goalEstimatedTime = manualGoal?.estimatedTime !== undefined ? manualGoal.estimatedTime : (goalData.estimatedTime || null);

  const goalNode: GraphNode = {
    id: goalNodeId,
    type: 'LearningGoal',
    properties: {
      name: goalName,  // Use name property
      description: goalDescription,
      type: goalType,
      target: goalTarget,
      estimatedTime: goalEstimatedTime,
      customMetadata: goalData.customMetadata || {},
      assessedLevel: goalData.assessedLevel,
      createdAt: Date.now(),
      updatedAt: Date.now()
    },
    createdAt: Date.now(),
    updatedAt: Date.now()
  };

  mutations.push({
    type: 'create_node',
    node: goalNode,
    updateIndex: true
  });

  // 2. Create relationship from graph to goal
  mutations.push({
    type: 'create_relationship',
    relationship: {
      id: generateRelationshipId(mutationContext.graphId, goalNodeId, 'hasLearningGoal'),
      source: mutationContext.graphId, // Graph ID as source
      target: goalNodeId,
      type: 'hasLearningGoal',
      direction: 'forward',
      createdAt: Date.now()
    }
  });

  // 2b. Create relationship from seed concept to goal
  if (seedConceptId) {
    mutations.push({
      type: 'create_relationship',
      relationship: {
        id: generateRelationshipId(seedConceptId, goalNodeId, 'belongsToGoal'),
        source: seedConceptId,
        target: goalNodeId,
        type: 'belongsToGoal',
        direction: 'forward',
        createdAt: Date.now()
      }
    });
  }

  // 3. Create Milestone nodes with explicit sequence
  const milestones: Milestone[] = [];
  if (goalData.milestones && Array.isArray(goalData.milestones)) {
    for (let index = 0; index < goalData.milestones.length; index++) {
      const milestoneData = goalData.milestones[index];
      const milestoneNodeId = generateNodeId('Milestone', {
        graphId: mutationContext.graphId,
        index
      });

      // Support both name and title for backward compatibility during transition
      const milestoneName = milestoneData.name || milestoneData.title || 'Milestone';

      const milestoneNode: GraphNode = {
        id: milestoneNodeId,
        type: 'Milestone',
        properties: {
          name: milestoneName,  // Use name property
          description: milestoneData.description || '',
          targetDate: milestoneData.targetDate || null,
          completed: milestoneData.completed || false,
          sequence: index,  // Explicit sequence for ordering
        },
        createdAt: Date.now(),
        updatedAt: Date.now()
      };

      mutations.push({
        type: 'create_node',
        node: milestoneNode,
        updateIndex: true
      });

      // Create relationship from goal to milestone with sequence metadata
      mutations.push({
        type: 'create_relationship',
        relationship: {
          id: generateRelationshipId(goalNodeId, milestoneNodeId, 'hasMilestone'),
          source: goalNodeId,
          target: milestoneNodeId,
          type: 'hasMilestone',
          direction: 'forward',
          metadata: {
            sequence: index,  // Store sequence on relationship too
          },
          createdAt: Date.now()
        }
      });

      // For the return object, use name (which we just set)
      milestones.push({
        id: milestoneNodeId,
        title: milestoneName,  // Keep title in return type for backward compatibility
        description: milestoneData.description,
        targetDate: milestoneData.targetDate,
        completed: milestoneData.completed || false
      });
    }
  }

  // Create LearningGoal object for return
  const learningGoal: LearningGoal = {
    id: goalNodeId,
    graphId: mutationContext.graphId,
    title: goalName,  // Use name but keep title in return type for backward compatibility
    description: goalDescription,
    type: goalType,
    target: goalTarget,
    estimatedTime: goalEstimatedTime,
    milestones,
    customMetadata: goalData.customMetadata,
    assessedLevel: goalData.assessedLevel,
    createdAt: Date.now(),
    updatedAt: Date.now()
  };

  return {
    mutations: {
      mutations,
      metadata: {
        operation: 'generateGoals',
        timestamp: Date.now()
      }
    },
    parsedContent: {
      goal: learningGoal
    },
    seedConceptId // Return separately for easy access
  };
}

/**
 * Find concept node by name or ID
 */
function findConceptNodeByName(
  graph: NodeBasedKnowledgeGraph,
  name: string
): GraphNode | undefined {
  return Object.values(graph.nodes).find(n => 
    n.type === 'Concept' && 
    (n.properties.name === name || n.id === name)
  );
}

/**
 * Find the layer a concept belongs to via belongsToLayer relationship
 * Returns the layer node and its layer number, or undefined if not found
 */
function findConceptLayerForParser(
  graph: NodeBasedKnowledgeGraph,
  conceptId: string
): { layerNode: GraphNode; layerNumber: number } | undefined {
  // Find belongsToLayer relationship where concept is the source
  const layerRel = graph.relationships.find(
    r => r.source === conceptId && r.type === 'belongsToLayer'
  );
  
  if (!layerRel) return undefined;
  
  const layerNode = graph.nodes[layerRel.target];
  if (!layerNode || layerNode.type !== 'Layer') return undefined;
  
  const layerNumber = layerNode.properties.layerNumber;
  if (typeof layerNumber !== 'number') return undefined;
  
  return { layerNode, layerNumber };
}

/**
 * Get all layer nodes sorted by layer number
 */
function getAllLayersForParser(graph: NodeBasedKnowledgeGraph): GraphNode[] {
  return Object.values(graph.nodes)
    .filter((n): n is GraphNode => n.type === 'Layer')
    .sort((a, b) => (a.properties.layerNumber || 0) - (b.properties.layerNumber || 0));
}

/**
 * Determine which layer a new concept should belong to (for streaming parser)
 * Uses hybrid approach:
 * 1. If parents specified → max(parent layers) + 1 or same layer as siblings
 * 2. If children specified → min(children layers) - 1 (capped at 1)
 * 3. If target nodes provided → use target node's layer
 * 4. Fallback → highest existing layer
 */
function determineLayerForNewConceptInParser(
  graph: NodeBasedKnowledgeGraph,
  parentNames: string[],
  childrenNames: string[],
  targetNodes: GraphNode[]
): GraphNode | undefined {
  const allLayers = getAllLayersForParser(graph);
  if (allLayers.length === 0) return undefined;

  // Priority 1: Infer from parents
  if (parentNames.length > 0) {
    const parentLayers: number[] = [];
    
    for (const parentName of parentNames) {
      const parentNode = findConceptNodeByName(graph, parentName);
      if (parentNode) {
        const layerInfo = findConceptLayerForParser(graph, parentNode.id);
        if (layerInfo) {
          parentLayers.push(layerInfo.layerNumber);
        }
      }
    }
    
    if (parentLayers.length > 0) {
      // New concept goes to max(parent layers) + 1
      const maxParentLayer = Math.max(...parentLayers);
      const targetLayerNumber = maxParentLayer + 1;
      
      // Find the layer with this number, or the highest available
      const targetLayer = allLayers.find(l => l.properties.layerNumber === targetLayerNumber);
      if (targetLayer) return targetLayer;
      
      // If target layer doesn't exist, return the highest layer
      return allLayers[allLayers.length - 1];
    }
  }

  // Priority 2: Infer from children
  if (childrenNames.length > 0) {
    const childLayers: number[] = [];
    
    for (const childName of childrenNames) {
      const childNode = findConceptNodeByName(graph, childName);
      if (childNode) {
        const layerInfo = findConceptLayerForParser(graph, childNode.id);
        if (layerInfo) {
          childLayers.push(layerInfo.layerNumber);
        }
      }
    }
    
    if (childLayers.length > 0) {
      // New concept goes to min(children layers) - 1, capped at 1
      const minChildLayer = Math.min(...childLayers);
      const targetLayerNumber = Math.max(1, minChildLayer - 1);
      
      const targetLayer = allLayers.find(l => l.properties.layerNumber === targetLayerNumber);
      if (targetLayer) return targetLayer;
      
      // If target layer doesn't exist, return the first layer
      return allLayers[0];
    }
  }

  // Priority 3: Use target node's layer
  if (targetNodes.length > 0) {
    for (const targetNode of targetNodes) {
      if (targetNode.type === 'Concept') {
        const layerInfo = findConceptLayerForParser(graph, targetNode.id);
        if (layerInfo) {
          return layerInfo.layerNode;
        }
      }
    }
  }

  // Priority 4: Fallback to highest layer
  return allLayers[allLayers.length - 1];
}

/**
 * Parse custom operation content and generate mutations
 */
export async function parseCustomOperationContent(
  content: string,
  graph: NodeBasedKnowledgeGraph,
  mutationContext: MutationContext,
  targetNodes: GraphNode[]
): Promise<{
  mutations: MutationBatch;
  parsedContent: {
    concepts: Array<{
      name: string;
      action: 'added' | 'updated' | 'deleted';
    }>;
  };
}> {
  // Extract and parse JSON array from streamed content
  let results: any[];
  try {
    results = extractJSONArray(content);
  } catch (error) {
    throw new Error(`Failed to parse LLM response: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }

  // Generate mutations
  const mutations: GraphMutation[] = [];
  const conceptActions: Array<{ name: string; action: 'added' | 'updated' | 'deleted' }> = [];

  // Process results - separate deletions from additions/updates
  const deletions: any[] = [];
  const additionsAndUpdates: any[] = [];

  for (const item of results) {
    if (item.delete === true) {
      deletions.push(item);
    } else {
      additionsAndUpdates.push(item);
    }
  }

  // Handle deletions
  for (const deletionItem of deletions) {
    const conceptName = deletionItem.name || deletionItem.id;
    if (!conceptName) continue;

    const existingNode = findConceptNodeByName(graph, conceptName);
    if (existingNode) {
      mutations.push({
        type: 'delete_node',
        nodeId: existingNode.id,
        cascade: true
      });
      conceptActions.push({ name: conceptName, action: 'deleted' });
    }
  }

  // Handle additions and updates
  for (const item of additionsAndUpdates) {
    const conceptName = item.name;
    if (!conceptName || typeof conceptName !== 'string') {
      continue;
    }

    const existingNode = findConceptNodeByName(graph, conceptName);
    const conceptNodeId = existingNode?.id || generateNodeId('Concept', {
      graphId: mutationContext.graphId,
      name: conceptName
    });

    // Check if this is an update or addition
    if (existingNode) {
      // Update existing concept
      mutations.push({
        type: 'update_node',
        nodeId: existingNode.id,
        properties: {
          name: conceptName,
          description: item.description || existingNode.properties.description,
          ...(item.sequence !== undefined && { sequence: item.sequence })
        },
        updateTimestamp: true
      });
      conceptActions.push({ name: conceptName, action: 'updated' });
    } else {
      // Determine which layer this new concept should belong to
      const parentNames = Array.isArray(item.parents) ? item.parents.filter((p: any) => typeof p === 'string') : [];
      const childrenNames = Array.isArray(item.children) ? item.children.filter((c: any) => typeof c === 'string') : [];
      const targetLayer = determineLayerForNewConceptInParser(graph, parentNames, childrenNames, targetNodes);
      
      // Create new concept with layer info in properties
      const conceptNode: GraphNode = {
        id: conceptNodeId,
        type: 'Concept',
        properties: {
          name: conceptName,
          description: item.description || '',
          ...(item.sequence !== undefined && { sequence: item.sequence }),
          ...(targetLayer && { layer: targetLayer.properties.layerNumber })
        },
        createdAt: Date.now(),
        updatedAt: Date.now()
      };

      mutations.push({
        type: 'create_node',
        node: conceptNode,
        updateIndex: true
      });
      conceptActions.push({ name: conceptName, action: 'added' });

      // Create belongsToLayer relationship if we found a target layer
      if (targetLayer) {
        // Concept -> belongsToLayer -> Layer
        mutations.push({
          type: 'create_relationship',
          relationship: {
            id: generateRelationshipId(conceptNodeId, targetLayer.id, 'belongsToLayer'),
            source: conceptNodeId,
            target: targetLayer.id,
            type: 'belongsToLayer',
            direction: 'forward',
            createdAt: Date.now()
          }
        });

        // Layer -> containsConcept -> Concept (bidirectional)
        mutations.push({
          type: 'create_relationship',
          relationship: {
            id: generateRelationshipId(targetLayer.id, conceptNodeId, 'containsConcept'),
            source: targetLayer.id,
            target: conceptNodeId,
            type: 'containsConcept',
            direction: 'forward',
            createdAt: Date.now()
          }
        });
      }
    }

    // Handle parent relationships
    if (Array.isArray(item.parents)) {
      for (const parentName of item.parents) {
        if (typeof parentName === 'string' && parentName.trim()) {
          const parentNode = findConceptNodeByName(graph, parentName);
          if (parentNode) {
            // Check if relationship already exists
            const exists = graph.relationships.some(r => 
              r.source === parentNode.id &&
              r.target === conceptNodeId &&
              r.type === 'hasChild'
            );

            if (!exists) {
              mutations.push({
                type: 'create_relationship',
                relationship: {
                  id: generateRelationshipId(parentNode.id, conceptNodeId, 'hasChild'),
                  source: parentNode.id,
                  target: conceptNodeId,
                  type: 'hasChild',
                  direction: 'forward',
                  createdAt: Date.now()
                }
              });

              // Also create reverse relationship
              mutations.push({
                type: 'create_relationship',
                relationship: {
                  id: generateRelationshipId(conceptNodeId, parentNode.id, 'hasParent'),
                  source: conceptNodeId,
                  target: parentNode.id,
                  type: 'hasParent',
                  direction: 'forward',
                  createdAt: Date.now()
                }
              });
            }
          }
        }
      }
    }

    // Handle lesson creation if present
    if (item.lesson && typeof item.lesson === 'string') {
      const lessonNodeId = generateNodeId('Lesson', {
        conceptId: conceptNodeId
      });

      const lessonNode: GraphNode = {
        id: lessonNodeId,
        type: 'Lesson',
        properties: {
          content: item.lesson,
          generatedAt: Date.now()
        },
        createdAt: Date.now(),
        updatedAt: Date.now()
      };

      mutations.push({
        type: 'create_node',
        node: lessonNode,
        updateIndex: true
      });

      mutations.push({
        type: 'create_relationship',
        relationship: {
          id: generateRelationshipId(conceptNodeId, lessonNodeId, 'hasLesson'),
          source: conceptNodeId,
          target: lessonNodeId,
          type: 'hasLesson',
          direction: 'forward',
          createdAt: Date.now()
        }
      });
    }

    // Handle flash card creation if present
    if (Array.isArray(item.flash) && item.flash.length > 0) {
      for (let index = 0; index < item.flash.length; index++) {
        const card = item.flash[index];
        if (card && typeof card.front === 'string' && typeof card.back === 'string') {
          const flashCardNodeId = generateNodeId('FlashCard', {
            conceptId: conceptNodeId,
            index
          });

          const flashCardNode: GraphNode = {
            id: flashCardNodeId,
            type: 'FlashCard',
            properties: {
              front: card.front.trim(),
              back: card.back.trim()
            },
            createdAt: Date.now(),
            updatedAt: Date.now()
          };

          mutations.push({
            type: 'create_node',
            node: flashCardNode,
            updateIndex: true
          });

          mutations.push({
            type: 'create_relationship',
            relationship: {
              id: generateRelationshipId(conceptNodeId, flashCardNodeId, 'hasFlashCard'),
              source: conceptNodeId,
              target: flashCardNodeId,
              type: 'hasFlashCard',
              direction: 'forward',
              createdAt: Date.now()
            }
          });
        }
      }
    }
  }

  return {
    mutations: {
      mutations,
      metadata: {
        operation: 'customOperation',
        timestamp: Date.now()
      }
    },
    parsedContent: {
      concepts: conceptActions
    }
  };
}

/**
 * Parse generate layer practice content and generate mutations
 * Stores the review content in the Layer node's properties
 */
export async function parseGenerateLayerPracticeContent(
  content: string,
  graph: NodeBasedKnowledgeGraph,
  mutationContext: MutationContext,
  layerNumber: number
): Promise<{
  mutations: MutationBatch;
  parsedContent: {
    review: string;
  };
}> {
  const reviewContent = content.trim();

  if (!reviewContent) {
    throw new Error('Generate layer practice operation returned empty review content');
  }

  // Generate mutations - store review in Layer node properties
  const mutations: GraphMutation[] = [];

  // Find the layer node for this layer number
  const layerNodes = Object.values(graph.nodes).filter(
    (n): n is GraphNode => n.type === 'Layer' && n.properties.layerNumber === layerNumber
  );
  
  const layerNode = layerNodes.length > 0 ? layerNodes[0] : null;

  if (layerNode) {
    // Update Layer node with review content stored in properties
    mutations.push({
      type: 'update_node',
      nodeId: layerNode.id,
      properties: {
        review: reviewContent,
        reviewGeneratedAt: Date.now()
      },
      updateTimestamp: true
    });
  }

  return {
    mutations: {
      mutations,
      metadata: {
        operation: 'generateLayerPractice',
        timestamp: Date.now()
      }
    },
    parsedContent: {
      review: reviewContent
    }
  };
}

