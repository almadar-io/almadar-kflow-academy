/**
 * Hook for Answer Question Operation
 * 
 * Provides a hook for answering questions about a concept.
 * Supports both streaming and non-streaming modes.
 */

import { useCallback } from 'react';
import { useAppDispatch, useAppSelector } from '../../../app/hooks';
import { store } from '../../../app/store';
import { graphOperationsApi, graphOperationsStreamingApi } from '../api';
import {
  answerQuestionStart,
  answerQuestionSuccess,
  answerQuestionFailure,
  streamingStart,
  streamingChunk,
  streamingMutations,
  streamingDone,
  streamingError,
} from '../redux/graphOperationSlice';
import { updateGraph } from '../knowledgeGraphSlice';
import { applyMutationsToGraph } from '../redux/mutationUtils';
import type { AnswerQuestionRequest, AnswerQuestionResponse } from '../api/types';

export function useAnswerQuestion(graphId: string) {
  const dispatch = useAppDispatch();
  const { isLoading, error } = useAppSelector(
    (state) => state.graphOperations.answerQuestion
  );
  const streaming = useAppSelector((state) => state.graphOperations.streaming);

  const answer = useCallback(
    async (
      request: AnswerQuestionRequest,
      options?: { 
        stream?: boolean; 
        onChunk?: (chunk: string) => void;
        onDone?: (finalResult: AnswerQuestionResponse) => void;
      }
    ) => {
      if (!graphId || graphId.trim() === '') {
        throw new Error('Graph ID is required for answer question operation');
      }
      
      dispatch(answerQuestionStart());

      try {
        if (options?.stream) {
          // Streaming mode
          dispatch(streamingStart({ operation: 'answerQuestion', graphId }));

          const response = await graphOperationsStreamingApi.answerQuestion(
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
                dispatch(answerQuestionSuccess({ graphId, response: finalResult }));
                // Call user-provided onDone callback
                options.onDone?.(finalResult);
              },
              onError: (error) => {
                dispatch(streamingError(error));
                dispatch(answerQuestionFailure(error));
              },
            }
          );

          return response;
        } else {
          // Non-streaming mode
          const response = await graphOperationsApi.answerQuestion(graphId, request);

          // Apply mutations to Redux (may be empty if ephemeral)
          const state = store.getState();
          const graph = state.knowledgeGraphs.graphs[graphId];
          if (graph && response.mutations.mutations.length > 0) {
            const updatedGraph = applyMutationsToGraph(
              graph,
              response.mutations.mutations
            );
            dispatch(updateGraph({ graphId, updates: updatedGraph }));
          }

          dispatch(answerQuestionSuccess({ graphId, response }));
          return response;
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        dispatch(answerQuestionFailure(errorMessage));
        throw err;
      }
    },
    [graphId, dispatch]
  );

  return {
    answer,
    isLoading,
    error,
    streaming,
  };
}

