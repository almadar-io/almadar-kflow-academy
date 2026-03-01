/**
 * Hook for Generate Goals Operation
 * 
 * Provides a hook for generating learning goals from user answers.
 * Supports both streaming and non-streaming modes.
 * 
 * Automatically invalidates React Query cache after successful generation.
 */

import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAppDispatch, useAppSelector } from '../../../app/hooks';
import { store } from '../../../app/store';
import { graphOperationsApi, graphOperationsStreamingApi } from '../api';
import {
  generateGoalsStart,
  generateGoalsSuccess,
  generateGoalsFailure,
  streamingStart,
  streamingChunk,
  streamingMutations,
  streamingDone,
  streamingError,
} from '../redux/graphOperationSlice';
import { updateGraph } from '../knowledgeGraphSlice';
import { applyMutationsToGraph } from '../redux/mutationUtils';
import { knowledgeGraphKeys } from './queryKeys';
import type { GenerateGoalsRequest, GenerateGoalsResponse } from '../api/types';

export function useGenerateGoals(graphId: string) {
  const dispatch = useAppDispatch();
  const queryClient = useQueryClient();
  const { isLoading, error } = useAppSelector(
    (state) => state.graphOperations.generateGoals
  );
  const streaming = useAppSelector((state) => state.graphOperations.streaming);

  // Invalidate React Query cache for the graph
  const invalidateGraphQueries = useCallback(async (targetGraphId: string) => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: knowledgeGraphKeys.graphSummary(targetGraphId) }),
      queryClient.invalidateQueries({ queryKey: knowledgeGraphKeys.learningPaths() }),
    ]);
  }, [queryClient]);

  const generate = useCallback(
    async (
      request: GenerateGoalsRequest,
      options?: { 
        stream?: boolean; 
        onChunk?: (chunk: string) => void; 
        onDone?: (finalResult: GenerateGoalsResponse) => void;
        graphId?: string;
      }
    ) => {
      // Use provided graphId or fall back to hook's graphId
      const targetGraphId = options?.graphId || graphId;
      
      if (!targetGraphId || targetGraphId.trim() === '') {
        throw new Error('Graph ID is required for generate goals operation');
      }
      
      dispatch(generateGoalsStart());

      try {
        if (options?.stream) {
          // Streaming mode
          dispatch(streamingStart({ operation: 'generateGoals', graphId: targetGraphId }));

          const response = await graphOperationsStreamingApi.generateGoals(
            targetGraphId,
            request,
            {
              onChunk: (chunk) => {
                dispatch(streamingChunk(chunk));
                options.onChunk?.(chunk);
              },
              onMutations: (mutations) => {
                // Apply mutations as they arrive
                const state = store.getState();
                const graph = state.knowledgeGraphs.graphs[targetGraphId];
                if (graph) {
                  const updatedGraph = applyMutationsToGraph(
                    graph,
                    mutations.mutations
                  );
                  dispatch(updateGraph({ graphId: targetGraphId, updates: updatedGraph }));
                }
                dispatch(streamingMutations(mutations.mutations));
              },
              onDone: async (finalResult) => {
                console.log('onDone', finalResult);
                dispatch(streamingDone({ mutations: [], graph: finalResult.graph }));
                dispatch(generateGoalsSuccess({ graphId: targetGraphId, response: finalResult }));
                // Invalidate React Query cache
                await invalidateGraphQueries(targetGraphId);
                // Call user-provided onDone callback
                options.onDone?.(finalResult);
              },
              onError: (error) => {
                dispatch(streamingError(error));
                dispatch(generateGoalsFailure(error));
              },
            }
          );

          return response;
        } else {
          // Non-streaming mode
          const response = await graphOperationsApi.generateGoals(targetGraphId, request);

          // Apply mutations to Redux
          const state = store.getState();
          const graph = state.knowledgeGraphs.graphs[targetGraphId];
          if (graph && response.mutations.mutations.length > 0) {
            const updatedGraph = applyMutationsToGraph(
              graph,
              response.mutations.mutations
            );
            dispatch(updateGraph({ graphId: targetGraphId, updates: updatedGraph }));
          }

          dispatch(generateGoalsSuccess({ graphId: targetGraphId, response }));
          // Invalidate React Query cache
          await invalidateGraphQueries(targetGraphId);
          return response;
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        dispatch(generateGoalsFailure(errorMessage));
        throw err;
      }
    },
    [graphId, dispatch, invalidateGraphQueries]
  );

  return {
    generate,
    isLoading,
    error,
    streaming,
  };
}


