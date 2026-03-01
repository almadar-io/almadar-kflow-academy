/**
 * Query utilities for Node-Based Knowledge Graph
 * 
 * Provides helper functions to query nodes and relationships in the node-based graph structure.
 */

import type {
  NodeBasedKnowledgeGraph,
  GraphNode,
  Relationship,
  NodeType,
  RelationshipType,
} from '../types/nodeBasedKnowledgeGraph';

/**
 * Get all nodes of a specific type
 */
export function getNodesByType(
  graph: NodeBasedKnowledgeGraph,
  type: NodeType
): GraphNode[] {
  const nodeIds = graph.nodeTypes[type] || [];
  return nodeIds
    .map((id) => graph.nodes[id])
    .filter((node): node is GraphNode => node !== undefined);
}

/**
 * Get a node by ID
 */
export function getNodeById(
  graph: NodeBasedKnowledgeGraph,
  nodeId: string
): GraphNode | undefined {
  return graph.nodes[nodeId];
}

/**
 * Get all relationships for a node
 */
export function getRelationshipsForNode(
  graph: NodeBasedKnowledgeGraph,
  nodeId: string,
  direction?: 'incoming' | 'outgoing' | 'both'
): Relationship[] {
  const relationships: Relationship[] = [];
  
  for (const rel of graph.relationships) {
    const isSource = rel.source === nodeId;
    const isTarget = rel.target === nodeId;
    
    if (direction === 'incoming' && isTarget) {
      relationships.push(rel);
    } else if (direction === 'outgoing' && isSource) {
      relationships.push(rel);
    } else if (direction === 'both' && (isSource || isTarget)) {
      relationships.push(rel);
    } else if (!direction && (isSource || isTarget)) {
      relationships.push(rel);
    }
  }
  
  return relationships;
}

/**
 * Get relationships of a specific type for a node
 */
export function getRelationshipsByType(
  graph: NodeBasedKnowledgeGraph,
  nodeId: string,
  relationshipType: RelationshipType,
  direction?: 'incoming' | 'outgoing' | 'both'
): Relationship[] {
  return getRelationshipsForNode(graph, nodeId, direction).filter(
    (rel) => rel.type === relationshipType
  );
}

/**
 * Get nodes connected to a node via a specific relationship type
 */
export function getConnectedNodes(
  graph: NodeBasedKnowledgeGraph,
  nodeId: string,
  relationshipType: RelationshipType,
  direction: 'incoming' | 'outgoing' = 'outgoing'
): GraphNode[] {
  const relationships = getRelationshipsByType(graph, nodeId, relationshipType, direction);
  const connectedNodeIds = new Set<string>();
  
  for (const rel of relationships) {
    if (direction === 'outgoing') {
      connectedNodeIds.add(rel.target);
    } else {
      connectedNodeIds.add(rel.source);
    }
  }
  
  return Array.from(connectedNodeIds)
    .map((id) => graph.nodes[id])
    .filter((node): node is GraphNode => node !== undefined);
}

/**
 * Get all layers for a graph
 */
export function getLayersForGraph(
  graph: NodeBasedKnowledgeGraph
): GraphNode[] {
  return getNodesByType(graph, 'Layer')
    .filter((node) => {
      // Check if layer belongs to this graph
      const belongsToGraph = getRelationshipsByType(
        graph,
        node.id,
        'belongsToGraph',
        'outgoing'
      ).some((rel) => rel.target === graph.id);
      return belongsToGraph;
    })
    .sort((a, b) => {
      const layerNumA = a.properties.layerNumber || 0;
      const layerNumB = b.properties.layerNumber || 0;
      return layerNumA - layerNumB;
    });
}

/**
 * Get all concepts in a layer
 */
export function getConceptsInLayer(
  graph: NodeBasedKnowledgeGraph,
  layerNodeId: string
): GraphNode[] {
  const conceptIds = getConnectedNodes(graph, layerNodeId, 'containsConcept', 'outgoing')
    .map((node) => node.id);
  
  return conceptIds
    .map((id) => graph.nodes[id])
    .filter((node): node is GraphNode => node !== undefined && node.type === 'Concept');
}

/**
 * Get the top-level concept for a layer
 */
export function getTopLevelConceptForLayer(
  graph: NodeBasedKnowledgeGraph,
  layerNodeId: string
): GraphNode | undefined {
  const topLevelConcepts = getConnectedNodes(graph, layerNodeId, 'hasTopLevelConcept', 'outgoing');
  return topLevelConcepts[0];
}

/**
 * Get all practice exercises for a layer
 */
export function getPracticeExercisesForLayer(
  graph: NodeBasedKnowledgeGraph,
  layerNodeId: string
): GraphNode[] {
  return getConnectedNodes(graph, layerNodeId, 'hasPracticeExercise', 'outgoing')
    .filter((node) => node.type === 'PracticeExercise');
}

/**
 * Get all learning goals for a graph
 */
export function getLearningGoalsForGraph(
  graph: NodeBasedKnowledgeGraph
): GraphNode[] {
  return getConnectedNodes(graph, graph.id, 'hasLearningGoal', 'outgoing')
    .filter((node) => node.type === 'LearningGoal');
}

/**
 * Get all milestones for a learning goal
 * Sorted by sequence property for correct ordering
 */
export function getMilestonesForGoal(
  graph: NodeBasedKnowledgeGraph,
  goalNodeId: string
): GraphNode[] {
  return getConnectedNodes(graph, goalNodeId, 'hasMilestone', 'outgoing')
    .filter((node) => node.type === 'Milestone')
    .sort((a, b) => {
      // Sort by sequence property (primary), then by target date or creation order (fallback)
      const seqA = a.properties.sequence ?? Infinity;
      const seqB = b.properties.sequence ?? Infinity;
      if (seqA !== seqB) {
        return seqA - seqB;
      }
      // Fallback to target date or creation order
      const dateA = a.properties.targetDate || a.createdAt || 0;
      const dateB = b.properties.targetDate || b.createdAt || 0;
      return dateA - dateB;
    });
}

/**
 * Get the lesson for a concept
 */
export function getLessonForConcept(
  graph: NodeBasedKnowledgeGraph,
  conceptNodeId: string
): GraphNode | undefined {
  const lessons = getConnectedNodes(graph, conceptNodeId, 'hasLesson', 'outgoing')
    .filter((node) => node.type === 'Lesson');
  return lessons[0];
}

/**
 * Get metadata for a concept
 */
export function getMetadataForConcept(
  graph: NodeBasedKnowledgeGraph,
  conceptNodeId: string
): GraphNode | undefined {
  const metadata = getConnectedNodes(graph, conceptNodeId, 'hasMetadata', 'outgoing')
    .filter((node) => node.type === 'ConceptMetadata');
  return metadata[0];
}

/**
 * Get metadata for a graph
 */
export function getMetadataForGraph(
  graph: NodeBasedKnowledgeGraph
): GraphNode | undefined {
  const metadata = getConnectedNodes(graph, graph.id, 'hasMetadata', 'outgoing')
    .filter((node) => node.type === 'GraphMetadata');
  return metadata[0];
}

/**
 * Get all flash cards for a concept
 */
export function getFlashCardsForConcept(
  graph: NodeBasedKnowledgeGraph,
  conceptNodeId: string
): GraphNode[] {
  return getConnectedNodes(graph, conceptNodeId, 'hasFlashCard', 'outgoing')
    .filter((node) => node.type === 'FlashCard');
}

/**
 * Get the seed concept for a graph
 */
export function getSeedConcept(
  graph: NodeBasedKnowledgeGraph
): GraphNode | undefined {
  const seedConcepts = getConnectedNodes(graph, graph.id, 'hasSeedConcept', 'outgoing')
    .filter((node) => node.type === 'Concept' && node.properties.isSeed);
  return seedConcepts[0];
}

/**
 * Get all concepts in a graph
 */
export function getConceptsInGraph(
  graph: NodeBasedKnowledgeGraph
): GraphNode[] {
  return getNodesByType(graph, 'Concept');
}

/**
 * Check if a relationship exists between two nodes
 */
export function hasRelationship(
  graph: NodeBasedKnowledgeGraph,
  sourceId: string,
  targetId: string,
  relationshipType: RelationshipType
): boolean {
  return graph.relationships.some(
    (rel) =>
      rel.source === sourceId &&
      rel.target === targetId &&
      rel.type === relationshipType
  );
}

/**
 * Get the next layer in sequence
 */
export function getNextLayer(
  graph: NodeBasedKnowledgeGraph,
  layerNodeId: string
): GraphNode | undefined {
  const nextLayers = getConnectedNodes(graph, layerNodeId, 'precedesLayer', 'outgoing')
    .filter((node) => node.type === 'Layer');
  return nextLayers[0];
}

/**
 * Get the previous layer in sequence
 */
export function getPreviousLayer(
  graph: NodeBasedKnowledgeGraph,
  layerNodeId: string
): GraphNode | undefined {
  const prevLayers = getConnectedNodes(graph, layerNodeId, 'followsLayer', 'outgoing')
    .filter((node) => node.type === 'Layer');
  return prevLayers[0];
}

