/**
 * Hook for updating node properties in the knowledge graph
 * 
 * Uses the graph mutation system to update node properties like isExpanded.
 * Automatically invalidates React Query cache after successful update.
 */

import { useState, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { graphOperationsApi } from '../api/graphOperationsApi';
import type { UpdateNodeMutation } from '../types';
import { useAppDispatch } from '../../../app/hooks';
import { updateGraph } from '../knowledgeGraphSlice';
import { knowledgeGraphKeys } from './queryKeys';

export interface UseUpdateNodePropertiesReturn {
  updateProperties: (nodeId: string, properties: Record<string, any>) => Promise<any>;
  updating: boolean;
  error: string | null;
}

/**
 * Hook to update node properties in the knowledge graph
 * 
 * @param graphId - The ID of the graph containing the node
 * @returns Object with updateProperties function, updating state, and error state
 */
export function useUpdateNodeProperties(graphId: string): UseUpdateNodePropertiesReturn {
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dispatch = useAppDispatch();
  const queryClient = useQueryClient();

  const updateProperties = useCallback(async (
    nodeId: string,
    properties: Record<string, any>
  ) => {
    if (!graphId) {
      const errorMsg = 'Graph ID is required';
      setError(errorMsg);
      throw new Error(errorMsg);
    }

    setUpdating(true);
    setError(null);
    
    try {
      const mutation: UpdateNodeMutation = {
        type: 'update_node',
        nodeId,
        properties,
      };

      // Server expects { mutations: { mutations: [...] } } structure (MutationBatch)
      const response = await graphOperationsApi.applyMutations(graphId, {
        mutations: {
          mutations: [mutation],
          metadata: {
            operation: 'update_node_properties',
            timestamp: Date.now(),
          },
        },
      });

      // Update Redux store with updated graph
      if (response.graph) {
        dispatch(updateGraph({ graphId, updates: response.graph }));
      }

      // Invalidate React Query caches
      await Promise.all([
        // Invalidate the specific concept detail
        queryClient.invalidateQueries({ 
          queryKey: knowledgeGraphKeys.conceptDetail(graphId, nodeId) 
        }),
        // Invalidate graph summary (for goal/milestone updates)
        queryClient.invalidateQueries({ 
          queryKey: knowledgeGraphKeys.graphSummary(graphId) 
        }),
        // Invalidate concepts by layer (in case layer info changes)
        queryClient.invalidateQueries({ 
          queryKey: knowledgeGraphKeys.conceptsByLayer(graphId) 
        }),
      ]);

      return response.graph;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update node properties';
      setError(errorMessage);
      throw err;
    } finally {
      setUpdating(false);
    }
  }, [graphId, dispatch]);

  return { updateProperties, updating, error };
}

