/**
 * Tests for useAnswerQuestion Hook
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAnswerQuestion } from '../../../../features/knowledge-graph/hooks/useAnswerQuestion';
import { graphOperationsApi, graphOperationsStreamingApi } from '../../../../features/knowledge-graph/api';
import { setGraph, clearGraphs } from '../../../../features/knowledge-graph/knowledgeGraphSlice';
import { store } from '../../../../app/store';
import type { NodeBasedKnowledgeGraph } from '../../../../features/knowledge-graph/types';

// Mock the API
jest.mock('../../../../features/knowledge-graph/api', () => ({
  graphOperationsApi: {
    answerQuestion: jest.fn(),
  },
  graphOperationsStreamingApi: {
    answerQuestion: jest.fn(),
  },
}));

jest.mock('../../../../config/firebase', () => ({
  auth: {
    currentUser: {
      getIdToken: jest.fn().mockResolvedValue('mock-token'),
    },
  },
}));

const mockApi = graphOperationsApi as jest.Mocked<typeof graphOperationsApi>;
const mockStreamingApi = graphOperationsStreamingApi as jest.Mocked<typeof graphOperationsStreamingApi>;

// Helper to create a wrapper with the real app store singleton + react-query
const createWrapper = () => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: React.ReactNode }) => (
    <Provider store={store}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </Provider>
  );
};

// Helper to create a mock graph
const createMockGraph = (id: string): NodeBasedKnowledgeGraph => ({
  id,
  seedConceptId: 'seed-1',
  createdAt: Date.now(),
  updatedAt: Date.now(),
  nodes: {},
  relationships: [],
  nodeTypes: {
    Graph: [],
    Concept: [],
    Layer: [],
    LearningGoal: [],
    Milestone: [],
    PracticeExercise: [],
    Lesson: [],
    ConceptMetadata: [],
    GraphMetadata: [],
    FlashCard: [],
  },
});

describe('useAnswerQuestion', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    store.dispatch(clearGraphs());
    store.dispatch(setGraph(createMockGraph('graph-1')));
  });

  describe('non-streaming mode', () => {
    it('should call the API and update Redux state', async () => {
      const mockResponse = {
        mutations: {
          mutations: [],
          metadata: {
            operation: 'answerQuestion',
            timestamp: Date.now(),
          },
        },
        content: {
          answer: 'Test answer',
        },
        graph: createMockGraph('graph-1'),
        errors: [],
      };

      mockApi.answerQuestion.mockResolvedValue(mockResponse);

      const { result } = renderHook(() => useAnswerQuestion('graph-1'), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        await result.current.answer({
          targetNodeId: 'node-1',
          question: 'What is this?',
        });
      });

      expect(mockApi.answerQuestion).toHaveBeenCalledWith('graph-1', {
        targetNodeId: 'node-1',
        question: 'What is this?',
      });
      expect(result.current.isLoading).toBe(false);
    });

    it('should handle errors', async () => {
      const error = new Error('API Error');
      mockApi.answerQuestion.mockRejectedValue(error);

      const { result } = renderHook(() => useAnswerQuestion('graph-1'), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        await expect(
          result.current.answer({
            targetNodeId: 'node-1',
            question: 'What is this?',
          })
        ).rejects.toThrow('API Error');
      });

      expect(result.current.error).toBe('API Error');
      expect(result.current.isLoading).toBe(false);
    });

    it('should apply mutations to Redux when response contains mutations', async () => {
      const mockResponse = {
        mutations: {
          mutations: [
            {
              type: 'create_node' as const,
              node: {
                id: 'metadata-1',
                type: 'ConceptMetadata' as const,
                properties: { qa: [] },
                createdAt: Date.now(),
                updatedAt: Date.now(),
              },
            },
          ],
          metadata: {
            operation: 'answerQuestion',
            timestamp: Date.now(),
          },
        },
        content: {
          answer: 'Test answer',
        },
        graph: createMockGraph('graph-1'),
        errors: [],
      };

      mockApi.answerQuestion.mockResolvedValue(mockResponse);

      const { result } = renderHook(() => useAnswerQuestion('graph-1'), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        await result.current.answer({
          targetNodeId: 'node-1',
          question: 'What is this?',
        });
      });

      await waitFor(() => {
        const state = store.getState();
        expect(state.knowledgeGraphs.graphs['graph-1'].nodes['metadata-1']).toBeDefined();
      });
    });

    it('should handle empty mutations (ephemeral)', async () => {
      const mockResponse = {
        mutations: {
          mutations: [],
          metadata: {
            operation: 'answerQuestion',
            timestamp: Date.now(),
          },
        },
        content: {
          answer: 'Ephemeral answer',
        },
        graph: createMockGraph('graph-1'),
        errors: [],
      };

      mockApi.answerQuestion.mockResolvedValue(mockResponse);

      const { result } = renderHook(() => useAnswerQuestion('graph-1'), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        await result.current.answer({
          targetNodeId: 'node-1',
          question: 'What is this?',
        });
      });

      // Should not throw error even with empty mutations
      expect(result.current.isLoading).toBe(false);
    });
  });

  describe('streaming mode', () => {
    it('should handle streaming responses', async () => {
      const mockResponse = {
        mutations: {
          mutations: [],
          metadata: {
            operation: 'answerQuestion',
            timestamp: Date.now(),
          },
        },
        content: {
          answer: 'Test answer',
        },
        graph: createMockGraph('graph-1'),
        errors: [],
      };

      const onChunk = jest.fn();
      mockStreamingApi.answerQuestion.mockResolvedValue(mockResponse);

      const { result } = renderHook(() => useAnswerQuestion('graph-1'), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        await result.current.answer(
          {
            targetNodeId: 'node-1',
            question: 'What is this?',
          },
          { stream: true, onChunk }
        );
      });

      expect(mockStreamingApi.answerQuestion).toHaveBeenCalledWith(
        'graph-1',
        {
          targetNodeId: 'node-1',
          question: 'What is this?',
        },
        expect.objectContaining({
          onChunk: expect.any(Function),
          onMutations: expect.any(Function),
          onDone: expect.any(Function),
          onError: expect.any(Function),
        })
      );
    });

    it('should call onChunk callback when provided', async () => {
      const mockResponse = {
        mutations: {
          mutations: [],
          metadata: {
            operation: 'answerQuestion',
            timestamp: Date.now(),
          },
        },
        content: {
          answer: 'Test answer',
        },
        graph: createMockGraph('graph-1'),
        errors: [],
      };

      const onChunk = jest.fn();
      mockStreamingApi.answerQuestion.mockImplementation(
        async (graphId, request, callbacks) => {
          callbacks.onChunk?.('Answer ');
          callbacks.onChunk?.('content');
          callbacks.onDone?.(mockResponse);
          return mockResponse;
        }
      );

      const { result } = renderHook(() => useAnswerQuestion('graph-1'), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        await result.current.answer(
          {
            targetNodeId: 'node-1',
            question: 'What is this?',
          },
          { stream: true, onChunk }
        );
      });

      expect(onChunk).toHaveBeenCalledWith('Answer ');
      expect(onChunk).toHaveBeenCalledWith('content');
    });
  });

  describe('loading states', () => {
    it('should set loading state during operation', async () => {
      let resolvePromise: (value: any) => void;
      const promise = new Promise((resolve) => {
        resolvePromise = resolve;
      });

      mockApi.answerQuestion.mockReturnValue(promise as any);

      const { result } = renderHook(() => useAnswerQuestion('graph-1'), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.answer({
          targetNodeId: 'node-1',
          question: 'What is this?',
        });
      });

      expect(result.current.isLoading).toBe(true);

      await act(async () => {
        resolvePromise!({
          mutations: { mutations: [] },
          content: { answer: 'Test' },
          graph: createMockGraph('graph-1'),
        });
        await promise;
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
    });
  });

});

