/**
 * Tests for useUpdateNodeProperties Hook
 * 
 * Tests the hook that updates node properties (like isExpanded) in the knowledge graph
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { useUpdateNodeProperties } from '../../../../features/knowledge-graph/hooks/useUpdateNodeProperties';
import { graphOperationsApi } from '../../../../features/knowledge-graph/api/graphOperationsApi';
import knowledgeGraphSlice from '../../../../features/knowledge-graph/knowledgeGraphSlice';
import type { NodeBasedKnowledgeGraph, GraphNode } from '../../../../features/knowledge-graph/types';

// Mock the API
jest.mock('../../../../features/knowledge-graph/api/graphOperationsApi', () => ({
  graphOperationsApi: {
    applyMutations: jest.fn(),
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

describe('useUpdateNodeProperties', () => {
  // Helper to create a test store
  const createTestStore = (preloadedState = {}) => {
    return configureStore({
      reducer: {
        knowledgeGraphs: knowledgeGraphSlice,
      },
      preloadedState,
    });
  };

  // Helper to create a wrapper with store
  const createWrapper = (store = createTestStore()) => {
    return ({ children }: { children: React.ReactNode }) => (
      <Provider store={store}>{children}</Provider>
    );
  };

  const createMockGraph = (graphId: string, nodeId: string, isExpanded: boolean = false): NodeBasedKnowledgeGraph => ({
    id: graphId,
    seedConceptId: nodeId,
    version: 1,
    createdAt: 1000,
    updatedAt: 2000,
    nodes: {
      [graphId]: {
        id: graphId,
        type: 'Graph',
        properties: { id: graphId },
        createdAt: 1000,
        updatedAt: 2000,
      },
      [nodeId]: {
        id: nodeId,
        type: 'Concept',
        properties: {
          id: nodeId,
          name: 'Test Concept',
          isExpanded,
        },
        createdAt: 1000,
        updatedAt: 2000,
      },
    },
    nodeTypes: {
      Graph: [graphId],
      Concept: [nodeId],
      Layer: [],
      LearningGoal: [],
      Milestone: [],
      PracticeExercise: [],
      Lesson: [],
      ConceptMetadata: [],
      GraphMetadata: [],
      FlashCard: [],
    },
    relationships: [],
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should update node properties successfully', async () => {
    const graphId = 'test-graph-1';
    const nodeId = 'concept-1';
    const initialGraph = createMockGraph(graphId, nodeId, false);
    const updatedGraph = createMockGraph(graphId, nodeId, true);
    updatedGraph.version = 2;
    updatedGraph.updatedAt = 3000;
    updatedGraph.nodes[nodeId].updatedAt = 3000;

    mockApi.applyMutations.mockResolvedValue({
      graph: updatedGraph,
    });

    const store = createTestStore({
      knowledgeGraphs: {
        graphs: {
          [graphId]: initialGraph,
        },
        loading: false,
        error: null,
      },
    });

    const { result } = renderHook(
      () => useUpdateNodeProperties(graphId),
      { wrapper: createWrapper(store) }
    );

    expect(result.current.updating).toBe(false);
    expect(result.current.error).toBe(null);

    await act(async () => {
      await result.current.updateProperties(nodeId, { isExpanded: true });
    });

    await waitFor(() => {
      expect(result.current.updating).toBe(false);
    });

    expect(mockApi.applyMutations).toHaveBeenCalledWith(graphId, {
      mutations: [
        {
          type: 'update_node',
          nodeId,
          properties: { isExpanded: true },
        },
      ],
    });

    // Verify Redux store was updated
    const state = store.getState();
    expect(state.knowledgeGraphs.graphs[graphId]).toBeDefined();
    expect(state.knowledgeGraphs.graphs[graphId].id).toBe(updatedGraph.id);
    expect(state.knowledgeGraphs.graphs[graphId].nodes[nodeId].properties.isExpanded).toBe(true);
  });

  it('should handle errors gracefully', async () => {
    const graphId = 'test-graph-1';
    const nodeId = 'concept-1';
    const error = new Error('Failed to update node');

    mockApi.applyMutations.mockRejectedValue(error);

    const { result } = renderHook(
      () => useUpdateNodeProperties(graphId),
      { wrapper: createWrapper() }
    );

    await act(async () => {
      try {
        await result.current.updateProperties(nodeId, { isExpanded: true });
      } catch (err) {
        // Expected to throw
      }
    });

    await waitFor(() => {
      expect(result.current.updating).toBe(false);
    });

    expect(result.current.error).toBe('Failed to update node');
  });

  it('should set updating state during API call', async () => {
    const graphId = 'test-graph-1';
    const nodeId = 'concept-1';
    const initialGraph = createMockGraph(graphId, nodeId, false);
    const updatedGraph = createMockGraph(graphId, nodeId, true);

    let resolvePromise: (value: any) => void;
    const promise = new Promise((resolve) => {
      resolvePromise = resolve;
    });

    mockApi.applyMutations.mockReturnValue(promise);

    const { result } = renderHook(
      () => useUpdateNodeProperties(graphId),
      { wrapper: createWrapper() }
    );

    act(() => {
      result.current.updateProperties(nodeId, { isExpanded: true });
    });

    // Should be updating
    expect(result.current.updating).toBe(true);

    // Resolve the promise
    await act(async () => {
      resolvePromise!({ graph: updatedGraph });
      await promise;
    });

    await waitFor(() => {
      expect(result.current.updating).toBe(false);
    });
  });

  it('should throw error if graphId is not provided', async () => {
    const { result } = renderHook(
      () => useUpdateNodeProperties(''),
      { wrapper: createWrapper() }
    );

    await act(async () => {
      try {
        await result.current.updateProperties('node-1', { isExpanded: true });
      } catch (err) {
        expect(err).toBeInstanceOf(Error);
        expect((err as Error).message).toBe('Graph ID is required');
      }
    });

    expect(result.current.error).toBe('Graph ID is required');
    expect(mockApi.applyMutations).not.toHaveBeenCalled();
  });

  it('should update multiple properties at once', async () => {
    const graphId = 'test-graph-1';
    const nodeId = 'concept-1';
    const initialGraph = createMockGraph(graphId, nodeId, false);
    const updatedGraph = createMockGraph(graphId, nodeId, true);

    mockApi.applyMutations.mockResolvedValue({
      graph: updatedGraph,
    });

    const { result } = renderHook(
      () => useUpdateNodeProperties(graphId),
      { wrapper: createWrapper() }
    );

    await act(async () => {
      await result.current.updateProperties(nodeId, {
        isExpanded: true,
        name: 'Updated Name',
      });
    });

    expect(mockApi.applyMutations).toHaveBeenCalledWith(graphId, {
      mutations: [
        {
          type: 'update_node',
          nodeId,
          properties: {
            isExpanded: true,
            name: 'Updated Name',
          },
        },
      ],
    });
  });

  it('should clear error on successful update', async () => {
    const graphId = 'test-graph-1';
    const nodeId = 'concept-1';
    const initialGraph = createMockGraph(graphId, nodeId, false);
    const updatedGraph = createMockGraph(graphId, nodeId, true);

    // First call fails
    mockApi.applyMutations.mockRejectedValueOnce(new Error('First error'));

    const { result } = renderHook(
      () => useUpdateNodeProperties(graphId),
      { wrapper: createWrapper() }
    );

    // First update fails
    await act(async () => {
      try {
        await result.current.updateProperties(nodeId, { isExpanded: true });
      } catch (err) {
        // Expected
      }
    });

    await waitFor(() => {
      expect(result.current.error).toBe('First error');
    });

    // Second call succeeds
    mockApi.applyMutations.mockResolvedValueOnce({
      graph: updatedGraph,
    });

    // Second update succeeds
    await act(async () => {
      await result.current.updateProperties(nodeId, { isExpanded: true });
    });

    await waitFor(() => {
      expect(result.current.error).toBe(null);
    });
  });
});

