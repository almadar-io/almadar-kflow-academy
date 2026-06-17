import { useCallback, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAppDispatch } from '../../../app/hooks';
import { graphOperationsApi, graphOperationsStreamingApi } from '../api';
import { updateGraph } from '../knowledgeGraphSlice';
import { applyMutationsToGraph } from '../graphMutationUtils';
import { store } from '../../../app/store';
import { knowledgeGraphKeys } from './queryKeys';
import type { GenerateGoalsRequest, GenerateGoalsResponse } from '../api/types';
import type { GraphMutation } from '../types';

interface StreamingState {
  isStreaming: boolean;
  operation: string | null;
  graphId: string | null;
  content: string;
  mutations: GraphMutation[];
}

export function useGenerateGoals(graphId: string) {
  const dispatch = useAppDispatch();
  const queryClient = useQueryClient();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [streaming, setStreaming] = useState<StreamingState | null>(null);

  const invalidateGraphQueries = useCallback(
    async (targetGraphId: string) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: knowledgeGraphKeys.graphSummary(targetGraphId) }),
        queryClient.invalidateQueries({ queryKey: knowledgeGraphKeys.learningPaths() }),
      ]);
    },
    [queryClient]
  );

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
      const targetGraphId = options?.graphId || graphId;

      if (!targetGraphId || targetGraphId.trim() === '') {
        throw new Error('Graph ID is required for generate goals operation');
      }

      setIsLoading(true);
      setError(null);

      try {
        if (options?.stream) {
          setStreaming({ isStreaming: true, operation: 'generateGoals', graphId: targetGraphId, content: '', mutations: [] });

          const response = await graphOperationsStreamingApi.generateGoals(
            targetGraphId,
            request,
            {
              onChunk: (chunk) => {
                setStreaming((prev) => prev ? { ...prev, content: prev.content + chunk } : prev);
                options.onChunk?.(chunk);
              },
              onMutations: (batch) => {
                const state = store.getState();
                const graph = state.knowledgeGraphs.graphs[targetGraphId];
                if (graph) {
                  const updatedGraph = applyMutationsToGraph(graph, batch.mutations);
                  dispatch(updateGraph({ graphId: targetGraphId, updates: updatedGraph }));
                }
                setStreaming((prev) =>
                  prev ? { ...prev, mutations: [...prev.mutations, ...batch.mutations] } : prev
                );
              },
              onDone: async (finalResult) => {
                setStreaming((prev) => prev ? { ...prev, isStreaming: false } : prev);
                setIsLoading(false);
                await invalidateGraphQueries(targetGraphId);
                options.onDone?.(finalResult);
              },
              onError: (err) => {
                setError(err);
                setStreaming((prev) => prev ? { ...prev, isStreaming: false } : prev);
                setIsLoading(false);
              },
            }
          );

          return response;
        } else {
          const response = await graphOperationsApi.generateGoals(targetGraphId, request);

          const state = store.getState();
          const graph = state.knowledgeGraphs.graphs[targetGraphId];
          if (graph && response.mutations.mutations.length > 0) {
            const updatedGraph = applyMutationsToGraph(graph, response.mutations.mutations);
            dispatch(updateGraph({ graphId: targetGraphId, updates: updatedGraph }));
          }

          setIsLoading(false);
          await invalidateGraphQueries(targetGraphId);
          return response;
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        setError(errorMessage);
        setIsLoading(false);
        throw err;
      }
    },
    [graphId, dispatch, invalidateGraphQueries]
  );

  return { generate, isLoading, error, streaming };
}
