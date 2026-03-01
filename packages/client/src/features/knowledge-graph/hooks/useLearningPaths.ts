/**
 * Hook for fetching all learning paths summary
 * 
 * Returns pre-formatted learning paths with goal titles, descriptions, concept counts.
 * Used by MentorPage.
 * 
 * Uses React Query for caching and deduplication.
 */

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { graphQueryApi } from '../api/queryApi';
import { knowledgeGraphKeys } from './queryKeys';
import type { LearningPathSummary } from '../api/types';

export interface UseLearningPathsOptions {
  /** Whether to enable the query (default: true) */
  enabled?: boolean;
  /** Stale time in milliseconds (default: 5 minutes from queryClient) */
  staleTime?: number;
}

export function useLearningPaths(options?: UseLearningPathsOptions) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: knowledgeGraphKeys.learningPaths(),
    queryFn: async () => {
      const response = await graphQueryApi.getLearningPaths();
      return response.learningPaths;
    },
    enabled: options?.enabled !== false,
    staleTime: options?.staleTime,
  });

  const refetch = async () => {
    await queryClient.invalidateQueries({ queryKey: knowledgeGraphKeys.learningPaths() });
  };

  return {
    learningPaths: query.data ?? [],
    loading: query.isLoading,
    error: query.error?.message ?? null,
    refetch,
    // Additional React Query states
    isRefetching: query.isRefetching,
    isFetching: query.isFetching,
    isStale: query.isStale,
  };
}
