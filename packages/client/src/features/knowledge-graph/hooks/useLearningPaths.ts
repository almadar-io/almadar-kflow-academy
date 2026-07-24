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
import { auth } from '../../../config/firebase';
import type { LearningPathSummary } from '../api/types';

// Mirror the server-side hybridCache LEARNING_PATHS TTL (10 min) so the client
// doesn't refetch mid-window only to receive the same cached payload. Mutations
// still refetch immediately via invalidateLearningPaths (useInvalidateGraph).
const TEN_MIN = 10 * 60 * 1000;

export interface UseLearningPathsOptions {
  /** Whether to enable the query (default: true) */
  enabled?: boolean;
  /** Stale time in milliseconds (default: 10 minutes, mirroring the server cache TTL) */
  staleTime?: number;
}

export function useLearningPaths(options?: UseLearningPathsOptions) {
  const queryClient = useQueryClient();

  const uid = auth.currentUser?.uid ?? 'anon';
  const query = useQuery({
    queryKey: [...knowledgeGraphKeys.learningPaths(), uid],
    queryFn: async () => {
      const response = await graphQueryApi.getLearningPaths();
      const sortedPaths = [...response.learningPaths].sort(
        (a, b) => b.updatedAt - a.updatedAt
      );
      return {
        learningPaths: sortedPaths,
        similarity: response.similarity ?? [],
        sharedConcepts: response.sharedConcepts ?? [],
      };
    },
    enabled: options?.enabled !== false,
    staleTime: options?.staleTime ?? TEN_MIN,
  });

  const refetch = async () => {
    await queryClient.invalidateQueries({ queryKey: knowledgeGraphKeys.learningPaths() });
  };

  return {
    learningPaths: query.data?.learningPaths ?? [],
    similarity: query.data?.similarity ?? [],
    sharedConcepts: query.data?.sharedConcepts ?? [],
    loading: query.isLoading,
    error: query.error?.message ?? null,
    refetch,
    // Additional React Query states
    isRefetching: query.isRefetching,
    isFetching: query.isFetching,
    isStale: query.isStale,
  };
}
