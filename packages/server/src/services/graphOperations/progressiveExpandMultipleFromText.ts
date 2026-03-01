/**
 * Mutation-based Progressive Expand Multiple From Text Operation
 * 
 * NEW IMPLEMENTATION: Works directly with NodeBasedKnowledgeGraph
 * Does NOT call original operations - designed for new architecture
 * 
 * Location: server/src/operations/mutations/
 */

import { GraphNode, NodeBasedKnowledgeGraph, generateNodeId, generateRelationshipId } from '../../types/nodeBasedKnowledgeGraph';
import { callLLM } from '../../services/llm';
import { buildExpansionPrompt, ExpansionPromptContext } from './promptBuilders';
import { LearningGoal } from '../../types/goal';
import type { GraphMutation, MutationBatch, MutationContext } from '../../types/mutations';

export interface ProgressiveExpandMultipleFromTextOptions {
  graph: NodeBasedKnowledgeGraph;
  mutationContext: MutationContext;
  numConcepts?: number;
  learningGoal?: LearningGoal;
  stream?: boolean;
  uid?: string;
}

export interface ProgressiveExpandMultipleFromTextResult {
  mutations: MutationBatch;
  content: {
    narrative: string;
    goal?: string;
    levelName?: string;
    concepts: Array<{ name: string; description: string; parents: string[] }>;
  };
  prompt: {
    system: string;
    user: string;
  };
}

/**
 * Get nodes by type from graph
 */
function getNodesByType(graph: NodeBasedKnowledgeGraph, type: string): GraphNode[] {
  return Object.values(graph.nodes).filter(n => n.type === type);
}

/**
 * Find concept node by name or ID
 */
function findConceptNode(graph: NodeBasedKnowledgeGraph, identifier: string): GraphNode | undefined {
  return Object.values(graph.nodes).find(n => 
    n.type === 'Concept' && 
    (n.id === identifier || n.properties.name === identifier)
  );
}

/**
 * Progressive expand operation that works with NodeBasedKnowledgeGraph
 */
export async function progressiveExpandMultipleFromText(
  options: ProgressiveExpandMultipleFromTextOptions
): Promise<ProgressiveExpandMultipleFromTextResult | { stream: any; model: string }> {
  const { 
    graph, 
    mutationContext, 
    numConcepts = 5,
    learningGoal,
    stream = false,
    uid 
  } = options;

  // Get seed concept node - use graph.seedConceptId directly (it's the source of truth)
  const seedConceptId = graph.seedConceptId || mutationContext.seedConceptId;
  if (!seedConceptId) {
    throw new Error('Seed concept not found - graph does not have a seedConceptId');
  }
  
  const seedConcept = graph.nodes[seedConceptId];
  if (!seedConcept || seedConcept.type !== 'Concept') {
    throw new Error(`Seed concept ${seedConceptId} not found in graph nodes`);
  }

  // Get previous layers (all existing concepts)
  const previousLayers = getNodesByType(graph, 'Concept');
  
  // Get existing layer nodes to determine next layer number
  const existingLayers = getNodesByType(graph, 'Layer');
  const nextLayerNumber = existingLayers.length > 0
    ? Math.max(...existingLayers.map(n => n.properties.layerNumber || 0)) + 1
    : 1;

  const isFirstLayer = existingLayers.length === 0;

  // Calculate difficulty and focus from learning goal or graph metadata
  const difficulty = learningGoal?.assessedLevel 
    ?? learningGoal?.customMetadata?.difficulty 
    ?? graph.difficulty 
    ?? 'intermediate';

  const focus = learningGoal?.customMetadata?.focus 
    ?? learningGoal?.description 
    ?? graph.focus;

  // Determine target milestone based on existing layers and milestone sequences
  // Logic: Each layer corresponds to working toward a milestone in sequence order
  // - Use milestone.sequence (stored on Milestone nodes) for ordering
  // - Match layers to milestones by layer number to milestone sequence
  const totalMilestones = learningGoal?.milestones?.length || 0;
  
  // Get milestone nodes from the graph to access their sequence property
  const milestoneNodes = getNodesByType(graph, 'Milestone');
  
  // Sort milestones by their sequence property (stored on node)
  const sortedMilestones = milestoneNodes
    .map(node => ({
      id: node.id,
      sequence: node.properties.sequence ?? 0,
      title: node.properties.name || node.properties.title || 'Milestone',
      description: node.properties.description,
      completed: node.properties.completed || false
    }))
    .sort((a, b) => a.sequence - b.sequence);
  
  // Fallback to learningGoal.milestones if no nodes found (for goals passed as parameters)
  const milestonesWithSequence = sortedMilestones.length > 0 
    ? sortedMilestones 
    : (learningGoal?.milestones || []).map((m, idx) => ({
        id: m.id,
        sequence: idx,
        title: m.title,
        description: m.description,
        completed: m.completed
      }));
  
  let targetMilestone: { index: number; title: string; description?: string; nodeId?: string } | undefined;
  let targetMilestoneNode: GraphNode | undefined;
  
  if (milestonesWithSequence.length > 0) {
    // Find the target milestone for this layer
    // Layer N (1-indexed) targets Milestone with sequence N-1 (0-indexed)
    // e.g., Layer 1 -> Milestone sequence 0, Layer 2 -> Milestone sequence 1
    const targetSequence = nextLayerNumber - 1;
    
    // Clamp to valid range
    const clampedSequence = Math.min(targetSequence, milestonesWithSequence.length - 1);
    const milestone = milestonesWithSequence[clampedSequence];
    
    if (milestone) {
      targetMilestone = {
        index: milestone.sequence,
        title: milestone.title,
        description: milestone.description,
        nodeId: milestone.id
      };
      
      // Find the actual milestone node for creating relationship
      targetMilestoneNode = milestoneNodes.find(n => n.id === milestone.id);
    }
  }

  // Calculate completed milestones count
  const completedMilestonesCount = milestonesWithSequence.filter(m => m.completed).length;

  // Build prompt using prompt builder
  const promptContext: ExpansionPromptContext = {
    seedConcept,
    previousLayers,
    existingLayers,  // Pass layer nodes for tracking previous goals
    numConcepts,
    learningGoal,
    difficulty: difficulty as 'beginner' | 'intermediate' | 'advanced',
    focus,
    isFirstLayer,
    targetMilestone,
    completedMilestonesCount,
    totalMilestones
  };

  const prompts = buildExpansionPrompt(promptContext);

  // Call LLM
  const response = await callLLM({
    systemPrompt: prompts.system,
    userPrompt: prompts.user,
    uid,
    stream
  });

  // Handle streaming
  if (response.stream && response.raw) {
    return {
      stream: response.raw,
      model: response.model
    };
  }

  // Parse response using existing processor (or create new parser)
  // For now, we'll use a simplified approach
  const content = response.content.trim();
  
  // Extract level name, goal, and concepts from content
  const levelNameMatch = content.match(/<level-name>(.*?)<\/level-name>/i);
  const goalMatch = content.match(/<goal>(.*?)<\/goal>/i);
  
  const levelName = levelNameMatch?.[1]?.trim() || `Level ${nextLayerNumber}`;
  const goal = goalMatch?.[1]?.trim();

  // Extract concepts with their descriptions and parents
  // Pattern: <concept>NAME</concept><description>DESC</description><parents>PARENTS</parents>
  // Each concept is followed by its own description and parents tags
  const concepts: Array<{ name: string; description: string; parents: string[] }> = [];
  
  // Use a regex that captures concept + description + parents as a group
  // This ensures we get the correct description/parents for each concept
  const conceptPattern = /<concept>(.*?)<\/concept>\s*<description>(.*?)<\/description>\s*<parents>(.*?)<\/parents>/gis;
  
  let conceptMatch;
  while ((conceptMatch = conceptPattern.exec(content)) !== null) {
    const conceptName = conceptMatch[1]?.trim();
    const description = conceptMatch[2]?.trim() || '';
    const parentsStr = conceptMatch[3]?.trim() || '';
    
    if (!conceptName) continue;
    
    // Parse parents (comma-separated list)
    const parents = parentsStr
      .split(',')
      .map(p => p.trim())
      .filter(Boolean);

    concepts.push({
      name: conceptName,
      description,
      parents
    });
  }
  
  // Fallback: if the above pattern doesn't match (e.g., different formatting),
  // try extracting concepts individually
  if (concepts.length === 0) {
    const conceptMatches = content.matchAll(/<concept>(.*?)<\/concept>/gi);
    
    for (const match of conceptMatches) {
      const conceptName = match[1]?.trim();
      if (!conceptName) continue;
      
      // Escape special regex characters in concept name
      const escapedName = conceptName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      
      // Find description immediately after this concept
      const descPattern = new RegExp(
        `<concept>${escapedName}<\/concept>\\s*<description>([\\s\\S]*?)<\/description>`,
        'i'
      );
      const descMatch = content.match(descPattern);
      
      // Find parents after the description for this concept
      const parentsPattern = new RegExp(
        `<concept>${escapedName}<\/concept>\\s*<description>[\\s\\S]*?<\/description>\\s*<parents>([\\s\\S]*?)<\/parents>`,
        'i'
      );
      const parentsMatch = content.match(parentsPattern);
      
      const parents = parentsMatch?.[1]?.split(',').map(p => p.trim()).filter(Boolean) || [];

      concepts.push({
        name: conceptName,
        description: descMatch?.[1]?.trim() || '',
        parents
      });
    }
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
      prompt: prompts.user,
      response: content,
      createdAt: Date.now(),
      // Store target milestone reference for easy lookup
      targetMilestoneId: targetMilestone?.nodeId || null,
      targetMilestoneSequence: targetMilestone?.index ?? null,
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
  // This links the layer to the milestone it's working toward
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
          milestoneSequence: targetMilestone?.index ?? 0
        },
        createdAt: Date.now()
      }
    });
  }

  // 3. Mark previous milestone as completed (if this is not the first layer)
  // When Layer N is generated, Milestone N-1 should be marked as completed
  // This signals the learner has completed the previous milestone's concepts
  if (!isFirstLayer && learningGoal?.milestones && learningGoal.milestones.length > 0) {
    // Find the milestone to mark as completed
    // Previous milestone index = existingLayers.length - 1 (the layer we just completed)
    const milestoneIndexToComplete = existingLayers.length - 1;
    
    if (milestoneIndexToComplete >= 0 && milestoneIndexToComplete < learningGoal.milestones.length) {
      const milestoneToComplete = learningGoal.milestones[milestoneIndexToComplete];
      
      // Only mark if not already completed
      if (!milestoneToComplete.completed) {
        // Find the milestone node in the graph
        const milestoneNodes = getNodesByType(graph, 'Milestone');
        const milestoneNode = milestoneNodes.find(
          m => m.properties.id === milestoneToComplete.id || 
               m.properties.name === milestoneToComplete.title ||
               m.id === milestoneToComplete.id
        );
        
        if (milestoneNode) {
          mutations.push({
            type: 'update_node',
            nodeId: milestoneNode.id,
            properties: {
              completed: true,
              completedAt: Date.now()
            },
            updateTimestamp: true
          });
        }
      }
    }
  }

  // 4. Create Concept nodes and relationships
  for (const concept of concepts) {
    const conceptNodeId = generateNodeId('Concept', {
      graphId: mutationContext.graphId,
      name: concept.name,
      layerNumber: nextLayerNumber
    });

    // Check if concept already exists
    const existingNode = mutationContext.existingNodes[conceptNodeId];
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
    } else {
      const conceptNode: GraphNode = {
        id: conceptNodeId,
        type: 'Concept',
        properties: {
          name: concept.name,
          description: concept.description,
          layer: nextLayerNumber
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
      const parentNode = findConceptNode(graph, parentName);
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

  // Create mutation batch
  const mutationBatch: MutationBatch = {
    mutations,
    metadata: {
      operation: 'progressiveExpandMultipleFromText',
      timestamp: Date.now(),
      model: response.model
    }
  };

  return {
    mutations: mutationBatch,
    content: {
      narrative: content,
      goal,
      levelName,
      concepts
    },
    prompt: prompts
  };
}
