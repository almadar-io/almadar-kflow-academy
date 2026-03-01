/**
 * Graph Mutation Service
 * 
 * Core service for applying mutations to NodeBasedKnowledgeGraph structures.
 * Handles validation, error handling, and maintains graph integrity.
 */

import type {
  NodeBasedKnowledgeGraph,
  GraphNode,
  NodeTypeIndex,
  NodeType,
} from '../types/nodeBasedKnowledgeGraph';
import type {
  GraphMutation,
  MutationBatch,
  MutationError,
  CreateNodeMutation,
  UpdateNodeMutation,
  DeleteNodeMutation,
  CreateRelationshipMutation,
  DeleteRelationshipMutation,
  UpdateNodeTypeIndexMutation,
} from '../types/mutations';

/**
 * Graph Mutation Service
 * 
 * Applies mutations to NodeBasedKnowledgeGraph structures immutably.
 */
export class GraphMutationService {
  /**
   * Apply a single mutation to a graph (immutable)
   */
  applyMutation(
    graph: NodeBasedKnowledgeGraph,
    mutation: GraphMutation
  ): NodeBasedKnowledgeGraph {
    switch (mutation.type) {
      case 'create_node':
        return this.applyCreateNodeMutation(graph, mutation);
      case 'update_node':
        return this.applyUpdateNodeMutation(graph, mutation);
      case 'delete_node':
        return this.applyDeleteNodeMutation(graph, mutation);
      case 'create_relationship':
        return this.applyCreateRelationshipMutation(graph, mutation);
      case 'delete_relationship':
        return this.applyDeleteRelationshipMutation(graph, mutation);
      case 'update_node_type_index':
        return this.applyUpdateNodeTypeIndexMutation(graph, mutation);
      default:
        // Exhaustiveness check - TypeScript will error if a mutation type is missing
        const _exhaustive: never = mutation;
        throw new Error(`Unknown mutation type: ${(_exhaustive as GraphMutation).type}`);
    }
  }

  /**
   * Apply a batch of mutations (immutable)
   */
  applyMutationBatch(
    graph: NodeBasedKnowledgeGraph,
    batch: MutationBatch
  ): NodeBasedKnowledgeGraph {
    let updatedGraph = graph;

    for (const mutation of batch.mutations) {
      updatedGraph = this.applyMutation(updatedGraph, mutation);
    }

    return updatedGraph;
  }

  /**
   * Apply mutations with error handling (partial success)
   * 
   * Returns both the updated graph and any errors encountered.
   * Mutations that fail are skipped, but others continue to apply.
   */
  applyMutationBatchSafe(
    graph: NodeBasedKnowledgeGraph,
    batch: MutationBatch
  ): {
    graph: NodeBasedKnowledgeGraph;
    errors: MutationError[];
  } {
    let updatedGraph = graph;
    const errors: MutationError[] = [];

    for (const mutation of batch.mutations) {
      try {
        // Validate before applying
        const isValid = this.validateMutation(updatedGraph, mutation);
        if (!isValid) {
          errors.push({
            mutation,
            error: 'Validation failed',
          });
          continue;
        }

        // Apply mutation
        updatedGraph = this.applyMutation(updatedGraph, mutation);
      } catch (error) {
        errors.push({
          mutation,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return {
      graph: updatedGraph,
      errors,
    };
  }

  /**
   * Validate a mutation without applying it
   */
  validateMutation(
    graph: NodeBasedKnowledgeGraph,
    mutation: GraphMutation
  ): boolean {
    try {
      switch (mutation.type) {
        case 'create_node':
          return this.validateCreateNodeMutation(graph, mutation);
        case 'update_node':
          return this.validateUpdateNodeMutation(graph, mutation);
        case 'delete_node':
          return this.validateDeleteNodeMutation(graph, mutation);
        case 'create_relationship':
          return this.validateCreateRelationshipMutation(graph, mutation);
        case 'delete_relationship':
          return this.validateDeleteRelationshipMutation(graph, mutation);
        case 'update_node_type_index':
          return this.validateUpdateNodeTypeIndexMutation(graph, mutation);
        default:
          return false;
      }
    } catch {
      return false;
    }
  }

  // ========== Private: Apply Mutation Methods ==========

  /**
   * Apply Create Node Mutation
   */
  private applyCreateNodeMutation(
    graph: NodeBasedKnowledgeGraph,
    mutation: CreateNodeMutation
  ): NodeBasedKnowledgeGraph {
    const { node, updateIndex = true } = mutation;

    // Check for duplicate node ID
    if (graph.nodes[node.id]) {
      throw new Error(`Node with ID ${node.id} already exists`);
    }

    // Add node
    const updatedNodes = {
      ...graph.nodes,
      [node.id]: node,
    };

    // Update node type index if requested
    const updatedNodeTypes = updateIndex
      ? this.addNodeToIndex(graph.nodeTypes, node.type, node.id)
      : graph.nodeTypes;

    return {
      ...graph,
      nodes: updatedNodes,
      nodeTypes: updatedNodeTypes,
      updatedAt: Date.now(),
    };
  }

  /**
   * Apply Update Node Mutation
   */
  private applyUpdateNodeMutation(
    graph: NodeBasedKnowledgeGraph,
    mutation: UpdateNodeMutation
  ): NodeBasedKnowledgeGraph {
    const { nodeId, properties, updateTimestamp = true } = mutation;

    // Validate node exists
    const existingNode = graph.nodes[nodeId];
    if (!existingNode) {
      throw new Error(`Node ${nodeId} not found`);
    }

    // Merge properties
    const updatedNode: GraphNode = {
      ...existingNode,
      properties: {
        ...existingNode.properties,
        ...properties,
      },
      updatedAt: updateTimestamp ? Date.now() : existingNode.updatedAt,
    };

    return {
      ...graph,
      nodes: {
        ...graph.nodes,
        [nodeId]: updatedNode,
      },
      updatedAt: Date.now(),
    };
  }

  /**
   * Apply Delete Node Mutation
   */
  private applyDeleteNodeMutation(
    graph: NodeBasedKnowledgeGraph,
    mutation: DeleteNodeMutation
  ): NodeBasedKnowledgeGraph {
    const { nodeId, cascade = true } = mutation;

    // Validate node exists
    const nodeToDelete = graph.nodes[nodeId];
    if (!nodeToDelete) {
      throw new Error(`Node ${nodeId} not found`);
    }

    // Remove node
    const { [nodeId]: deletedNode, ...remainingNodes } = graph.nodes;

    // Update node type index
    const updatedNodeTypes = this.removeNodeFromIndex(
      graph.nodeTypes,
      nodeToDelete.type,
      nodeId
    );

    // Remove relationships (cascade if requested)
    const updatedRelationships = cascade
      ? graph.relationships.filter(
          (rel) => rel.source !== nodeId && rel.target !== nodeId
        )
      : graph.relationships;

    return {
      ...graph,
      nodes: remainingNodes,
      nodeTypes: updatedNodeTypes,
      relationships: updatedRelationships,
      updatedAt: Date.now(),
    };
  }

  /**
   * Apply Create Relationship Mutation
   */
  private applyCreateRelationshipMutation(
    graph: NodeBasedKnowledgeGraph,
    mutation: CreateRelationshipMutation
  ): NodeBasedKnowledgeGraph {
    const { relationship } = mutation;

    // Validate source and target nodes exist
    if (!graph.nodes[relationship.source]) {
      throw new Error(`Source node ${relationship.source} not found`);
    }
    if (!graph.nodes[relationship.target]) {
      throw new Error(`Target node ${relationship.target} not found`);
    }

    // Check for duplicate relationship
    const existingRel = graph.relationships.find(
      (rel) => rel.id === relationship.id
    );
    if (existingRel) {
      throw new Error(`Relationship with ID ${relationship.id} already exists`);
    }

    return {
      ...graph,
      relationships: [...graph.relationships, relationship],
      updatedAt: Date.now(),
    };
  }

  /**
   * Apply Delete Relationship Mutation
   */
  private applyDeleteRelationshipMutation(
    graph: NodeBasedKnowledgeGraph,
    mutation: DeleteRelationshipMutation
  ): NodeBasedKnowledgeGraph {
    const { relationshipId } = mutation;

    // Check if relationship exists
    const exists = graph.relationships.some((rel) => rel.id === relationshipId);
    if (!exists) {
      throw new Error(`Relationship ${relationshipId} not found`);
    }

    return {
      ...graph,
      relationships: graph.relationships.filter(
        (rel) => rel.id !== relationshipId
      ),
      updatedAt: Date.now(),
    };
  }

  /**
   * Apply Update Node Type Index Mutation
   */
  private applyUpdateNodeTypeIndexMutation(
    graph: NodeBasedKnowledgeGraph,
    mutation: UpdateNodeTypeIndexMutation
  ): NodeBasedKnowledgeGraph {
    const { nodeType, nodeId, operation } = mutation;

    const updatedNodeTypes =
      operation === 'add'
        ? this.addNodeToIndex(graph.nodeTypes, nodeType, nodeId)
        : this.removeNodeFromIndex(graph.nodeTypes, nodeType, nodeId);

    return {
      ...graph,
      nodeTypes: updatedNodeTypes,
      updatedAt: Date.now(),
    };
  }

  // ========== Private: Validation Methods ==========

  /**
   * Validate Create Node Mutation
   */
  private validateCreateNodeMutation(
    graph: NodeBasedKnowledgeGraph,
    mutation: CreateNodeMutation
  ): boolean {
    // Check for duplicate node ID
    if (graph.nodes[mutation.node.id]) {
      return false;
    }

    // Validate node has required fields
    if (!mutation.node.id || !mutation.node.type || !mutation.node.properties) {
      return false;
    }

    return true;
  }

  /**
   * Validate Update Node Mutation
   */
  private validateUpdateNodeMutation(
    graph: NodeBasedKnowledgeGraph,
    mutation: UpdateNodeMutation
  ): boolean {
    // Validate node exists
    if (!graph.nodes[mutation.nodeId]) {
      return false;
    }

    return true;
  }

  /**
   * Validate Delete Node Mutation
   */
  private validateDeleteNodeMutation(
    graph: NodeBasedKnowledgeGraph,
    mutation: DeleteNodeMutation
  ): boolean {
    // Validate node exists
    if (!graph.nodes[mutation.nodeId]) {
      return false;
    }

    return true;
  }

  /**
   * Validate Create Relationship Mutation
   */
  private validateCreateRelationshipMutation(
    graph: NodeBasedKnowledgeGraph,
    mutation: CreateRelationshipMutation
  ): boolean {
    const { relationship } = mutation;

    // Validate source node exists
    if (!graph.nodes[relationship.source]) {
      return false;
    }

    // Validate target node exists
    if (!graph.nodes[relationship.target]) {
      return false;
    }

    // Check for duplicate relationship ID
    if (graph.relationships.some((rel) => rel.id === relationship.id)) {
      return false;
    }

    return true;
  }

  /**
   * Validate Delete Relationship Mutation
   */
  private validateDeleteRelationshipMutation(
    graph: NodeBasedKnowledgeGraph,
    mutation: DeleteRelationshipMutation
  ): boolean {
    // Check if relationship exists
    return graph.relationships.some((rel) => rel.id === mutation.relationshipId);
  }

  /**
   * Validate Update Node Type Index Mutation
   */
  private validateUpdateNodeTypeIndexMutation(
    graph: NodeBasedKnowledgeGraph,
    mutation: UpdateNodeTypeIndexMutation
  ): boolean {
    const { nodeType, nodeId } = mutation;

    // Validate node type is valid
    const validNodeTypes: NodeType[] = [
      'Graph',
      'Concept',
      'Layer',
      'LearningGoal',
      'Milestone',
      'PracticeExercise',
      'Lesson',
      'ConceptMetadata',
      'GraphMetadata',
      'FlashCard',
    ];

    if (!validNodeTypes.includes(nodeType)) {
      return false;
    }

    // Validate node exists
    if (!graph.nodes[nodeId]) {
      return false;
    }

    return true;
  }

  // ========== Private: Helper Methods ==========

  /**
   * Add node to node type index
   */
  private addNodeToIndex(
    nodeTypes: NodeTypeIndex,
    nodeType: NodeType,
    nodeId: string
  ): NodeTypeIndex {
    const currentList = nodeTypes[nodeType] || [];
    if (currentList.includes(nodeId)) {
      return nodeTypes; // Already in index
    }

    return {
      ...nodeTypes,
      [nodeType]: [...currentList, nodeId],
    };
  }

  /**
   * Remove node from node type index
   */
  private removeNodeFromIndex(
    nodeTypes: NodeTypeIndex,
    nodeType: NodeType,
    nodeId: string
  ): NodeTypeIndex {
    const currentList = nodeTypes[nodeType] || [];
    const filteredList = currentList.filter((id) => id !== nodeId);

    return {
      ...nodeTypes,
      [nodeType]: filteredList,
    };
  }
}

// Export singleton instance for convenience
export const graphMutationService = new GraphMutationService();

