/**
 * Tests for useGenerateLayerPractice Hook
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { useGenerateLayerPractice } from '../../../../features/knowledge-graph/hooks/useGenerateLayerPractice';
import { graphOperationsApi, graphOperationsStreamingApi } from '../../../../features/knowledge-graph/api';
import knowledgeGraphSlice from '../../../../features/knowledge-graph/knowledgeGraphSlice';
import graphOperationSlice from '../../../../features/knowledge-graph/redux/graphOperationSlice';
import { mutationMiddleware } from '../../../../features/knowledge-graph/redux/mutationMiddleware';
import type { NodeBasedKnowledgeGraph } from '../../../../features/knowledge-graph/types';

// Mock the API
jest.mock('../../../../features/knowledge-graph/api', () => ({
  graphOperationsApi: {
    generateLayerPractice: jest.fn(),
  },
  graphOperationsStreamingApi: {
    generateLayerPractice: jest.fn(),
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

describe('useGenerateLayerPractice', () => {
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
                id: 'practice-1',
                type: 'PracticeExercise' as const,
                properties: {
                  type: 'project',
                  question: 'Practice review content',
                },
                createdAt: Date.now(),
                updatedAt: Date.now(),
              },
            },
          ],
          metadata: {
            operation: 'generateLayerPractice',
            timestamp: Date.now(),
          },
        },
        content: {
          review: 'Practice review content in markdown',
        },
        graph: createMockGraph('graph-1'),
        errors: [],
      };

      mockApi.generateLayerPractice.mockResolvedValue(mockResponse);

      const { result } = renderHook(() => useGenerateLayerPractice('graph-1'), {
        wrapper: createWrapper(store),
      });

      await act(async () => {
        await result.current.generate({
          layerNumber: 1,
          layerGoal: 'Learn basic concepts',
        });
      });

      expect(mockApi.generateLayerPractice).toHaveBeenCalledWith('graph-1', {
        layerNumber: 1,
        layerGoal: 'Learn basic concepts',
      });
      expect(result.current.isLoading).toBe(false);
    });

    it('should handle minimal input with only layerNumber', async () => {
      const mockResponse = {
        mutations: {
          mutations: [],
          metadata: {
            operation: 'generateLayerPractice',
            timestamp: Date.now(),
          },
        },
        content: {
          review: 'Review content',
        },
        graph: createMockGraph('graph-1'),
        errors: [],
      };

      mockApi.generateLayerPractice.mockResolvedValue(mockResponse);

      const { result } = renderHook(() => useGenerateLayerPractice('graph-1'), {
        wrapper: createWrapper(store),
      });

      await act(async () => {
        await result.current.generate({
          layerNumber: 2,
        });
      });

      expect(mockApi.generateLayerPractice).toHaveBeenCalledWith('graph-1', {
        layerNumber: 2,
      });
      expect(result.current.isLoading).toBe(false);
    });

    it('should handle errors', async () => {
      const error = new Error('API Error');
      mockApi.generateLayerPractice.mockRejectedValue(error);

      const { result } = renderHook(() => useGenerateLayerPractice('graph-1'), {
        wrapper: createWrapper(store),
      });

      await act(async () => {
        await expect(
          result.current.generate({ layerNumber: 1 })
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
                id: 'practice-1',
                type: 'PracticeExercise' as const,
                properties: {
                  type: 'project',
                  question: 'Practice review',
                },
                createdAt: Date.now(),
                updatedAt: Date.now(),
              },
            },
          ],
          metadata: {
            operation: 'generateLayerPractice',
            timestamp: Date.now(),
          },
        },
        content: {
          review: 'Practice review content',
        },
        graph: createMockGraph('graph-1'),
        errors: [],
      };

      mockApi.generateLayerPractice.mockResolvedValue(mockResponse);

      const { result } = renderHook(() => useGenerateLayerPractice('graph-1'), {
        wrapper: createWrapper(store),
      });

      await act(async () => {
        await result.current.generate({ layerNumber: 1 });
      });

      await waitFor(() => {
        const state = store.getState();
        expect(state.knowledgeGraphs.graphs['graph-1'].nodes['practice-1']).toBeDefined();
      });
    });
  });

  describe('streaming mode', () => {
    it('should handle streaming responses', async () => {
      const mockResponse = {
        mutations: {
          mutations: [],
          metadata: {
            operation: 'generateLayerPractice',
            timestamp: Date.now(),
          },
        },
        content: {
          review: 'Practice review content',
        },
        graph: createMockGraph('graph-1'),
        errors: [],
      };

      const onChunk = jest.fn();
      mockStreamingApi.generateLayerPractice.mockResolvedValue(mockResponse);

      const { result } = renderHook(() => useGenerateLayerPractice('graph-1'), {
        wrapper: createWrapper(store),
      });

      await act(async () => {
        await result.current.generate(
          { layerNumber: 1 },
          { stream: true, onChunk }
        );
      });

      expect(mockStreamingApi.generateLayerPractice).toHaveBeenCalledWith(
        'graph-1',
        { layerNumber: 1 },
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
            operation: 'generateLayerPractice',
            timestamp: Date.now(),
          },
        },
        content: {
          review: 'Practice review',
        },
        graph: createMockGraph('graph-1'),
        errors: [],
      };

      const onChunk = jest.fn();
      mockStreamingApi.generateLayerPractice.mockImplementation(
        async (graphId, request, callbacks) => {
          callbacks.onChunk?.('Review ');
          callbacks.onChunk?.('content');
          callbacks.onDone?.(mockResponse);
          return mockResponse;
        }
      );

      const { result } = renderHook(() => useGenerateLayerPractice('graph-1'), {
        wrapper: createWrapper(store),
      });

      await act(async () => {
        await result.current.generate(
          { layerNumber: 1 },
          { stream: true, onChunk }
        );
      });

      expect(onChunk).toHaveBeenCalledWith('Review ');
      expect(onChunk).toHaveBeenCalledWith('content');
    });

    it('should handle streaming errors', async () => {
      const onError = jest.fn();
      mockStreamingApi.generateLayerPractice.mockImplementation(
        async (graphId, request, callbacks) => {
          callbacks.onError?.('Stream error');
          throw new Error('Stream error');
        }
      );

      const { result } = renderHook(() => useGenerateLayerPractice('graph-1'), {
        wrapper: createWrapper(store),
      });

      await act(async () => {
        await expect(
          result.current.generate({ layerNumber: 1 }, { stream: true })
        ).rejects.toThrow('Stream error');
      });

      expect(result.current.error).toBe('Stream error');
    });
  });

  describe('loading states', () => {
    it('should set loading state during operation', async () => {
      let resolvePromise: (value: any) => void;
      const promise = new Promise((resolve) => {
        resolvePromise = resolve;
      });

      mockApi.generateLayerPractice.mockReturnValue(promise as any);

      const { result } = renderHook(() => useGenerateLayerPractice('graph-1'), {
        wrapper: createWrapper(store),
      });

      act(() => {
        result.current.generate({ layerNumber: 1 });
      });

      expect(result.current.isLoading).toBe(true);

      await act(async () => {
        resolvePromise!({
          mutations: { mutations: [] },
          content: { review: 'Test review' },
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
    it('should dispatch generateLayerPracticeStart on call', async () => {
      mockApi.generateLayerPractice.mockResolvedValue({
        mutations: { mutations: [] },
        content: { review: 'Test' },
        graph: createMockGraph('graph-1'),
      });

      const { result } = renderHook(() => useGenerateLayerPractice('graph-1'), {
        wrapper: createWrapper(store),
      });

      act(() => {
        result.current.generate({ layerNumber: 1 });
      });

      const state = store.getState();
      expect(state.graphOperations.generateLayerPractice.isLoading).toBe(true);
    });

    it('should dispatch generateLayerPracticeSuccess on completion', async () => {
      const mockResponse = {
        mutations: { mutations: [] },
        content: { review: 'Practice review content' },
        graph: createMockGraph('graph-1'),
      };

      mockApi.generateLayerPractice.mockResolvedValue(mockResponse);

      const { result } = renderHook(() => useGenerateLayerPractice('graph-1'), {
        wrapper: createWrapper(store),
      });

      await act(async () => {
        await result.current.generate({ layerNumber: 1 });
      });

      const state = store.getState();
      expect(state.graphOperations.generateLayerPractice.isLoading).toBe(false);
      expect(state.graphOperations.generateLayerPractice.error).toBeNull();
    });
  });
});

