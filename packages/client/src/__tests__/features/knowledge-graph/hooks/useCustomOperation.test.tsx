/**
 * Tests for useCustomOperation Hook
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { useCustomOperation } from '../../../../features/knowledge-graph/hooks/useCustomOperation';
import { graphOperationsApi, graphOperationsStreamingApi } from '../../../../features/knowledge-graph/api';
import knowledgeGraphSlice from '../../../../features/knowledge-graph/knowledgeGraphSlice';
import graphOperationSlice from '../../../../features/knowledge-graph/redux/graphOperationSlice';
import { mutationMiddleware } from '../../../../features/knowledge-graph/redux/mutationMiddleware';
import type { NodeBasedKnowledgeGraph } from '../../../../features/knowledge-graph/types';

// Mock the API
jest.mock('../../../../features/knowledge-graph/api', () => ({
  graphOperationsApi: {
    customOperation: jest.fn(),
  },
  graphOperationsStreamingApi: {
    customOperation: jest.fn(),
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

describe('useCustomOperation', () => {
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
                properties: { name: 'New Concept' },
                createdAt: Date.now(),
                updatedAt: Date.now(),
              },
            },
          ],
          metadata: {
            operation: 'customOperation',
            timestamp: Date.now(),
          },
        },
        content: {
          concepts: [
            { name: 'New Concept', action: 'added' as const },
          ],
        },
        graph: createMockGraph('graph-1'),
        errors: [],
      };

      mockApi.customOperation.mockResolvedValue(mockResponse);

      const { result } = renderHook(() => useCustomOperation('graph-1'), {
        wrapper: createWrapper(store),
      });

      await act(async () => {
        await result.current.execute({
          targetNodeIds: ['node-1'],
          userPrompt: 'Add a new concept called "New Concept"',
        });
      });

      expect(mockApi.customOperation).toHaveBeenCalledWith('graph-1', {
        targetNodeIds: ['node-1'],
        userPrompt: 'Add a new concept called "New Concept"',
      });
      expect(result.current.isLoading).toBe(false);
    });

    it('should handle errors', async () => {
      const error = new Error('API Error');
      mockApi.customOperation.mockRejectedValue(error);

      const { result } = renderHook(() => useCustomOperation('graph-1'), {
        wrapper: createWrapper(store),
      });

      await act(async () => {
        await expect(
          result.current.execute({
            targetNodeIds: ['node-1'],
            userPrompt: 'Test prompt',
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
                id: 'new-node-1',
                type: 'Concept' as const,
                properties: { name: 'New Concept' },
                createdAt: Date.now(),
                updatedAt: Date.now(),
              },
            },
            {
              type: 'update_node' as const,
              nodeId: 'existing-node-1',
              properties: { description: 'Updated description' },
            },
          ],
          metadata: {
            operation: 'customOperation',
            timestamp: Date.now(),
          },
        },
        content: {
          concepts: [
            { name: 'New Concept', action: 'added' as const },
            { name: 'Existing Concept', action: 'updated' as const },
          ],
        },
        graph: createMockGraph('graph-1'),
        errors: [],
      };

      mockApi.customOperation.mockResolvedValue(mockResponse);

      const { result } = renderHook(() => useCustomOperation('graph-1'), {
        wrapper: createWrapper(store),
      });

      await act(async () => {
        await result.current.execute({
          targetNodeIds: ['existing-node-1'],
          userPrompt: 'Update the concept and add a new one',
        });
      });

      const state = store.getState();
      expect(state.knowledgeGraphs.graphs['graph-1'].nodes['new-node-1']).toBeDefined();
    });

    it('should handle multiple target nodes', async () => {
      const mockResponse = {
        mutations: {
          mutations: [],
          metadata: {
            operation: 'customOperation',
            timestamp: Date.now(),
          },
        },
        content: {
          concepts: [],
        },
        graph: createMockGraph('graph-1'),
        errors: [],
      };

      mockApi.customOperation.mockResolvedValue(mockResponse);

      const { result } = renderHook(() => useCustomOperation('graph-1'), {
        wrapper: createWrapper(store),
      });

      await act(async () => {
        await result.current.execute({
          targetNodeIds: ['node-1', 'node-2', 'node-3'],
          userPrompt: 'Remove these concepts',
        });
      });

      expect(mockApi.customOperation).toHaveBeenCalledWith('graph-1', {
        targetNodeIds: ['node-1', 'node-2', 'node-3'],
        userPrompt: 'Remove these concepts',
      });
    });
  });

  describe('streaming mode', () => {
    it('should handle streaming responses', async () => {
      const mockResponse = {
        mutations: {
          mutations: [],
          metadata: {
            operation: 'customOperation',
            timestamp: Date.now(),
          },
        },
        content: {
          concepts: [],
        },
        graph: createMockGraph('graph-1'),
        errors: [],
      };

      const onChunk = jest.fn();
      mockStreamingApi.customOperation.mockResolvedValue(mockResponse);

      const { result } = renderHook(() => useCustomOperation('graph-1'), {
        wrapper: createWrapper(store),
      });

      await act(async () => {
        await result.current.execute(
          {
            targetNodeIds: ['node-1'],
            userPrompt: 'Test prompt',
          },
          { stream: true, onChunk }
        );
      });

      expect(mockStreamingApi.customOperation).toHaveBeenCalledWith(
        'graph-1',
        {
          targetNodeIds: ['node-1'],
          userPrompt: 'Test prompt',
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
            operation: 'customOperation',
            timestamp: Date.now(),
          },
        },
        content: {
          concepts: [],
        },
        graph: createMockGraph('graph-1'),
        errors: [],
      };

      const onChunk = jest.fn();
      mockStreamingApi.customOperation.mockImplementation(
        async (graphId, request, callbacks) => {
          callbacks.onChunk?.('Processing ');
          callbacks.onChunk?.('operation...');
          callbacks.onDone?.(mockResponse);
          return mockResponse;
        }
      );

      const { result } = renderHook(() => useCustomOperation('graph-1'), {
        wrapper: createWrapper(store),
      });

      await act(async () => {
        await result.current.execute(
          {
            targetNodeIds: ['node-1'],
            userPrompt: 'Test prompt',
          },
          { stream: true, onChunk }
        );
      });

      expect(onChunk).toHaveBeenCalledWith('Processing ');
      expect(onChunk).toHaveBeenCalledWith('operation...');
    });

    it('should handle streaming errors', async () => {
      const onError = jest.fn();
      mockStreamingApi.customOperation.mockImplementation(
        async (graphId, request, callbacks) => {
          callbacks.onError?.('Stream error');
          throw new Error('Stream error');
        }
      );

      const { result } = renderHook(() => useCustomOperation('graph-1'), {
        wrapper: createWrapper(store),
      });

      await act(async () => {
        await expect(
          result.current.execute(
            {
              targetNodeIds: ['node-1'],
              userPrompt: 'Test prompt',
            },
            { stream: true }
          )
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

      mockApi.customOperation.mockReturnValue(promise as any);

      const { result } = renderHook(() => useCustomOperation('graph-1'), {
        wrapper: createWrapper(store),
      });

      act(() => {
        result.current.execute({
          targetNodeIds: ['node-1'],
          userPrompt: 'Test prompt',
        });
      });

      expect(result.current.isLoading).toBe(true);

      await act(async () => {
        resolvePromise!({
          mutations: { mutations: [] },
          content: { concepts: [] },
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
    it('should dispatch customOperationStart on call', async () => {
      mockApi.customOperation.mockResolvedValue({
        mutations: { mutations: [] },
        content: { concepts: [] },
        graph: createMockGraph('graph-1'),
      });

      const { result } = renderHook(() => useCustomOperation('graph-1'), {
        wrapper: createWrapper(store),
      });

      act(() => {
        result.current.execute({
          targetNodeIds: ['node-1'],
          userPrompt: 'Test prompt',
        });
      });

      const state = store.getState();
      expect(state.graphOperations.customOperation.isLoading).toBe(true);
    });

    it('should dispatch customOperationSuccess on completion', async () => {
      const mockResponse = {
        mutations: { mutations: [] },
        content: {
          concepts: [
            { name: 'Concept 1', action: 'added' as const },
          ],
        },
        graph: createMockGraph('graph-1'),
      };

      mockApi.customOperation.mockResolvedValue(mockResponse);

      const { result } = renderHook(() => useCustomOperation('graph-1'), {
        wrapper: createWrapper(store),
      });

      await act(async () => {
        await result.current.execute({
          targetNodeIds: ['node-1'],
          userPrompt: 'Test prompt',
        });
      });

      const state = store.getState();
      expect(state.graphOperations.customOperation.isLoading).toBe(false);
      expect(state.graphOperations.customOperation.error).toBeNull();
    });
  });

  describe('complex operations', () => {
    it('should handle add operations', async () => {
      const mockResponse = {
        mutations: {
          mutations: [
            {
              type: 'create_node' as const,
              node: {
                id: 'new-concept-1',
                type: 'Concept' as const,
                properties: { name: 'New Concept' },
                createdAt: Date.now(),
                updatedAt: Date.now(),
              },
            },
          ],
          metadata: {
            operation: 'customOperation',
            timestamp: Date.now(),
          },
        },
        content: {
          concepts: [{ name: 'New Concept', action: 'added' as const }],
        },
        graph: createMockGraph('graph-1'),
        errors: [],
      };

      mockApi.customOperation.mockResolvedValue(mockResponse);

      const { result } = renderHook(() => useCustomOperation('graph-1'), {
        wrapper: createWrapper(store),
      });

      await act(async () => {
        await result.current.execute({
          targetNodeIds: [],
          userPrompt: 'Add a new concept called "New Concept"',
        });
      });

      const state = store.getState();
      expect(state.knowledgeGraphs.graphs['graph-1'].nodes['new-concept-1']).toBeDefined();
    });

    it('should handle update operations', async () => {
      const graph = createMockGraph('graph-1');
      graph.nodes['existing-node-1'] = {
        id: 'existing-node-1',
        type: 'Concept',
        properties: { name: 'Existing Concept', description: 'Old description' },
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      store = createTestStore({
        knowledgeGraphs: {
          graphs: {
            'graph-1': graph,
          },
          currentGraphId: 'graph-1',
          isLoading: false,
          error: null,
          lastUpdated: null,
        },
      });

      const mockResponse = {
        mutations: {
          mutations: [
            {
              type: 'update_node' as const,
              nodeId: 'existing-node-1',
              properties: { description: 'New description' },
            },
          ],
          metadata: {
            operation: 'customOperation',
            timestamp: Date.now(),
          },
        },
        content: {
          concepts: [{ name: 'Existing Concept', action: 'updated' as const }],
        },
        graph,
        errors: [],
      };

      mockApi.customOperation.mockResolvedValue(mockResponse);

      const { result } = renderHook(() => useCustomOperation('graph-1'), {
        wrapper: createWrapper(store),
      });

      await act(async () => {
        await result.current.execute({
          targetNodeIds: ['existing-node-1'],
          userPrompt: 'Update the description',
        });
      });

      const state = store.getState();
      expect(state.knowledgeGraphs.graphs['graph-1'].nodes['existing-node-1'].properties.description).toBe('New description');
    });

    it('should handle delete operations', async () => {
      const graph = createMockGraph('graph-1');
      graph.nodes['node-to-delete'] = {
        id: 'node-to-delete',
        type: 'Concept',
        properties: { name: 'To Delete' },
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      graph.nodeTypes.Concept.push('node-to-delete');

      store = createTestStore({
        knowledgeGraphs: {
          graphs: {
            'graph-1': graph,
          },
          currentGraphId: 'graph-1',
          isLoading: false,
          error: null,
          lastUpdated: null,
        },
      });

      const mockResponse = {
        mutations: {
          mutations: [
            {
              type: 'delete_node' as const,
              nodeId: 'node-to-delete',
            },
          ],
          metadata: {
            operation: 'customOperation',
            timestamp: Date.now(),
          },
        },
        content: {
          concepts: [{ name: 'To Delete', action: 'deleted' as const }],
        },
        graph,
        errors: [],
      };

      mockApi.customOperation.mockResolvedValue(mockResponse);

      const { result } = renderHook(() => useCustomOperation('graph-1'), {
        wrapper: createWrapper(store),
      });

      await act(async () => {
        await result.current.execute({
          targetNodeIds: ['node-to-delete'],
          userPrompt: 'Delete this concept',
        });
      });

      const state = store.getState();
      expect(state.knowledgeGraphs.graphs['graph-1'].nodes['node-to-delete']).toBeUndefined();
    });
  });
});

