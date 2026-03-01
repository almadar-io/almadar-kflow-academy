/**
 * Hook for fetching complete concept detail
 * 
 * Returns concept with all related data pre-extracted (lesson, flashcards, metadata, relationships).
 * Used by MentorConceptDetailPage.
 * 
 * Uses React Query for caching and deduplication.
 */

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { graphQueryApi } from '../api/queryApi';
import { knowledgeGraphKeys } from './queryKeys';
import type { ConceptDetail } from '../api/types';

export interface UseConceptDetailOptions {
  /** Whether to enable the query (default: true when both IDs are provided) */
  enabled?: boolean;
  /** Stale time in milliseconds (default: 5 minutes from queryClient) */
  staleTime?: number;
}

export function useConceptDetail(graphId: string, conceptId: string, options?: UseConceptDetailOptions) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: knowledgeGraphKeys.conceptDetail(graphId, conceptId),
    queryFn: () => graphQueryApi.getConceptDetail(graphId, conceptId),
    enabled: !!graphId && !!conceptId && options?.enabled !== false,
    staleTime: options?.staleTime,
  });

  const refetch = async () => {
    await queryClient.invalidateQueries({ 
      queryKey: knowledgeGraphKeys.conceptDetail(graphId, conceptId) 
    });
  };

  // Also provide a function to invalidate all concept details for this graph
  const invalidateAllConcepts = async () => {
    await queryClient.invalidateQueries({ 
      queryKey: knowledgeGraphKeys.graph(graphId) 
    });
  };

  return {
    conceptDetail: query.data ?? null,
    loading: query.isLoading,
    error: query.error?.message ?? null,
    refetch,
    invalidateAllConcepts,
    // Additional React Query states
    isRefetching: query.isRefetching,
    isFetching: query.isFetching,
    isStale: query.isStale,
  };
}
