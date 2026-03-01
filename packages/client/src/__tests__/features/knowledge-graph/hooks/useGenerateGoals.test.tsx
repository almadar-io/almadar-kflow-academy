/**
 * Tests for useGenerateGoals Hook
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { useGenerateGoals } from '../../../../features/knowledge-graph/hooks/useGenerateGoals';
import { graphOperationsApi, graphOperationsStreamingApi } from '../../../../features/knowledge-graph/api';
import knowledgeGraphSlice from '../../../../features/knowledge-graph/knowledgeGraphSlice';
import graphOperationSlice from '../../../../features/knowledge-graph/redux/graphOperationSlice';
import { mutationMiddleware } from '../../../../features/knowledge-graph/redux/mutationMiddleware';
import type { NodeBasedKnowledgeGraph } from '../../../../features/knowledge-graph/types';

// Mock the API
jest.mock('../../../../features/knowledge-graph/api', () => ({
  graphOperationsApi: {
    generateGoals: jest.fn(),
  },
  graphOperationsStreamingApi: {
    generateGoals: jest.fn(),
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

describe('useGenerateGoals', () => {
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
          mutations: [
            {
              type: 'create_node' as const,
              node: {
                id: 'goal-1',
                type: 'LearningGoal' as const,
                properties: {},
                createdAt: Date.now(),
                updatedAt: Date.now(),
              },
            },
          ],
          metadata: {
            operation: 'generateGoals',
            timestamp: Date.now(),
          },
        },
        content: {
          goal: {
            id: 'goal-1',
            graphId: 'graph-1',
            title: 'Test Goal',
            description: 'Test description',
            type: 'test',
            target: 'test target',
            createdAt: Date.now(),
            updatedAt: Date.now(),
          },
        },
        graph: createMockGraph('graph-1'),
        errors: [],
      };

      mockApi.generateGoals.mockResolvedValue(mockResponse);

      const { result } = renderHook(() => useGenerateGoals('graph-1'), {
        wrapper: createWrapper(store),
      });

      await act(async () => {
        await result.current.generate({
          anchorAnswer: 'I want to learn',
          questionAnswers: [{ questionId: 'q1', answer: 'test' }],
        });
      });

      expect(mockApi.generateGoals).toHaveBeenCalledWith('graph-1', {
        anchorAnswer: 'I want to learn',
        questionAnswers: [{ questionId: 'q1', answer: 'test' }],
      });
      expect(result.current.isLoading).toBe(false);
    });

    it('should handle errors', async () => {
      const error = new Error('API Error');
      mockApi.generateGoals.mockRejectedValue(error);

      const { result } = renderHook(() => useGenerateGoals('graph-1'), {
        wrapper: createWrapper(store),
      });

      await act(async () => {
        await expect(
          result.current.generate({
            anchorAnswer: 'I want to learn',
            questionAnswers: [],
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
                id: 'goal-1',
                type: 'LearningGoal' as const,
                properties: { title: 'Test Goal' },
                createdAt: Date.now(),
                updatedAt: Date.now(),
              },
            },
            {
              type: 'create_node' as const,
              node: {
                id: 'milestone-1',
                type: 'Milestone' as const,
                properties: { title: 'Milestone 1' },
                createdAt: Date.now(),
                updatedAt: Date.now(),
              },
            },
          ],
          metadata: {
            operation: 'generateGoals',
            timestamp: Date.now(),
          },
        },
        content: {
          goal: {
            id: 'goal-1',
            graphId: 'graph-1',
            title: 'Test Goal',
            description: 'Test',
            type: 'test',
            target: 'test',
            createdAt: Date.now(),
            updatedAt: Date.now(),
          },
        },
        graph: createMockGraph('graph-1'),
        errors: [],
      };

      mockApi.generateGoals.mockResolvedValue(mockResponse);

      const { result } = renderHook(() => useGenerateGoals('graph-1'), {
        wrapper: createWrapper(store),
      });

      await act(async () => {
        await result.current.generate({
          anchorAnswer: 'I want to learn',
          questionAnswers: [{ questionId: 'q1', answer: 'test' }],
        });
      });

      await waitFor(() => {
        const state = store.getState();
        expect(state.knowledgeGraphs.graphs['graph-1'].nodes['goal-1']).toBeDefined();
        expect(state.knowledgeGraphs.graphs['graph-1'].nodes['milestone-1']).toBeDefined();
      });
    });
  });

  describe('streaming mode', () => {
    it('should handle streaming responses', async () => {
      const mockResponse = {
        mutations: {
          mutations: [],
          metadata: {
            operation: 'generateGoals',
            timestamp: Date.now(),
          },
        },
        content: {
          goal: {
            id: 'goal-1',
            graphId: 'graph-1',
            title: 'Test Goal',
            description: 'Test',
            type: 'test',
            target: 'test',
            createdAt: Date.now(),
            updatedAt: Date.now(),
          },
        },
        graph: createMockGraph('graph-1'),
        errors: [],
      };

      const onChunk = jest.fn();
      mockStreamingApi.generateGoals.mockResolvedValue(mockResponse);

      const { result } = renderHook(() => useGenerateGoals('graph-1'), {
        wrapper: createWrapper(store),
      });

      await act(async () => {
        await result.current.generate(
          {
            anchorAnswer: 'I want to learn',
            questionAnswers: [{ questionId: 'q1', answer: 'test' }],
          },
          { stream: true, onChunk }
        );
      });

      expect(mockStreamingApi.generateGoals).toHaveBeenCalledWith(
        'graph-1',
        {
          anchorAnswer: 'I want to learn',
          questionAnswers: [{ questionId: 'q1', answer: 'test' }],
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
            operation: 'generateGoals',
            timestamp: Date.now(),
          },
        },
        content: {
          goal: {
            id: 'goal-1',
            graphId: 'graph-1',
            title: 'Test Goal',
            description: 'Test',
            type: 'test',
            target: 'test',
            createdAt: Date.now(),
            updatedAt: Date.now(),
          },
        },
        graph: createMockGraph('graph-1'),
        errors: [],
      };

      const onChunk = jest.fn();
      mockStreamingApi.generateGoals.mockImplementation(
        async (graphId, request, callbacks) => {
          callbacks.onChunk?.('Generating ');
          callbacks.onChunk?.('goal...');
          callbacks.onDone?.(mockResponse);
          return mockResponse;
        }
      );

      const { result } = renderHook(() => useGenerateGoals('graph-1'), {
        wrapper: createWrapper(store),
      });

      const onDone = jest.fn();
      await act(async () => {
        await result.current.generate(
          {
            anchorAnswer: 'I want to learn',
            questionAnswers: [{ questionId: 'q1', answer: 'test' }],
          },
          { stream: true, onChunk, onDone }
        );
      });

      expect(onChunk).toHaveBeenCalledWith('Generating ');
      expect(onChunk).toHaveBeenCalledWith('goal...');
      expect(onDone).toHaveBeenCalledWith(mockResponse);
    });

    it('should call onDone callback when provided', async () => {
      const mockResponse = {
        mutations: {
          mutations: [],
          metadata: {
            operation: 'generateGoals',
            timestamp: Date.now(),
          },
        },
        content: {
          goal: {
            id: 'goal-1',
            graphId: 'graph-1',
            title: 'Test Goal',
            description: 'Test',
            type: 'test',
            target: 'test',
            createdAt: Date.now(),
            updatedAt: Date.now(),
          },
        },
        graph: createMockGraph('graph-1'),
        errors: [],
      };

      const onDone = jest.fn();
      mockStreamingApi.generateGoals.mockImplementation(
        async (graphId, request, callbacks) => {
          callbacks.onDone?.(mockResponse);
          return mockResponse;
        }
      );

      const { result } = renderHook(() => useGenerateGoals('graph-1'), {
        wrapper: createWrapper(store),
      });

      await act(async () => {
        await result.current.generate(
          {
            anchorAnswer: 'I want to learn',
            questionAnswers: [{ questionId: 'q1', answer: 'test' }],
          },
          { stream: true, onDone }
        );
      });

      expect(onDone).toHaveBeenCalledWith(mockResponse);
    });
  });

  describe('loading states', () => {
    it('should set loading state during operation', async () => {
      let resolvePromise: (value: any) => void;
      const promise = new Promise((resolve) => {
        resolvePromise = resolve;
      });

      mockApi.generateGoals.mockReturnValue(promise as any);

      const { result } = renderHook(() => useGenerateGoals('graph-1'), {
        wrapper: createWrapper(store),
      });

      act(() => {
        result.current.generate({
          anchorAnswer: 'I want to learn',
          questionAnswers: [],
        });
      });

      expect(result.current.isLoading).toBe(true);

      await act(async () => {
        resolvePromise!({
          mutations: { mutations: [] },
          content: {
            goal: {
              id: 'goal-1',
              graphId: 'graph-1',
              title: 'Test',
              description: 'Test',
              type: 'test',
              target: 'test',
              createdAt: Date.now(),
              updatedAt: Date.now(),
            },
          },
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
    it('should dispatch generateGoalsStart on call', async () => {
      mockApi.generateGoals.mockResolvedValue({
        mutations: { mutations: [] },
        content: {
          goal: {
            id: 'goal-1',
            graphId: 'graph-1',
            title: 'Test',
            description: 'Test',
            type: 'test',
            target: 'test',
            createdAt: Date.now(),
            updatedAt: Date.now(),
          },
        },
        graph: createMockGraph('graph-1'),
      });

      const { result } = renderHook(() => useGenerateGoals('graph-1'), {
        wrapper: createWrapper(store),
      });

      act(() => {
        result.current.generate({
          anchorAnswer: 'I want to learn',
          questionAnswers: [],
        });
      });

      const state = store.getState();
      expect(state.graphOperations.generateGoals.isLoading).toBe(true);
    });

    it('should dispatch generateGoalsSuccess on completion', async () => {
      const mockResponse = {
        mutations: { mutations: [] },
        content: {
          goal: {
            id: 'goal-1',
            graphId: 'graph-1',
            title: 'Test Goal',
            description: 'Test',
            type: 'test',
            target: 'test',
            createdAt: Date.now(),
            updatedAt: Date.now(),
          },
        },
        graph: createMockGraph('graph-1'),
      };

      mockApi.generateGoals.mockResolvedValue(mockResponse);

      const { result } = renderHook(() => useGenerateGoals('graph-1'), {
        wrapper: createWrapper(store),
      });

      await act(async () => {
        await result.current.generate({
          anchorAnswer: 'I want to learn',
          questionAnswers: [],
        });
      });

      const state = store.getState();
      expect(state.graphOperations.generateGoals.isLoading).toBe(false);
      expect(state.graphOperations.generateGoals.error).toBeNull();
    });
  });

  describe('complex question answers', () => {
    it('should handle multiple question answers', async () => {
      const mockResponse = {
        mutations: {
          mutations: [],
          metadata: {
            operation: 'generateGoals',
            timestamp: Date.now(),
          },
        },
        content: {
          goal: {
            id: 'goal-1',
            graphId: 'graph-1',
            title: 'Test Goal',
            description: 'Test',
            type: 'test',
            target: 'test',
            createdAt: Date.now(),
            updatedAt: Date.now(),
          },
        },
        graph: createMockGraph('graph-1'),
        errors: [],
      };

      mockApi.generateGoals.mockResolvedValue(mockResponse);

      const { result } = renderHook(() => useGenerateGoals('graph-1'), {
        wrapper: createWrapper(store),
      });

      await act(async () => {
        await result.current.generate({
          anchorAnswer: 'I want to learn machine learning',
          questionAnswers: [
            { questionId: 'q1', answer: '6 months' },
            { questionId: 'q2', answer: 'intermediate' },
            { questionId: 'q3', answers: ['option1', 'option2'] },
            { questionId: 'q4', isOther: true, otherValue: 'custom' },
            { questionId: 'q5', skipped: true },
          ],
        });
      });

      expect(mockApi.generateGoals).toHaveBeenCalledWith('graph-1', {
        anchorAnswer: 'I want to learn machine learning',
        questionAnswers: [
          { questionId: 'q1', answer: '6 months' },
          { questionId: 'q2', answer: 'intermediate' },
          { questionId: 'q3', answers: ['option1', 'option2'] },
          { questionId: 'q4', isOther: true, otherValue: 'custom' },
          { questionId: 'q5', skipped: true },
        ],
      });
    });
  });
});

