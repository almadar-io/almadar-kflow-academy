/**
 * Hook for Custom Operation
 * 
 * Provides a hook for performing user-prompted custom operations on the graph.
 * Supports both streaming and non-streaming modes.
 */

import { useCallback } from 'react';
import { useAppDispatch, useAppSelector } from '../../../app/hooks';
import { store } from '../../../app/store';
import { graphOperationsApi, graphOperationsStreamingApi } from '../api';
import {
  customOperationStart,
  customOperationSuccess,
  customOperationFailure,
  streamingStart,
  streamingChunk,
  streamingMutations,
  streamingDone,
  streamingError,
} from '../redux/graphOperationSlice';
import { updateGraph } from '../knowledgeGraphSlice';
import { applyMutationsToGraph } from '../redux/mutationUtils';
import type { CustomOperationRequest, CustomOperationResponse } from '../api/types';

export function useCustomOperation(graphId: string) {
  const dispatch = useAppDispatch();
  const { isLoading, error } = useAppSelector(
    (state) => state.graphOperations.customOperation
  );
  const streaming = useAppSelector((state) => state.graphOperations.streaming);

  const execute = useCallback(
    async (
      request: CustomOperationRequest,
      options?: { 
        stream?: boolean; 
        onChunk?: (chunk: string) => void;
        onDone?: (finalResult: CustomOperationResponse) => void;
      }
    ) => {
      if (!graphId || graphId.trim() === '') {
        throw new Error('Graph ID is required for custom operation');
      }
      
      dispatch(customOperationStart());

      try {
        if (options?.stream) {
          // Streaming mode
          dispatch(streamingStart({ operation: 'customOperation', graphId }));

          const response = await graphOperationsStreamingApi.customOperation(
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
                dispatch(customOperationSuccess({ graphId, response: finalResult }));
                // Call user-provided onDone callback
                options.onDone?.(finalResult);
              },
              onError: (error) => {
                dispatch(streamingError(error));
                dispatch(customOperationFailure(error));
              },
            }
          );

          return response;
        } else {
          // Non-streaming mode
          const response = await graphOperationsApi.customOperation(graphId, request);

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

          dispatch(customOperationSuccess({ graphId, response }));
          return response;
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        dispatch(customOperationFailure(errorMessage));
        throw err;
      }
    },
    [graphId, dispatch]
  );

  return {
    execute,
    isLoading,
    error,
    streaming,
  };
}

