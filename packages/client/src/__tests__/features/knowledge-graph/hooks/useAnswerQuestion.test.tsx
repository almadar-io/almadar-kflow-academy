/**
 * Tests for useAnswerQuestion Hook
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { useAnswerQuestion } from '../../../../features/knowledge-graph/hooks/useAnswerQuestion';
import { graphOperationsApi, graphOperationsStreamingApi } from '../../../../features/knowledge-graph/api';
import knowledgeGraphSlice from '../../../../features/knowledge-graph/knowledgeGraphSlice';
import graphOperationSlice from '../../../../features/knowledge-graph/redux/graphOperationSlice';
import { mutationMiddleware } from '../../../../features/knowledge-graph/redux/mutationMiddleware';
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

// Helper to create a test store
const createTestStore = (initialState?: any) => {
  return configureStore({
    reducer: {
      knowledgeGraphs: knowledgeGraphSlice,
      graphOperations: graphOperationSlice,
    },
    middleware: (getDefaultMiddleware: any) =>
      getDefaultMiddleware().concat(mutationMiddleware as any),
    preloadedState: initialState,
  } as any);
};

// Helper to create a wrapper with store
const createWrapper = (store: ReturnType<typeof createTestStore>) => {
  return ({ children }: { children: React.ReactNode }) => (
    <Provider store={store}>{children}</Provider>
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
  let store: ReturnType<typeof createTestStore>;

  beforeEach(() => {
    jest.clearAllMocks();
    store = createTestStore({
      knowledgeGraphs: {
        graphs: {
          'graph-1': createMockGraph('graph-1'),
        },
        currentGraphId: 'graph-1',
        isLoading: false,
        error: null,
        lastUpdated: null,
      },
    });
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
        wrapper: createWrapper(store),
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
        wrapper: createWrapper(store),
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
        wrapper: createWrapper(store),
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
        wrapper: createWrapper(store),
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
        wrapper: createWrapper(store),
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
        wrapper: createWrapper(store),
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
        wrapper: createWrapper(store),
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

  describe('Redux state updates', () => {
    it('should dispatch answerQuestionStart on call', async () => {
      mockApi.answerQuestion.mockResolvedValue({
        mutations: { mutations: [] },
        content: { answer: 'Test' },
        graph: createMockGraph('graph-1'),
      });

      const { result } = renderHook(() => useAnswerQuestion('graph-1'), {
        wrapper: createWrapper(store),
      });

      act(() => {
        result.current.answer({
          targetNodeId: 'node-1',
          question: 'What is this?',
        });
      });

      const state = store.getState();
      expect(state.graphOperations.answerQuestion.isLoading).toBe(true);
    });

    it('should dispatch answerQuestionSuccess on completion', async () => {
      const mockResponse = {
        mutations: { mutations: [] },
        content: { answer: 'Test answer' },
        graph: createMockGraph('graph-1'),
      };

      mockApi.answerQuestion.mockResolvedValue(mockResponse);

      const { result } = renderHook(() => useAnswerQuestion('graph-1'), {
        wrapper: createWrapper(store),
      });

      await act(async () => {
        await result.current.answer({
          targetNodeId: 'node-1',
          question: 'What is this?',
        });
      });

      const state = store.getState();
      expect(state.graphOperations.answerQuestion.isLoading).toBe(false);
      expect(state.graphOperations.answerQuestion.error).toBeNull();
    });
  });
});

