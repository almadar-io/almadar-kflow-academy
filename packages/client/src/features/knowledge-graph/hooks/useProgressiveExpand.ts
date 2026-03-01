/**
 * Hook for Progressive Expand Operation
 * 
 * Provides a hook for progressively expanding the knowledge graph.
 * Supports both streaming and non-streaming modes.
 * 
 * Automatically invalidates React Query cache after successful expansion.
 */

import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAppDispatch, useAppSelector } from '../../../app/hooks';
import { store } from '../../../app/store';
import { graphOperationsApi, graphOperationsStreamingApi } from '../api';
import {
  progressiveExpandStart,
  progressiveExpandSuccess,
  progressiveExpandFailure,
  streamingStart,
  streamingChunk,
  streamingMutations,
  streamingDone,
  streamingError,
} from '../redux/graphOperationSlice';
import { updateGraph } from '../knowledgeGraphSlice';
import { applyMutationsToGraph } from '../redux/mutationUtils';
import { knowledgeGraphKeys } from './queryKeys';
import type { ProgressiveExpandRequest, ProgressiveExpandResponse } from '../api/types';

export function useProgressiveExpand(graphId: string) {
  const dispatch = useAppDispatch();
  const queryClient = useQueryClient();
  const { isLoading, error } = useAppSelector(
    (state) => state.graphOperations.progressiveExpand
  );
  const streaming = useAppSelector((state) => state.graphOperations.streaming);

  // Invalidate React Query cache for this graph
  const invalidateGraphQueries = useCallback(async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: knowledgeGraphKeys.graphSummary(graphId) }),
      queryClient.invalidateQueries({ queryKey: [...knowledgeGraphKeys.graph(graphId), 'concepts-by-layer'] }),
      queryClient.invalidateQueries({ queryKey: [...knowledgeGraphKeys.graph(graphId), 'mindmap'] }),
    ]);
  }, [queryClient, graphId]);

  const expand = useCallback(
    async (
      request: ProgressiveExpandRequest,
      options?: { 
        stream?: boolean; 
        onChunk?: (chunk: string) => void;
        onDone?: (finalResult: ProgressiveExpandResponse) => void;
      }
    ) => {
      if (!graphId || graphId.trim() === '') {
        throw new Error('Graph ID is required for progressive expand operation');
      }
      
      dispatch(progressiveExpandStart());

      try {
        if (options?.stream) {
          // Streaming mode
          dispatch(streamingStart({ operation: 'progressiveExpand', graphId }));

          const response = await graphOperationsStreamingApi.progressiveExpand(
            graphId,
            request,
            {
              onChunk: (chunk) => {
                dispatch(streamingChunk(chunk));
                options.onChunk?.(chunk);
              },
              onMutations: (mutations) => {
                // Apply mutations as they arrive
                const state = store.getState();
                const graph = state.knowledgeGraphs.graphs[graphId];
                if (graph) {
                  const updatedGraph = applyMutationsToGraph(
                    graph,
                    mutations.mutations
                  );
                  dispatch(updateGraph({ graphId, updates: updatedGraph }));
                }
                dispatch(streamingMutations(mutations.mutations));
              },
              onDone: async (finalResult) => {
                dispatch(streamingDone({ mutations: [], graph: finalResult.graph }));
                dispatch(progressiveExpandSuccess({ graphId, response: finalResult }));
                // Invalidate React Query cache
                await invalidateGraphQueries();
                // Call user-provided onDone callback
                options.onDone?.(finalResult);
              },
              onError: (error) => {
                dispatch(streamingError(error));
                dispatch(progressiveExpandFailure(error));
              },
            }
          );

          return response;
        } else {
          // Non-streaming mode
          const response = await graphOperationsApi.progressiveExpand(graphId, request);

          // Apply mutations to Redux
          const state = store.getState();
          const graph = state.knowledgeGraphs.graphs[graphId];
          if (graph && response.mutations.mutations.length > 0) {
            const updatedGraph = applyMutationsToGraph(
              graph,
              response.mutations.mutations
            );
            dispatch(updateGraph({ graphId, updates: updatedGraph }));
          }

          dispatch(progressiveExpandSuccess({ graphId, response }));
          // Invalidate React Query cache
          await invalidateGraphQueries();
          return response;
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        dispatch(progressiveExpandFailure(errorMessage));
        throw err;
      }
    },
    [graphId, dispatch, invalidateGraphQueries]
  );

  return {
    expand,
    isLoading,
    error,
    streaming,
  };
}


