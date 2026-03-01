/**
 * Hook for Generate Layer Practice Operation
 * 
 * Provides a hook for generating practice exercises/reviews for a layer.
 * Supports both streaming and non-streaming modes.
 */

import { useCallback } from 'react';
import { useAppDispatch, useAppSelector } from '../../../app/hooks';
import { store } from '../../../app/store';
import { graphOperationsApi, graphOperationsStreamingApi } from '../api';
import {
  generateLayerPracticeStart,
  generateLayerPracticeSuccess,
  generateLayerPracticeFailure,
  streamingStart,
  streamingChunk,
  streamingMutations,
  streamingDone,
  streamingError,
} from '../redux/graphOperationSlice';
import { updateGraph } from '../knowledgeGraphSlice';
import { applyMutationsToGraph } from '../redux/mutationUtils';
import type { GenerateLayerPracticeRequest, GenerateLayerPracticeResponse } from '../api/types';

export function useGenerateLayerPractice(graphId: string) {
  const dispatch = useAppDispatch();
  const { isLoading, error } = useAppSelector(
    (state) => state.graphOperations.generateLayerPractice
  );
  const streaming = useAppSelector((state) => state.graphOperations.streaming);

  const generate = useCallback(
    async (
      request: GenerateLayerPracticeRequest,
      options?: { 
        stream?: boolean; 
        onChunk?: (chunk: string) => void;
        onDone?: (finalResult: GenerateLayerPracticeResponse) => void;
      }
    ) => {
      if (!graphId || graphId.trim() === '') {
        throw new Error('Graph ID is required for generate layer practice operation');
      }
      
      dispatch(generateLayerPracticeStart());

      try {
        if (options?.stream) {
          // Streaming mode
          dispatch(streamingStart({ operation: 'generateLayerPractice', graphId }));

          const response = await graphOperationsStreamingApi.generateLayerPractice(
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
              onDone: (finalResult) => {
                dispatch(streamingDone({ mutations: [], graph: finalResult.graph }));
                dispatch(generateLayerPracticeSuccess({ graphId, response: finalResult }));
                // Call user-provided onDone callback
                options.onDone?.(finalResult);
              },
              onError: (error) => {
                dispatch(streamingError(error));
                dispatch(generateLayerPracticeFailure(error));
              },
            }
          );

          return response;
        } else {
          // Non-streaming mode
          const response = await graphOperationsApi.generateLayerPractice(graphId, request);

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

          dispatch(generateLayerPracticeSuccess({ graphId, response }));
          return response;
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        dispatch(generateLayerPracticeFailure(errorMessage));
        throw err;
      }
    },
    [graphId, dispatch]
  );

  return {
    generate,
    isLoading,
    error,
    streaming,
  };
}

