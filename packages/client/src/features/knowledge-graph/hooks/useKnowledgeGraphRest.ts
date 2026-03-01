/**
 * REST API Hooks for Knowledge Graph Access
 * 
 * React hooks for making REST API calls to the knowledge graph endpoints
 */

import { useState, useCallback, useRef } from 'react';
import { useAppDispatch } from '../../../app/hooks';
import { setGraph } from '../knowledgeGraphSlice';
import { knowledgeGraphRestApi } from '../api/restApi';
import type {
  NodeBasedKnowledgeGraph,
  GraphNode,
  Relationship,
  NodeType,
  RelationshipType,
} from '../types';
import type {
  GetNodesOptions,
  GetRelationshipsOptions,
  TraverseOptions,
  CreateNodeInput,
  UpdateNodeInput,
  CreateRelationshipInput,
  DeleteNodeOptions,
} from '../api/restApi';

// Graph hooks
export const useGetGraph = () => {
  const dispatch = useAppDispatch();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  // Track in-flight requests to prevent duplicate calls
  const loadingRef = useRef<Set<string>>(new Set());

  const getGraph = useCallback(async (graphId: string, options?: { storeInRedux?: boolean }): Promise<NodeBasedKnowledgeGraph | null> => {
    if (!graphId || graphId.trim() === '') {
      throw new Error('Graph ID is required for get graph');
    }

    // Prevent duplicate concurrent requests for the same graph
    if (loadingRef.current.has(graphId)) {
      // Wait for the existing request to complete
      return new Promise((resolve) => {
        const checkInterval = setInterval(() => {
          if (!loadingRef.current.has(graphId)) {
            clearInterval(checkInterval);
            // Try to get from Redux if storeInRedux is enabled
            if (options?.storeInRedux !== false) {
              // Graph should already be in Redux from the previous call
              resolve(null);
            } else {
              resolve(null);
            }
          }
        }, 100);
      });
    }

    loadingRef.current.add(graphId);
    setLoading(true);
    setError(null);
    try {
      const graph = await knowledgeGraphRestApi.getGraph(graphId);
      
      // Automatically store in Redux unless explicitly disabled
      if (options?.storeInRedux !== false && graph) {
        dispatch(setGraph(graph));
      }
      
      return graph;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to get graph');
      setError(error);
      throw error;
    } finally {
      setLoading(false);
      loadingRef.current.delete(graphId);
    }
  }, [dispatch]);

  return { getGraph, loading, error };
};

export const useSaveGraph = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const saveGraph = useCallback(
    async (graphId: string, graph: NodeBasedKnowledgeGraph): Promise<NodeBasedKnowledgeGraph | null> => {
      setLoading(true);
      setError(null);
      try {
        const savedGraph = await knowledgeGraphRestApi.saveGraph(graphId, graph);
        return savedGraph;
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Failed to save graph');
        setError(error);
        throw error;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  return { saveGraph, loading, error };
};

// Node hooks
export const useGetNodes = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const getNodes = useCallback(
    async (graphId: string, options?: GetNodesOptions): Promise<{ nodes: GraphNode[]; count: number } | null> => {
      setLoading(true);
      setError(null);
      try {
        const result = await knowledgeGraphRestApi.getNodes(graphId, options);
        return result;
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Failed to get nodes');
        setError(error);
        throw error;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  return { getNodes, loading, error };
};

export const useGetNode = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const getNode = useCallback(async (graphId: string, nodeId: string): Promise<GraphNode | null> => {
    setLoading(true);
    setError(null);
    try {
      const node = await knowledgeGraphRestApi.getNode(graphId, nodeId);
      return node;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to get node');
      setError(error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  return { getNode, loading, error };
};

export const useCreateNode = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const createNode = useCallback(
    async (graphId: string, input: CreateNodeInput): Promise<GraphNode | null> => {
      setLoading(true);
      setError(null);
      try {
        const node = await knowledgeGraphRestApi.createNode(graphId, input);
        return node;
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Failed to create node');
        setError(error);
        throw error;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  return { createNode, loading, error };
};

export const useUpdateNode = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const updateNode = useCallback(
    async (graphId: string, nodeId: string, input: UpdateNodeInput): Promise<GraphNode | null> => {
      setLoading(true);
      setError(null);
      try {
        const node = await knowledgeGraphRestApi.updateNode(graphId, nodeId, input);
        return node;
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Failed to update node');
        setError(error);
        throw error;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  return { updateNode, loading, error };
};

export const useDeleteNode = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const deleteNode = useCallback(
    async (graphId: string, nodeId: string, options?: DeleteNodeOptions): Promise<void> => {
      setLoading(true);
      setError(null);
      try {
        await knowledgeGraphRestApi.deleteNode(graphId, nodeId, options);
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Failed to delete node');
        setError(error);
        throw error;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  return { deleteNode, loading, error };
};

export const useFindNodes = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const findNodes = useCallback(
    async (graphId: string, filter: Record<string, any>): Promise<{ nodes: GraphNode[]; count: number } | null> => {
      setLoading(true);
      setError(null);
      try {
        const result = await knowledgeGraphRestApi.findNodes(graphId, filter);
        return result;
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Failed to find nodes');
        setError(error);
        throw error;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  return { findNodes, loading, error };
};

// Relationship hooks
export const useGetRelationships = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const getRelationships = useCallback(
    async (graphId: string, options?: GetRelationshipsOptions): Promise<{ relationships: Relationship[]; count: number } | null> => {
      setLoading(true);
      setError(null);
      try {
        const result = await knowledgeGraphRestApi.getRelationships(graphId, options);
        return result;
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Failed to get relationships');
        setError(error);
        throw error;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  return { getRelationships, loading, error };
};

export const useGetNodeRelationships = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const getNodeRelationships = useCallback(
    async (
      graphId: string,
      nodeId: string,
      options?: { direction?: 'incoming' | 'outgoing' | 'both'; type?: RelationshipType }
    ): Promise<{ relationships: Relationship[]; count: number } | null> => {
      setLoading(true);
      setError(null);
      try {
        const result = await knowledgeGraphRestApi.getNodeRelationships(graphId, nodeId, options);
        return result;
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Failed to get node relationships');
        setError(error);
        throw error;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  return { getNodeRelationships, loading, error };
};

export const useCreateRelationship = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const createRelationship = useCallback(
    async (graphId: string, input: CreateRelationshipInput): Promise<Relationship | null> => {
      setLoading(true);
      setError(null);
      try {
        const relationship = await knowledgeGraphRestApi.createRelationship(graphId, input);
        return relationship;
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Failed to create relationship');
        setError(error);
        throw error;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  return { createRelationship, loading, error };
};

export const useDeleteRelationship = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const deleteRelationship = useCallback(async (graphId: string, relId: string): Promise<void> => {
    setLoading(true);
    setError(null);
    try {
      await knowledgeGraphRestApi.deleteRelationship(graphId, relId);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to delete relationship');
      setError(error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  return { deleteRelationship, loading, error };
};

// Query operation hooks
export const useFindPath = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const findPath = useCallback(
    async (graphId: string, from: string, to: string, maxDepth?: number): Promise<{ path: GraphNode[]; length: number } | null> => {
      setLoading(true);
      setError(null);
      try {
        const result = await knowledgeGraphRestApi.findPath(graphId, from, to, maxDepth);
        return result;
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Failed to find path');
        setError(error);
        throw error;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  return { findPath, loading, error };
};

export const useTraverse = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const traverse = useCallback(
    async (
      graphId: string,
      startNodeId: string,
      options?: TraverseOptions
    ): Promise<{ nodes: GraphNode[]; relationships: Relationship[]; depth: number; visited: string[] } | null> => {
      setLoading(true);
      setError(null);
      try {
        const result = await knowledgeGraphRestApi.traverse(graphId, startNodeId, options);
        return result;
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Failed to traverse graph');
        setError(error);
        throw error;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  return { traverse, loading, error };
};

export const useExtractSubgraph = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const extractSubgraph = useCallback(
    async (graphId: string, nodeIds: string[], depth?: number): Promise<NodeBasedKnowledgeGraph | null> => {
      setLoading(true);
      setError(null);
      try {
        const subgraph = await knowledgeGraphRestApi.extractSubgraph(graphId, nodeIds, depth);
        return subgraph;
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Failed to extract subgraph');
        setError(error);
        throw error;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  return { extractSubgraph, loading, error };
};

