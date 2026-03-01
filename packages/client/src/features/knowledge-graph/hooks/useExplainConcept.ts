/**
 * Hook for Explain Concept Operation
 * 
 * Provides a hook for explaining a concept and generating a lesson.
 * Supports both streaming and non-streaming modes.
 * 
 * Automatically invalidates React Query cache after successful explanation.
 */

import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAppDispatch, useAppSelector } from '../../../app/hooks';
import { store } from '../../../app/store';
import { graphOperationsApi, graphOperationsStreamingApi } from '../api';
import {
  explainConceptStart,
  explainConceptSuccess,
  explainConceptFailure,
  streamingStart,
  streamingChunk,
  streamingMutations,
  streamingDone,
  streamingError,
} from '../redux/graphOperationSlice';
import { updateGraph } from '../knowledgeGraphSlice';
import { applyMutationsToGraph } from '../redux/mutationUtils';
import { knowledgeGraphKeys } from './queryKeys';
import type { ExplainConceptRequest, ExplainConceptResponse } from '../api/types';

export function useExplainConcept(graphId: string) {
  const dispatch = useAppDispatch();
  const queryClient = useQueryClient();
  const { isLoading, error } = useAppSelector(
    (state) => state.graphOperations.explainConcept
  );
  const streaming = useAppSelector((state) => state.graphOperations.streaming);

  // Invalidate React Query cache for the concept
  const invalidateConceptQueries = useCallback(async (conceptId: string) => {
    await queryClient.invalidateQueries({ 
      queryKey: knowledgeGraphKeys.conceptDetail(graphId, conceptId) 
    });
  }, [queryClient, graphId]);

  const explain = useCallback(
    async (
      request: ExplainConceptRequest,
      options?: { 
        stream?: boolean; 
        onChunk?: (chunk: string) => void;
        onDone?: (finalResult: ExplainConceptResponse) => void;
      }
    ) => {
      if (!graphId || graphId.trim() === '') {
        throw new Error('Graph ID is required for explain concept operation');
      }
      
      dispatch(explainConceptStart());

      try {
        if (options?.stream) {
          // Streaming mode
          dispatch(streamingStart({ operation: 'explainConcept', graphId }));

          const response = await graphOperationsStreamingApi.explainConcept(
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
                dispatch(explainConceptSuccess({ graphId, response: finalResult }));
                // Invalidate React Query cache for the concept
                await invalidateConceptQueries(request.targetNodeId);
                // Call user-provided onDone callback
                options.onDone?.(finalResult);
              },
              onError: (error) => {
                dispatch(streamingError(error));
                dispatch(explainConceptFailure(error));
              },
            }
          );

          return response;
        } else {
          // Non-streaming mode
          const response = await graphOperationsApi.explainConcept(graphId, request);

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

          dispatch(explainConceptSuccess({ graphId, response }));
          // Invalidate React Query cache for the concept
          await invalidateConceptQueries(request.targetNodeId);
          return response;
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        dispatch(explainConceptFailure(errorMessage));
        throw err;
      }
    },
    [graphId, dispatch, invalidateConceptQueries]
  );

  return {
    explain,
    isLoading,
    error,
    streaming,
  };
}


