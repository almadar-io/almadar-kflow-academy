/**
 * Hook for fetching mindmap structure from NodeBasedKnowledgeGraph
 * 
 * Returns hierarchical mindmap structure with seed as root, layers, and nested concepts.
 * Used by MindMap component for visualization.
 * 
 * Uses React Query for caching and deduplication.
 */

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { graphQueryApi } from '../api/queryApi';
import { knowledgeGraphKeys } from './queryKeys';
import type { MindMapResponse, MindMapNode } from '../api/types';

export interface UseMindMapStructureOptions {
  expandAll?: boolean;
  /** Whether to enable the query (default: true when graphId is provided) */
  enabled?: boolean;
  /** Stale time in milliseconds (default: 5 minutes from queryClient) */
  staleTime?: number;
}

export function useMindMapStructure(
  graphId: string,
  options?: UseMindMapStructureOptions
) {
  const queryClient = useQueryClient();
  
  // Extract query options from fetch options
  const { enabled, staleTime, ...fetchOptions } = options ?? {};

  const query = useQuery({
    queryKey: knowledgeGraphKeys.mindMap(graphId, fetchOptions),
    queryFn: () => graphQueryApi.getMindMapStructure(graphId, fetchOptions),
    enabled: !!graphId && enabled !== false,
    staleTime,
  });

  const refetch = async () => {
    await queryClient.invalidateQueries({ 
      queryKey: knowledgeGraphKeys.mindMap(graphId, fetchOptions) 
    });
  };

  return {
    mindMapData: query.data ?? null,
    nodes: query.data?.nodes ?? [],
    seedNodeId: query.data?.seedNodeId,
    totalNodes: query.data?.totalNodes ?? 0,
    layerCount: query.data?.layerCount ?? 0,
    conceptCount: query.data?.conceptCount ?? 0,
    loading: query.isLoading,
    error: query.error?.message ?? null,
    refetch,
    // Additional React Query states
    isRefetching: query.isRefetching,
    isFetching: query.isFetching,
    isStale: query.isStale,
  };
}
