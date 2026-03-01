/**
 * Hook for fetching graph summary with goal and stats
 * 
 * Returns pre-extracted goal, milestones, and counts.
 * Used by MentorConceptListPage header.
 * 
 * Uses React Query for caching and deduplication.
 */

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { graphQueryApi } from '../api/queryApi';
import { knowledgeGraphKeys } from './queryKeys';
import type { GraphSummary } from '../api/types';

export interface UseGraphSummaryOptions {
  /** Whether to enable the query (default: true when graphId is provided) */
  enabled?: boolean;
  /** Stale time in milliseconds (default: 5 minutes from queryClient) */
  staleTime?: number;
}

export function useGraphSummary(graphId: string, options?: UseGraphSummaryOptions) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: knowledgeGraphKeys.graphSummary(graphId),
    queryFn: () => graphQueryApi.getGraphSummary(graphId),
    enabled: !!graphId && options?.enabled !== false,
    staleTime: options?.staleTime,
  });

  const refetch = async () => {
    // Invalidate and refetch, waiting for the new data
    await queryClient.invalidateQueries({ queryKey: knowledgeGraphKeys.graphSummary(graphId) });
    // Ensure we get fresh data by refetching
    return queryClient.refetchQueries({ queryKey: knowledgeGraphKeys.graphSummary(graphId) });
  };

  return {
    graphSummary: query.data ?? null,
    loading: query.isLoading,
    error: query.error?.message ?? null,
    refetch,
    // Additional React Query states
    isRefetching: query.isRefetching,
    isFetching: query.isFetching,
    isStale: query.isStale,
  };
}
