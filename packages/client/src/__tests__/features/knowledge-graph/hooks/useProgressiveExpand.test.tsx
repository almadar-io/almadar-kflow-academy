/**
 * Tests for useProgressiveExpand Hook
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { useProgressiveExpand } from '../../../../features/knowledge-graph/hooks/useProgressiveExpand';
import { graphOperationsApi, graphOperationsStreamingApi } from '../../../../features/knowledge-graph/api';
import knowledgeGraphSlice from '../../../../features/knowledge-graph/knowledgeGraphSlice';
import graphOperationSlice from '../../../../features/knowledge-graph/redux/graphOperationSlice';
import type { NodeBasedKnowledgeGraph } from '../../../../features/knowledge-graph/types';

// Mock the API
jest.mock('../../../../features/knowledge-graph/api', () => ({
  graphOperationsApi: {
    progressiveExpand: jest.fn(),
  },
  graphOperationsStreamingApi: {
    progressiveExpand: jest.fn(),
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
const createTestStore = (initialState?: {
  knowledgeGraphs?: any;
  graphOperations?: any;
}) => {
  return configureStore({
    reducer: {
      knowledgeGraphs: knowledgeGraphSlice,
      graphOperations: graphOperationSlice,
    },
    preloadedState: initialState,
  });
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

describe('useProgressiveExpand', () => {
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
                id: 'node-1',
                type: 'Concept' as const,
                properties: {},
                createdAt: Date.now(),
                updatedAt: Date.now(),
              },
            },
          ],
          metadata: {
            operation: 'progressiveExpand',
            timestamp: Date.now(),
          },
        },
        content: {
          narrative: 'Test narrative',
          concepts: [],
        },
        graph: createMockGraph('graph-1'),
        errors: [],
      };

      mockApi.progressiveExpand.mockResolvedValue(mockResponse);

      const { result } = renderHook(() => useProgressiveExpand('graph-1'), {
        wrapper: createWrapper(store),
      });

      await act(async () => {
        await result.current.expand({ numConcepts: 5 });
      });

      expect(mockApi.progressiveExpand).toHaveBeenCalledWith('graph-1', {
        numConcepts: 5,
      });
      expect(result.current.isLoading).toBe(false);
    });

    it('should handle errors', async () => {
      const error = new Error('API Error');
      mockApi.progressiveExpand.mockRejectedValue(error);

      const { result } = renderHook(() => useProgressiveExpand('graph-1'), {
        wrapper: createWrapper(store),
      });

      await act(async () => {
        await expect(result.current.expand({})).rejects.toThrow('API Error');
      });

      expect(result.current.error).toBe('API Error');
      expect(result.current.isLoading).toBe(false);
    });
  });

  describe('streaming mode', () => {
    it('should handle streaming responses', async () => {
      const mockResponse = {
        mutations: {
          mutations: [],
          metadata: {
            operation: 'progressiveExpand',
            timestamp: Date.now(),
          },
        },
        content: {
          narrative: 'Test narrative',
          concepts: [],
        },
        graph: createMockGraph('graph-1'),
        errors: [],
      };

      const onChunk = jest.fn();
      mockStreamingApi.progressiveExpand.mockResolvedValue(mockResponse);

      const { result } = renderHook(() => useProgressiveExpand('graph-1'), {
        wrapper: createWrapper(store),
      });

      await act(async () => {
        await result.current.expand(
          { numConcepts: 5 },
          { stream: true, onChunk }
        );
      });

      expect(mockStreamingApi.progressiveExpand).toHaveBeenCalledWith(
        'graph-1',
        { numConcepts: 5 },
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
            operation: 'progressiveExpand',
            timestamp: Date.now(),
          },
        },
        content: {
          narrative: 'Test narrative',
          concepts: [],
        },
        graph: createMockGraph('graph-1'),
        errors: [],
      };

      const onChunk = jest.fn();
      mockStreamingApi.progressiveExpand.mockImplementation(
        async (graphId, request, callbacks) => {
          callbacks.onChunk?.('Hello');
          callbacks.onChunk?.(' World');
          callbacks.onDone?.(mockResponse);
          return mockResponse;
        }
      );

      const { result } = renderHook(() => useProgressiveExpand('graph-1'), {
        wrapper: createWrapper(store),
      });

      await act(async () => {
        await result.current.expand(
          { numConcepts: 5 },
          { stream: true, onChunk }
        );
      });

      expect(onChunk).toHaveBeenCalledWith('Hello');
      expect(onChunk).toHaveBeenCalledWith(' World');
    });
  });

  describe('loading states', () => {
    it('should set loading state during operation', async () => {
      let resolvePromise: (value: any) => void;
      const promise = new Promise((resolve) => {
        resolvePromise = resolve;
      });

      mockApi.progressiveExpand.mockReturnValue(promise as any);

      const { result } = renderHook(() => useProgressiveExpand('graph-1'), {
        wrapper: createWrapper(store),
      });

      act(() => {
        result.current.expand({});
      });

      expect(result.current.isLoading).toBe(true);

      await act(async () => {
        resolvePromise!({
          mutations: { mutations: [] },
          content: { narrative: '', concepts: [] },
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

