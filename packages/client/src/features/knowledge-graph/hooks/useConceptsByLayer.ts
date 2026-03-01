/**
 * Hook for fetching concepts organized by layer
 * 
 * Returns pre-formatted concepts with relationships resolved to names.
 * Used by MentorConceptListPage.
 * 
 * Uses React Query for caching and deduplication.
 */

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { graphQueryApi } from '../api/queryApi';
import { knowledgeGraphKeys } from './queryKeys';
import type { ConceptsByLayerResponse, ConceptDisplay } from '../api/types';

export interface UseConceptsByLayerOptions {
  includeRelationships?: boolean;
  groupByLayer?: boolean;
  /** Whether to enable the query (default: true when graphId is provided) */
  enabled?: boolean;
  /** Stale time in milliseconds (default: 5 minutes from queryClient) */
  staleTime?: number;
}

export function useConceptsByLayer(graphId: string, options?: UseConceptsByLayerOptions) {
  const queryClient = useQueryClient();
  
  // Extract query options from fetch options
  const { enabled, staleTime, ...fetchOptions } = options ?? {};

  const query = useQuery({
    queryKey: knowledgeGraphKeys.conceptsByLayer(graphId, fetchOptions),
    queryFn: () => graphQueryApi.getConceptsByLayer(graphId, fetchOptions),
    enabled: !!graphId && enabled !== false,
    staleTime,
  });

  const refetch = async () => {
    await queryClient.invalidateQueries({ 
      queryKey: knowledgeGraphKeys.conceptsByLayer(graphId, fetchOptions) 
    });
  };

  return {
    concepts: query.data?.concepts ?? [],
    groupedByLayer: query.data?.groupedByLayer,
    layerInfo: query.data?.layerInfo ?? [],
    loading: query.isLoading,
    error: query.error?.message ?? null,
    refetch,
    // Additional React Query states
    isRefetching: query.isRefetching,
    isFetching: query.isFetching,
    isStale: query.isStale,
  };
}
