import { useCallback, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAppDispatch } from '../../../app/hooks';
import { graphOperationsApi, graphOperationsStreamingApi } from '../api';
import { updateGraph } from '../knowledgeGraphSlice';
import { applyMutationsToGraph } from '../graphMutationUtils';
import { store } from '../../../app/store';
import { knowledgeGraphKeys } from './queryKeys';
import type { ProgressiveExpandRequest, ProgressiveExpandResponse } from '../api/types';
import type { GraphMutation } from '../types';

interface StreamingState {
  isStreaming: boolean;
  operation: string | null;
  graphId: string | null;
  content: string;
  mutations: GraphMutation[];
}

export function useProgressiveExpand(graphId: string) {
  const dispatch = useAppDispatch();
  const queryClient = useQueryClient();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [streaming, setStreaming] = useState<StreamingState | null>(null);

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

      setIsLoading(true);
      setError(null);

      try {
        if (options?.stream) {
          setStreaming({ isStreaming: true, operation: 'progressiveExpand', graphId, content: '', mutations: [] });

          const response = await graphOperationsStreamingApi.progressiveExpand(
            graphId,
            request,
            {
              onChunk: (chunk) => {
                setStreaming((prev) => prev ? { ...prev, content: prev.content + chunk } : prev);
                options.onChunk?.(chunk);
              },
              onMutations: (batch) => {
                const state = store.getState();
                const graph = state.knowledgeGraphs.graphs[graphId];
                if (graph) {
                  const updatedGraph = applyMutationsToGraph(graph, batch.mutations);
                  dispatch(updateGraph({ graphId, updates: updatedGraph }));
                }
                setStreaming((prev) =>
                  prev ? { ...prev, mutations: [...prev.mutations, ...batch.mutations] } : prev
                );
              },
              onDone: async (finalResult) => {
                setStreaming((prev) => prev ? { ...prev, isStreaming: false } : prev);
                setIsLoading(false);
                await invalidateGraphQueries();
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
          const response = await graphOperationsApi.progressiveExpand(graphId, request);

          const state = store.getState();
          const graph = state.knowledgeGraphs.graphs[graphId];
          if (graph && response.mutations.mutations.length > 0) {
            const updatedGraph = applyMutationsToGraph(graph, response.mutations.mutations);
            dispatch(updateGraph({ graphId, updates: updatedGraph }));
          }

          setIsLoading(false);
          await invalidateGraphQueries();
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

  return { expand, isLoading, error, streaming };
}
