/**
 * Graph Mutation Types
 * 
 * Centralized type definitions for graph mutations.
 * These types define how changes are applied to NodeBasedKnowledgeGraph.
 */

import type { GraphNode, Relationship, NodeType } from './nodeBasedKnowledgeGraph';

/**
 * Create Node Mutation
 * 
 * Creates a new node in the graph.
 */
export interface CreateNodeMutation {
  type: 'create_node';
  node: GraphNode;
  updateIndex?: boolean;  // Update nodeTypes index (default: true)
}

/**
 * Update Node Mutation
 * 
 * Updates properties of an existing node.
 */
export interface UpdateNodeMutation {
  type: 'update_node';
  nodeId: string;
  properties: Partial<Record<string, any>>;
  updateTimestamp?: boolean;  // Update updatedAt (default: true)
}

/**
 * Delete Node Mutation
 * 
 * Removes a node from the graph.
 */
export interface DeleteNodeMutation {
  type: 'delete_node';
  nodeId: string;
  cascade?: boolean;  // Cascade delete relationships (default: true)
}

/**
 * Create Relationship Mutation
 * 
 * Creates a new relationship between nodes.
 */
export interface CreateRelationshipMutation {
  type: 'create_relationship';
  relationship: Relationship;
}

/**
 * Delete Relationship Mutation
 * 
 * Removes a relationship from the graph.
 */
export interface DeleteRelationshipMutation {
  type: 'delete_relationship';
  relationshipId: string;
}

/**
 * Update Node Type Index Mutation
 * 
 * Manually updates the node type index (rare, usually handled automatically).
 */
export interface UpdateNodeTypeIndexMutation {
  type: 'update_node_type_index';
  nodeType: NodeType;
  nodeId: string;
  operation: 'add' | 'remove';
}

/**
 * Union type for all possible graph mutations
 */
export type GraphMutation =
  | CreateNodeMutation
  | UpdateNodeMutation
  | DeleteNodeMutation
  | CreateRelationshipMutation
  | DeleteRelationshipMutation
  | UpdateNodeTypeIndexMutation;

/**
 * Mutation Batch
 * 
 * A collection of mutations grouped together with optional metadata.
 */
export interface MutationBatch {
  mutations: GraphMutation[];
  metadata?: {
    operation: string;        // e.g., 'progressiveExpandMultipleFromText'
    timestamp: number;
    model?: string;           // LLM model used
  };
}

/**
 * Mutation Context
 * 
 * Context needed for mutation generation during operations.
 */
export interface MutationContext {
  graphId: string;
  seedConceptId: string;
  targetNodeId?: string;      // Node being operated on
  existingNodes: Record<string, GraphNode>;
  existingRelationships: Relationship[];
}

/**
 * Mutation Error
 * 
 * Error information for mutations that failed to apply.
 */
export interface MutationError {
  mutation: GraphMutation;
  error: string;
}

/**
 * Type guard to check if a mutation is a CreateNodeMutation
 */
export function isCreateNodeMutation(mutation: GraphMutation): mutation is CreateNodeMutation {
  return mutation.type === 'create_node';
}

/**
 * Type guard to check if a mutation is an UpdateNodeMutation
 */
export function isUpdateNodeMutation(mutation: GraphMutation): mutation is UpdateNodeMutation {
  return mutation.type === 'update_node';
}

/**
 * Type guard to check if a mutation is a DeleteNodeMutation
 */
export function isDeleteNodeMutation(mutation: GraphMutation): mutation is DeleteNodeMutation {
  return mutation.type === 'delete_node';
}

/**
 * Type guard to check if a mutation is a CreateRelationshipMutation
 */
export function isCreateRelationshipMutation(mutation: GraphMutation): mutation is CreateRelationshipMutation {
  return mutation.type === 'create_relationship';
}

/**
 * Type guard to check if a mutation is a DeleteRelationshipMutation
 */
export function isDeleteRelationshipMutation(mutation: GraphMutation): mutation is DeleteRelationshipMutation {
  return mutation.type === 'delete_relationship';
}

/**
 * Type guard to check if a mutation is an UpdateNodeTypeIndexMutation
 */
export function isUpdateNodeTypeIndexMutation(mutation: GraphMutation): mutation is UpdateNodeTypeIndexMutation {
  return mutation.type === 'update_node_type_index';
}

