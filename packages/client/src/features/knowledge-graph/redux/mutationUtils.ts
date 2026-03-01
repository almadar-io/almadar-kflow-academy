/**
 * Mutation Utilities
 * 
 * Functions for applying mutations to NodeBasedKnowledgeGraph instances.
 * These are pure functions that return new graph instances (immutable).
 */

import type { NodeBasedKnowledgeGraph, GraphMutation, GraphNode, Relationship } from '../types';

/**
 * Apply a single mutation to a graph
 */
function applyMutation(
  graph: NodeBasedKnowledgeGraph,
  mutation: GraphMutation
): NodeBasedKnowledgeGraph {
  switch (mutation.type) {
    case 'create_node':
      const updateIndex = mutation.updateIndex !== false;
      const newNodeTypes = updateIndex
        ? {
            ...graph.nodeTypes,
            [mutation.node.type]: [
              ...(graph.nodeTypes[mutation.node.type] || []),
              mutation.node.id,
            ],
          }
        : graph.nodeTypes;

      return {
        ...graph,
        nodes: {
          ...graph.nodes,
          [mutation.node.id]: mutation.node,
        },
        nodeTypes: newNodeTypes,
        updatedAt: Date.now(),
      };

    case 'update_node':
      const node = graph.nodes[mutation.nodeId];
      if (!node) return graph;

      return {
        ...graph,
        nodes: {
          ...graph.nodes,
          [mutation.nodeId]: {
            ...node,
            properties: {
              ...node.properties,
              ...mutation.properties,
            },
            updatedAt: mutation.updateTimestamp !== false ? Date.now() : node.updatedAt,
          },
        },
        updatedAt: Date.now(),
      };

    case 'delete_node':
      const { [mutation.nodeId]: deletedNode, ...remainingNodes } = graph.nodes;
      if (!deletedNode) return graph;

      const cascade = mutation.cascade !== false;
      const remainingRelationships = cascade
        ? graph.relationships.filter(
            (rel) => rel.source !== mutation.nodeId && rel.target !== mutation.nodeId
          )
        : graph.relationships;

      const nodeTypeArray = graph.nodeTypes[deletedNode.type];
      return {
        ...graph,
        nodes: remainingNodes,
        nodeTypes: {
          ...graph.nodeTypes,
          [deletedNode.type]: nodeTypeArray
            ? nodeTypeArray.filter((id) => id !== mutation.nodeId)
            : [],
        },
        relationships: remainingRelationships,
        updatedAt: Date.now(),
      };

    case 'create_relationship':
      const exists = graph.relationships.some((r) => r.id === mutation.relationship.id);
      if (exists) return graph;

      return {
        ...graph,
        relationships: [...graph.relationships, mutation.relationship],
        updatedAt: Date.now(),
      };

    case 'delete_relationship':
      return {
        ...graph,
        relationships: graph.relationships.filter(
          (rel) => rel.id !== mutation.relationshipId
        ),
        updatedAt: Date.now(),
      };

    case 'update_node_type_index':
      const nodeType = mutation.nodeType;
      const currentIndex = graph.nodeTypes[nodeType] || [];
      const newIndex =
        mutation.operation === 'add'
          ? [...currentIndex, mutation.nodeId].filter((id, index, self) => self.indexOf(id) === index) // Remove duplicates
          : currentIndex.filter((id) => id !== mutation.nodeId);

      return {
        ...graph,
        nodeTypes: {
          ...graph.nodeTypes,
          [nodeType]: newIndex,
        },
        updatedAt: Date.now(),
      };

    default:
      return graph;
  }
}

/**
 * Apply multiple mutations to a graph
 */
export function applyMutationsToGraph(
  graph: NodeBasedKnowledgeGraph,
  mutations: GraphMutation[]
): NodeBasedKnowledgeGraph {
  let updatedGraph = graph;

  for (const mutation of mutations) {
    updatedGraph = applyMutation(updatedGraph, mutation);
  }

  return updatedGraph;
}


