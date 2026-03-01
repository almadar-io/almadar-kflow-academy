/**
 * Graph Merge Service
 * 
 * Handles merging of concurrent graph mutations to prevent data loss.
 * Implements "merge properties" conflict resolution strategy.
 */

import type {
  NodeBasedKnowledgeGraph,
  GraphNode,
  Relationship,
  NodeTypeIndex,
} from '../types/nodeBasedKnowledgeGraph';

/**
 * Merge two graphs, combining their nodes and relationships.
 * For conflicting properties (same node updated differently), uses last-write-wins.
 * 
 * @param currentGraph - The current graph state in the database
 * @param incomingGraph - The graph with new mutations to merge
 * @returns Merged graph with all changes preserved
 */
export function mergeGraphMutations(
  currentGraph: NodeBasedKnowledgeGraph,
  incomingGraph: NodeBasedKnowledgeGraph
): NodeBasedKnowledgeGraph {
  // Merge nodes: incoming takes precedence for conflicts (last-write-wins)
  const mergedNodes: Record<string, GraphNode> = {
    ...currentGraph.nodes,
  };

  // Add or update nodes from incoming graph
  for (const [nodeId, incomingNode] of Object.entries(incomingGraph.nodes)) {
    const existingNode = mergedNodes[nodeId];
    
    if (existingNode) {
      // Node exists in both - merge properties (incoming takes precedence)
      mergedNodes[nodeId] = {
        ...existingNode,
        ...incomingNode,
        properties: {
          ...existingNode.properties,
          ...incomingNode.properties,
        },
        // Use the most recent updatedAt
        updatedAt: Math.max(
          existingNode.updatedAt || 0,
          incomingNode.updatedAt || 0
        ),
      };
    } else {
      // New node from incoming graph
      mergedNodes[nodeId] = incomingNode;
    }
  }

  // Merge relationships: avoid duplicates based on relationship ID
  const relationshipMap = new Map<string, Relationship>();
  
  // Add all current relationships
  for (const rel of currentGraph.relationships) {
    relationshipMap.set(rel.id, rel);
  }
  
  // Add or update relationships from incoming graph
  for (const incomingRel of incomingGraph.relationships) {
    const existingRel = relationshipMap.get(incomingRel.id);
    
    if (existingRel) {
      // Relationship exists - use incoming (last-write-wins)
      relationshipMap.set(incomingRel.id, incomingRel);
    } else {
      // New relationship
      relationshipMap.set(incomingRel.id, incomingRel);
    }
  }

  const mergedRelationships = Array.from(relationshipMap.values());

  // Merge node type indices
  const mergedNodeTypes = mergeNodeTypeIndices(
    currentGraph.nodeTypes,
    incomingGraph.nodeTypes,
    mergedNodes
  );

  // Merge metadata fields (incoming takes precedence for conflicts)
  const mergedGraph: NodeBasedKnowledgeGraph = {
    ...currentGraph,
    ...incomingGraph,
    nodes: mergedNodes,
    relationships: mergedRelationships,
    nodeTypes: mergedNodeTypes,
    // Use the most recent updatedAt
    updatedAt: Math.max(
      currentGraph.updatedAt || 0,
      incomingGraph.updatedAt || 0,
      Date.now()
    ),
    // Increment version
    version: (currentGraph.version || 0) + 1,
  };

  return mergedGraph;
}

/**
 * Merge node type indices from two graphs
 */
function mergeNodeTypeIndices(
  currentIndex: NodeTypeIndex,
  incomingIndex: NodeTypeIndex,
  mergedNodes: Record<string, GraphNode>
): NodeTypeIndex {
  const merged: NodeTypeIndex = {
    Graph: [],
    Concept: [],
    Layer: [],
    LearningGoal: [],
    Milestone: [],
    PracticeExercise: [],
    Lesson: [],
    ConceptMetadata: [],
    GraphMetadata: [],
    FlashCard: [],
  };

  // Build index from merged nodes (source of truth)
  for (const [nodeId, node] of Object.entries(mergedNodes)) {
    const typeArray = merged[node.type];
    if (typeArray) {
      if (!typeArray.includes(nodeId)) {
        typeArray.push(nodeId);
      }
    }
  }

  return merged;
}

/**
 * Check if two graphs have conflicting changes
 * (same node or relationship updated in both)
 */
export function hasConflictingChanges(
  currentGraph: NodeBasedKnowledgeGraph,
  incomingGraph: NodeBasedKnowledgeGraph
): boolean {
  const baseUpdatedAt = currentGraph.updatedAt || 0;
  
  // Check for conflicting node updates
  for (const [nodeId, incomingNode] of Object.entries(incomingGraph.nodes)) {
    const currentNode = currentGraph.nodes[nodeId];
    
    // Only check for conflicts if the node exists in both graphs
    if (currentNode) {
      const currentUpdatedAt = currentNode.updatedAt || 0;
      const incomingUpdatedAt = incomingNode.updatedAt || 0;
      
      // Both graphs have this node - check if it was modified in both after the base graph was last updated
      if (
        currentUpdatedAt > baseUpdatedAt &&
        incomingUpdatedAt > baseUpdatedAt
      ) {
        // Both modified the same node after the base graph was updated - potential conflict
        // For now, we use last-write-wins, so this is just informational
        return true;
      }
    }
    // If node doesn't exist in current graph, it's a new node (no conflict)
  }

  return false;
}

