/**
 * GraphQL Hooks for Knowledge Graph Access
 * 
 * React hooks using Apollo Client for GraphQL queries and mutations
 */

import { useQuery, useMutation, useLazyQuery } from '@apollo/client';
import {
  GET_GRAPH,
  GET_NODE,
  GET_NODES,
  FIND_NODES,
  GET_RELATIONSHIPS,
  GET_NODE_RELATIONSHIPS,
  FIND_PATH,
  TRAVERSE,
  EXTRACT_SUBGRAPH,
  SAVE_GRAPH,
  CREATE_NODE,
  UPDATE_NODE,
  DELETE_NODE,
  CREATE_RELATIONSHIP,
  DELETE_RELATIONSHIP,
} from '../api/graphqlQueries';
import type {
  NodeBasedKnowledgeGraph,
  GraphNode,
  Relationship,
  NodeType,
  RelationshipType,
  RelationshipDirection,
} from '../types';

// Graph hooks
export const useGetGraphQuery = (graphId: string, options?: { skip?: boolean }) => {
  return useQuery<{ graph: NodeBasedKnowledgeGraph }>(GET_GRAPH, {
    variables: { graphId },
    skip: options?.skip || !graphId,
    errorPolicy: 'all',
  });
};

export const useGetGraphLazy = () => {
  return useLazyQuery<{ graph: NodeBasedKnowledgeGraph }>(GET_GRAPH, {
    errorPolicy: 'all',
  });
};

export const useSaveGraphMutation = () => {
  return useMutation<{ saveGraph: NodeBasedKnowledgeGraph }>(SAVE_GRAPH, {
    errorPolicy: 'all',
  });
};

// Node hooks
export const useGetNodeQuery = (graphId: string, nodeId: string, options?: { skip?: boolean }) => {
  return useQuery<{ node: GraphNode }>(GET_NODE, {
    variables: { graphId, nodeId },
    skip: options?.skip || !graphId || !nodeId,
    errorPolicy: 'all',
  });
};

export const useGetNodeLazy = () => {
  return useLazyQuery<{ node: GraphNode }>(GET_NODE, {
    errorPolicy: 'all',
  });
};

export const useGetNodesQuery = (graphId: string, type?: NodeType, options?: { skip?: boolean }) => {
  return useQuery<{ nodes: { nodes: GraphNode[]; count: number } }>(GET_NODES, {
    variables: { graphId, type },
    skip: options?.skip || !graphId,
    errorPolicy: 'all',
  });
};

export const useGetNodesLazy = () => {
  return useLazyQuery<{ nodes: { nodes: GraphNode[]; count: number } }>(GET_NODES, {
    errorPolicy: 'all',
  });
};

export const useFindNodesLazy = () => {
  return useLazyQuery<{ findNodes: { nodes: GraphNode[]; count: number } }>(FIND_NODES, {
    errorPolicy: 'all',
  });
};

export const useCreateNodeMutation = () => {
  return useMutation<{ createNode: GraphNode }>(CREATE_NODE, {
    errorPolicy: 'all',
  });
};

export const useUpdateNodeMutation = () => {
  return useMutation<{ updateNode: GraphNode }>(UPDATE_NODE, {
    errorPolicy: 'all',
  });
};

export const useDeleteNodeMutation = () => {
  return useMutation<{ deleteNode: boolean }>(DELETE_NODE, {
    errorPolicy: 'all',
  });
};

// Relationship hooks
export const useGetRelationshipsQuery = (
  graphId: string,
  filter?: {
    type?: RelationshipType;
    source?: string;
    target?: string;
    direction?: RelationshipDirection;
  },
  options?: { skip?: boolean }
) => {
  return useQuery<{ relationships: { relationships: Relationship[]; count: number } }>(GET_RELATIONSHIPS, {
    variables: { graphId, filter },
    skip: options?.skip || !graphId,
    errorPolicy: 'all',
  });
};

export const useGetRelationshipsLazy = () => {
  return useLazyQuery<{ relationships: { relationships: Relationship[]; count: number } }>(GET_RELATIONSHIPS, {
    errorPolicy: 'all',
  });
};

export const useGetNodeRelationshipsQuery = (
  graphId: string,
  nodeId: string,
  options?: {
    direction?: RelationshipDirection;
    type?: RelationshipType;
    skip?: boolean;
  }
) => {
  return useQuery<{ nodeRelationships: { relationships: Relationship[]; count: number } }>(GET_NODE_RELATIONSHIPS, {
    variables: { graphId, nodeId, direction: options?.direction, type: options?.type },
    skip: options?.skip || !graphId || !nodeId,
    errorPolicy: 'all',
  });
};

export const useGetNodeRelationshipsLazy = () => {
  return useLazyQuery<{ nodeRelationships: { relationships: Relationship[]; count: number } }>(GET_NODE_RELATIONSHIPS, {
    errorPolicy: 'all',
  });
};

export const useCreateRelationshipMutation = () => {
  return useMutation<{ createRelationship: Relationship }>(CREATE_RELATIONSHIP, {
    errorPolicy: 'all',
  });
};

export const useDeleteRelationshipMutation = () => {
  return useMutation<{ deleteRelationship: boolean }>(DELETE_RELATIONSHIP, {
    errorPolicy: 'all',
  });
};

// Query operation hooks
export const useFindPathLazy = () => {
  return useLazyQuery<{ path: { path: GraphNode[]; length: number } }>(FIND_PATH, {
    errorPolicy: 'all',
  });
};

export const useTraverseLazy = () => {
  return useLazyQuery<{
    traverse: {
      nodes: GraphNode[];
      relationships: Relationship[];
      depth: number;
      visited: string[];
    };
  }>(TRAVERSE, {
    errorPolicy: 'all',
  });
};

export const useExtractSubgraphLazy = () => {
  return useLazyQuery<{ subgraph: NodeBasedKnowledgeGraph }>(EXTRACT_SUBGRAPH, {
    errorPolicy: 'all',
  });
};

