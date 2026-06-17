import { useCallback, useState } from 'react';
import { useAppDispatch } from '../../../app/hooks';
import { graphOperationsApi, graphOperationsStreamingApi } from '../api';
import { updateGraph } from '../knowledgeGraphSlice';
import { applyMutationsToGraph } from '../graphMutationUtils';
import { store } from '../../../app/store';
import type { CustomOperationRequest, CustomOperationResponse } from '../api/types';
import type { GraphMutation } from '../types';

interface StreamingState {
  isStreaming: boolean;
  operation: string | null;
  graphId: string | null;
  content: string;
  mutations: GraphMutation[];
}

export function useCustomOperation(graphId: string) {
  const dispatch = useAppDispatch();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [streaming, setStreaming] = useState<StreamingState | null>(null);

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

      setIsLoading(true);
      setError(null);

      try {
        if (options?.stream) {
          setStreaming({ isStreaming: true, operation: 'customOperation', graphId, content: '', mutations: [] });

          const response = await graphOperationsStreamingApi.customOperation(
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
              onDone: (finalResult) => {
                setStreaming((prev) => prev ? { ...prev, isStreaming: false } : prev);
                setIsLoading(false);
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
          const response = await graphOperationsApi.customOperation(graphId, request);

          const state = store.getState();
          const graph = state.knowledgeGraphs.graphs[graphId];
          if (graph && response.mutations.mutations.length > 0) {
            const updatedGraph = applyMutationsToGraph(graph, response.mutations.mutations);
            dispatch(updateGraph({ graphId, updates: updatedGraph }));
          }

          setIsLoading(false);
          return response;
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        setError(errorMessage);
        setIsLoading(false);
        throw err;
      }
    },
    [graphId, dispatch]
  );

  return { execute, isLoading, error, streaming };
}
