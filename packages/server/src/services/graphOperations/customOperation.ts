/**
 * Mutation-based Custom Operation
 * 
 * NEW IMPLEMENTATION: Works directly with NodeBasedKnowledgeGraph
 * Performs user-prompted modifications to the concept graph.
 * 
 * Location: server/src/services/graphOperations/
 */

import { GraphNode, NodeBasedKnowledgeGraph, generateNodeId, generateRelationshipId } from '../../types/nodeBasedKnowledgeGraph';
import { callLLM, extractJSONArray } from '../../services/llm';
import { buildCustomOperationPrompt, CustomOperationPromptContext } from './promptBuilders/customOperationPromptBuilder';
import type { GraphMutation, MutationBatch, MutationContext } from '../../types/mutations';
import { LearningGoal } from '../../types/goal';

export interface CustomOperationOptions {
  graph: NodeBasedKnowledgeGraph;
  mutationContext: MutationContext;
  targetNodes: GraphNode[];  // Concepts to operate on
  userPrompt: string;
  learningGoal?: LearningGoal;
  details?: {
    lesson?: boolean;
    flashCards?: boolean;
  };
  parentForNewConcepts?: string;
  stream?: boolean;
  uid?: string;
}

export interface CustomOperationResult {
  mutations: MutationBatch;
  content: {
    concepts: Array<{
      name: string;
      action: 'added' | 'updated' | 'deleted';
    }>;
  };
  prompt: {
    system: string;
    user: string;
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
function findConceptLayer(
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
function getAllLayers(graph: NodeBasedKnowledgeGraph): GraphNode[] {
  return Object.values(graph.nodes)
    .filter((n): n is GraphNode => n.type === 'Layer')
    .sort((a, b) => (a.properties.layerNumber || 0) - (b.properties.layerNumber || 0));
}

/**
 * Determine which layer a new concept should belong to
 * Uses hybrid approach:
 * 1. If parents specified → max(parent layers) + 1 or same layer as siblings
 * 2. If children specified → min(children layers) - 1 (capped at 1)
 * 3. If target nodes provided → use target node's layer
 * 4. Fallback → highest existing layer
 */
function determineLayerForNewConcept(
  graph: NodeBasedKnowledgeGraph,
  parentNames: string[],
  childrenNames: string[],
  targetNodes: GraphNode[]
): GraphNode | undefined {
  const allLayers = getAllLayers(graph);
  if (allLayers.length === 0) return undefined;

  // Priority 1: Infer from parents
  if (parentNames.length > 0) {
    const parentLayers: number[] = [];
    
    for (const parentName of parentNames) {
      const parentNode = findConceptNodeByName(graph, parentName);
      if (parentNode) {
        const layerInfo = findConceptLayer(graph, parentNode.id);
        if (layerInfo) {
          parentLayers.push(layerInfo.layerNumber);
        }
      }
    }
    
    if (parentLayers.length > 0) {
      // New concept goes to max(parent layers) + 1
      // But check if there are existing siblings at the next layer
      const maxParentLayer = Math.max(...parentLayers);
      const targetLayerNumber = maxParentLayer + 1;
      
      // Find the layer with this number, or the highest available
      const targetLayer = allLayers.find(l => l.properties.layerNumber === targetLayerNumber);
      if (targetLayer) return targetLayer;
      
      // If target layer doesn't exist, return the highest layer
      // (the concept will be added to the frontier)
      return allLayers[allLayers.length - 1];
    }
  }

  // Priority 2: Infer from children
  if (childrenNames.length > 0) {
    const childLayers: number[] = [];
    
    for (const childName of childrenNames) {
      const childNode = findConceptNodeByName(graph, childName);
      if (childNode) {
        const layerInfo = findConceptLayer(graph, childNode.id);
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
        const layerInfo = findConceptLayer(graph, targetNode.id);
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
 * Custom operation that works with NodeBasedKnowledgeGraph
 */
export async function customOperation(
  options: CustomOperationOptions
): Promise<CustomOperationResult | { stream: any; model: string; prompt?: string }> {
  const {
    graph,
    mutationContext,
    targetNodes,
    userPrompt,
    details,
    parentForNewConcepts,
    stream = false,
    uid
  } = options;

  if (!targetNodes || targetNodes.length === 0) {
    throw new Error('At least one target node is required for custom operation');
  }

  if (!userPrompt || userPrompt.trim().length === 0) {
    throw new Error('User prompt is required for custom operation');
  }

  // Get seed concept
  const seedConcept = graph.nodes[mutationContext.seedConceptId];

  // Build prompt using prompt builder
  const promptContext: CustomOperationPromptContext = {
    targetNodes,
    userPrompt,
    seedConcept,
    graph: {
      nodes: graph.nodes,
      relationships: graph.relationships
    },
    details,
    parentForNewConcepts
  };

  const prompts = buildCustomOperationPrompt(promptContext);

  // Call LLM
  const response = await callLLM({
    systemPrompt: prompts.system,
    userPrompt: prompts.user,
    provider: 'deepseek',
    model: 'deepseek-chat',
    uid,
    stream
  });

  // Handle streaming
  if (response.stream && response.raw) {
    return {
      stream: response.raw,
      model: response.model,
      prompt: `${prompts.system}\n\n${prompts.user}`
    };
  }

  // Extract and parse JSON array
  let results: any[];
  try {
    results = extractJSONArray(response.content || '');
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
      const targetLayer = determineLayerForNewConcept(graph, parentNames, childrenNames, targetNodes);
      
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

  // Create mutation batch
  const mutationBatch: MutationBatch = {
    mutations,
    metadata: {
      operation: 'customOperation',
      timestamp: Date.now(),
      model: response.model
    }
  };

  return {
    mutations: mutationBatch,
    content: {
      concepts: conceptActions
    },
    prompt: prompts
  };
}

