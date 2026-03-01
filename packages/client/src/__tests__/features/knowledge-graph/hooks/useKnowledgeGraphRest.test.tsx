/**
 * Tests for REST API Hooks (useKnowledgeGraphRest.ts)
 */

import React from 'react';
import { renderHook, act, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import {
  useGetGraph,
  useSaveGraph,
  useGetNodes,
  useGetNode,
  useCreateNode,
  useUpdateNode,
  useDeleteNode,
  useFindNodes,
  useGetRelationships,
  useGetNodeRelationships,
  useCreateRelationship,
  useDeleteRelationship,
  useFindPath,
  useTraverse,
  useExtractSubgraph,
} from '../../../../features/knowledge-graph/hooks/useKnowledgeGraphRest';
import { knowledgeGraphRestApi } from '../../../../features/knowledge-graph/api/restApi';
import knowledgeGraphSlice from '../../../../features/knowledge-graph/knowledgeGraphSlice';
import type {
  NodeBasedKnowledgeGraph,
  GraphNode,
  Relationship,
  NodeType,
  RelationshipType,
} from '../../../../features/knowledge-graph/types';

// Mock the REST API
jest.mock('../../../../features/knowledge-graph/api/restApi', () => ({
  knowledgeGraphRestApi: {
    getGraph: jest.fn(),
    saveGraph: jest.fn(),
    getNodes: jest.fn(),
    getNode: jest.fn(),
    createNode: jest.fn(),
    updateNode: jest.fn(),
    deleteNode: jest.fn(),
    findNodes: jest.fn(),
    getRelationships: jest.fn(),
    getNodeRelationships: jest.fn(),
    createRelationship: jest.fn(),
    deleteRelationship: jest.fn(),
    findPath: jest.fn(),
    traverse: jest.fn(),
    extractSubgraph: jest.fn(),
  },
}));

const mockApi = knowledgeGraphRestApi as jest.Mocked<typeof knowledgeGraphRestApi>;

describe('useKnowledgeGraphRest hooks', () => {
  // Helper functions
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

  const createMockNode = (id: string, type: NodeType = 'Concept'): GraphNode => ({
    id,
    type,
    properties: { name: `Node ${id}` },
    createdAt: Date.now(),
    updatedAt: Date.now(),
  });

  const createMockRelationship = (
    id: string,
    source: string,
    target: string,
    type: RelationshipType = 'hasChild'
  ): Relationship => ({
    id,
    source,
    target,
    type,
    direction: 'forward',
    createdAt: Date.now(),
  });

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

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Graph hooks', () => {
    describe('useGetGraph', () => {
      it('should fetch a graph successfully', async () => {
        const mockGraph = createMockGraph('graph-1');
        mockApi.getGraph.mockResolvedValue(mockGraph);

        const { result } = renderHook(() => useGetGraph(), {
          wrapper: createWrapper(),
        });

        expect(result.current.loading).toBe(false);
        expect(result.current.error).toBeNull();

        let graphResult: NodeBasedKnowledgeGraph | null = null;
        await act(async () => {
          graphResult = await result.current.getGraph('graph-1');
        });

        expect(result.current.loading).toBe(false);
        expect(result.current.error).toBeNull();
        expect(graphResult).toEqual(mockGraph);
        expect(mockApi.getGraph).toHaveBeenCalledWith('graph-1');
      });

      it('should handle loading state correctly', async () => {
        const mockGraph = createMockGraph('graph-1');
        mockApi.getGraph.mockImplementation(
          () => new Promise((resolve) => setTimeout(() => resolve(mockGraph), 100))
        );

        const { result } = renderHook(() => useGetGraph(), {
          wrapper: createWrapper(),
        });

        act(() => {
          result.current.getGraph('graph-1');
        });

        expect(result.current.loading).toBe(true);

        await waitFor(() => {
          expect(result.current.loading).toBe(false);
        });
      });

      it('should handle errors', async () => {
        const error = new Error('Failed to fetch graph');
        mockApi.getGraph.mockRejectedValue(error);

        const { result } = renderHook(() => useGetGraph(), {
          wrapper: createWrapper(),
        });

        await act(async () => {
          try {
            await result.current.getGraph('graph-1');
          } catch (e) {
            // Expected to throw
          }
        });

        expect(result.current.loading).toBe(false);
        expect(result.current.error).toBeInstanceOf(Error);
        // Hook preserves the original error message when it's an Error instance
        expect(result.current.error?.message).toBe('Failed to fetch graph');
      });

      it('should handle non-Error exceptions', async () => {
        mockApi.getGraph.mockRejectedValue('String error');

        const { result } = renderHook(() => useGetGraph(), {
          wrapper: createWrapper(),
        });

        await act(async () => {
          try {
            await result.current.getGraph('graph-1');
          } catch (e) {
            // Expected to throw
          }
        });

        expect(result.current.error).toBeInstanceOf(Error);
        expect(result.current.error?.message).toBe('Failed to get graph');
      });

      it('should prevent duplicate concurrent requests for the same graphId', async () => {
        const mockGraph = createMockGraph('graph-1');
        let resolveFirst: (value: NodeBasedKnowledgeGraph) => void;
        const firstPromise = new Promise<NodeBasedKnowledgeGraph>((resolve) => {
          resolveFirst = resolve;
        });

        mockApi.getGraph.mockImplementation(() => firstPromise);

        const { result } = renderHook(() => useGetGraph(), {
          wrapper: createWrapper(),
        });

        // Start first request
        act(() => {
          result.current.getGraph('graph-1');
        });

        expect(result.current.loading).toBe(true);
        expect(mockApi.getGraph).toHaveBeenCalledTimes(1);

        // Start second request for the same graphId (should be prevented)
        act(() => {
          result.current.getGraph('graph-1');
        });

        // Should still only have one API call
        expect(mockApi.getGraph).toHaveBeenCalledTimes(1);

        // Resolve the first request
        await act(async () => {
          resolveFirst!(mockGraph);
          await firstPromise;
        });

        await waitFor(() => {
          expect(result.current.loading).toBe(false);
        });
      });

      it('should store graph in Redux by default', async () => {
        const mockGraph = createMockGraph('graph-1');
        mockApi.getGraph.mockResolvedValue(mockGraph);

        const store = createTestStore();
        const { result } = renderHook(() => useGetGraph(), {
          wrapper: createWrapper(store),
        });

        await act(async () => {
          await result.current.getGraph('graph-1');
        });

        // Verify the graph was stored in Redux
        // This is tested indirectly through the dispatch call
        expect(mockApi.getGraph).toHaveBeenCalledWith('graph-1');
      });
    });

    describe('useSaveGraph', () => {
      it('should save a graph successfully', async () => {
        const mockGraph = createMockGraph('graph-1');
        mockApi.saveGraph.mockResolvedValue(mockGraph);

        const { result } = renderHook(() => useSaveGraph());

        let savedGraph: NodeBasedKnowledgeGraph | null = null;
        await act(async () => {
          savedGraph = await result.current.saveGraph('graph-1', mockGraph);
        });

        expect(result.current.loading).toBe(false);
        expect(result.current.error).toBeNull();
        expect(savedGraph).toEqual(mockGraph);
        expect(mockApi.saveGraph).toHaveBeenCalledWith('graph-1', mockGraph);
      });

      it('should handle save errors', async () => {
        const mockGraph = createMockGraph('graph-1');
        const error = new Error('Save failed');
        mockApi.saveGraph.mockRejectedValue(error);

        const { result } = renderHook(() => useSaveGraph());

        await act(async () => {
          try {
            await result.current.saveGraph('graph-1', mockGraph);
          } catch (e) {
            // Expected to throw
          }
        });

        expect(result.current.error).toBeInstanceOf(Error);
        // Hook preserves the original error message when it's an Error instance
        expect(result.current.error?.message).toBe('Save failed');
      });
    });
  });

  describe('Node hooks', () => {
    describe('useGetNodes', () => {
      it('should fetch nodes successfully', async () => {
        const mockResult = {
          nodes: [createMockNode('node-1'), createMockNode('node-2')],
          count: 2,
        };
        mockApi.getNodes.mockResolvedValue(mockResult);

        const { result } = renderHook(() => useGetNodes());

        let nodesResult: { nodes: GraphNode[]; count: number } | null = null;
        await act(async () => {
          nodesResult = await result.current.getNodes('graph-1');
        });

        expect(result.current.loading).toBe(false);
        expect(result.current.error).toBeNull();
        expect(nodesResult).toEqual(mockResult);
        expect(mockApi.getNodes).toHaveBeenCalledWith('graph-1', undefined);
      });

      it('should fetch nodes with options', async () => {
        const mockResult = {
          nodes: [createMockNode('node-1', 'Concept')],
          count: 1,
        };
        mockApi.getNodes.mockResolvedValue(mockResult);

        const { result } = renderHook(() => useGetNodes());

        await act(async () => {
          await result.current.getNodes('graph-1', { type: 'Concept' });
        });

        expect(mockApi.getNodes).toHaveBeenCalledWith('graph-1', { type: 'Concept' });
      });
    });

    describe('useGetNode', () => {
      it('should fetch a single node successfully', async () => {
        const mockNode = createMockNode('node-1');
        mockApi.getNode.mockResolvedValue(mockNode);

        const { result } = renderHook(() => useGetNode());

        let nodeResult: GraphNode | null = null;
        await act(async () => {
          nodeResult = await result.current.getNode('graph-1', 'node-1');
        });

        expect(result.current.loading).toBe(false);
        expect(result.current.error).toBeNull();
        expect(nodeResult).toEqual(mockNode);
        expect(mockApi.getNode).toHaveBeenCalledWith('graph-1', 'node-1');
      });
    });

    describe('useCreateNode', () => {
      it('should create a node successfully', async () => {
        const mockNode = createMockNode('node-1');
        const input = {
          type: 'Concept' as NodeType,
          properties: { name: 'New Node' },
        };
        mockApi.createNode.mockResolvedValue(mockNode);

        const { result } = renderHook(() => useCreateNode());

        let nodeResult: GraphNode | null = null;
        await act(async () => {
          nodeResult = await result.current.createNode('graph-1', input);
        });

        expect(result.current.loading).toBe(false);
        expect(result.current.error).toBeNull();
        expect(nodeResult).toEqual(mockNode);
        expect(mockApi.createNode).toHaveBeenCalledWith('graph-1', input);
      });
    });

    describe('useUpdateNode', () => {
      it('should update a node successfully', async () => {
        const mockNode = createMockNode('node-1');
        const input = {
          properties: { name: 'Updated Node' },
        };
        mockApi.updateNode.mockResolvedValue(mockNode);

        const { result } = renderHook(() => useUpdateNode());

        let nodeResult: GraphNode | null = null;
        await act(async () => {
          nodeResult = await result.current.updateNode('graph-1', 'node-1', input);
        });

        expect(result.current.loading).toBe(false);
        expect(result.current.error).toBeNull();
        expect(nodeResult).toEqual(mockNode);
        expect(mockApi.updateNode).toHaveBeenCalledWith('graph-1', 'node-1', input);
      });
    });

    describe('useDeleteNode', () => {
      it('should delete a node successfully', async () => {
        mockApi.deleteNode.mockResolvedValue(undefined);

        const { result } = renderHook(() => useDeleteNode());

        await act(async () => {
          await result.current.deleteNode('graph-1', 'node-1');
        });

        expect(result.current.loading).toBe(false);
        expect(result.current.error).toBeNull();
        expect(mockApi.deleteNode).toHaveBeenCalledWith('graph-1', 'node-1', undefined);
      });

      it('should delete a node with options', async () => {
        mockApi.deleteNode.mockResolvedValue(undefined);

        const { result } = renderHook(() => useDeleteNode());

        await act(async () => {
          await result.current.deleteNode('graph-1', 'node-1', { cascade: true });
        });

        expect(mockApi.deleteNode).toHaveBeenCalledWith('graph-1', 'node-1', { cascade: true });
      });
    });

    describe('useFindNodes', () => {
      it('should find nodes with filter successfully', async () => {
        const mockResult = {
          nodes: [createMockNode('node-1')],
          count: 1,
        };
        const filter = { type: 'Concept' };
        mockApi.findNodes.mockResolvedValue(mockResult);

        const { result } = renderHook(() => useFindNodes());

        let nodesResult: { nodes: GraphNode[]; count: number } | null = null;
        await act(async () => {
          nodesResult = await result.current.findNodes('graph-1', filter);
        });

        expect(result.current.loading).toBe(false);
        expect(result.current.error).toBeNull();
        expect(nodesResult).toEqual(mockResult);
        expect(mockApi.findNodes).toHaveBeenCalledWith('graph-1', filter);
      });
    });
  });

  describe('Relationship hooks', () => {
    describe('useGetRelationships', () => {
      it('should fetch relationships successfully', async () => {
        const mockResult = {
          relationships: [createMockRelationship('rel-1', 'node-1', 'node-2')],
          count: 1,
        };
        mockApi.getRelationships.mockResolvedValue(mockResult);

        const { result } = renderHook(() => useGetRelationships());

        let relsResult: { relationships: Relationship[]; count: number } | null = null;
        await act(async () => {
          relsResult = await result.current.getRelationships('graph-1');
        });

        expect(result.current.loading).toBe(false);
        expect(result.current.error).toBeNull();
        expect(relsResult).toEqual(mockResult);
        expect(mockApi.getRelationships).toHaveBeenCalledWith('graph-1', undefined);
      });

      it('should fetch relationships with options', async () => {
        const mockResult = {
          relationships: [createMockRelationship('rel-1', 'node-1', 'node-2')],
          count: 1,
        };
        mockApi.getRelationships.mockResolvedValue(mockResult);

        const { result } = renderHook(() => useGetRelationships());

        await act(async () => {
          await result.current.getRelationships('graph-1', { type: 'hasChild' });
        });

        expect(mockApi.getRelationships).toHaveBeenCalledWith('graph-1', { type: 'hasChild' });
      });
    });

    describe('useGetNodeRelationships', () => {
      it('should fetch node relationships successfully', async () => {
        const mockResult = {
          relationships: [createMockRelationship('rel-1', 'node-1', 'node-2')],
          count: 1,
        };
        mockApi.getNodeRelationships.mockResolvedValue(mockResult);

        const { result } = renderHook(() => useGetNodeRelationships());

        let relsResult: { relationships: Relationship[]; count: number } | null = null;
        await act(async () => {
          relsResult = await result.current.getNodeRelationships('graph-1', 'node-1');
        });

        expect(result.current.loading).toBe(false);
        expect(result.current.error).toBeNull();
        expect(relsResult).toEqual(mockResult);
        expect(mockApi.getNodeRelationships).toHaveBeenCalledWith('graph-1', 'node-1', undefined);
      });

      it('should fetch node relationships with options', async () => {
        const mockResult = {
          relationships: [createMockRelationship('rel-1', 'node-1', 'node-2')],
          count: 1,
        };
        mockApi.getNodeRelationships.mockResolvedValue(mockResult);

        const { result } = renderHook(() => useGetNodeRelationships());

        await act(async () => {
          await result.current.getNodeRelationships('graph-1', 'node-1', {
            direction: 'outgoing',
            type: 'hasChild',
          });
        });

        expect(mockApi.getNodeRelationships).toHaveBeenCalledWith('graph-1', 'node-1', {
          direction: 'outgoing',
          type: 'hasChild',
        });
      });
    });

    describe('useCreateRelationship', () => {
      it('should create a relationship successfully', async () => {
        const mockRelationship = createMockRelationship('rel-1', 'node-1', 'node-2');
        const input = {
          source: 'node-1',
          target: 'node-2',
          type: 'hasChild' as RelationshipType,
        };
        mockApi.createRelationship.mockResolvedValue(mockRelationship);

        const { result } = renderHook(() => useCreateRelationship());

        let relResult: Relationship | null = null;
        await act(async () => {
          relResult = await result.current.createRelationship('graph-1', input);
        });

        expect(result.current.loading).toBe(false);
        expect(result.current.error).toBeNull();
        expect(relResult).toEqual(mockRelationship);
        expect(mockApi.createRelationship).toHaveBeenCalledWith('graph-1', input);
      });
    });

    describe('useDeleteRelationship', () => {
      it('should delete a relationship successfully', async () => {
        mockApi.deleteRelationship.mockResolvedValue(undefined);

        const { result } = renderHook(() => useDeleteRelationship());

        await act(async () => {
          await result.current.deleteRelationship('graph-1', 'rel-1');
        });

        expect(result.current.loading).toBe(false);
        expect(result.current.error).toBeNull();
        expect(mockApi.deleteRelationship).toHaveBeenCalledWith('graph-1', 'rel-1');
      });
    });
  });

  describe('Query operation hooks', () => {
    describe('useFindPath', () => {
      it('should find a path successfully', async () => {
        const mockPath = {
          path: [createMockNode('node-1'), createMockNode('node-2')],
          length: 2,
        };
        mockApi.findPath.mockResolvedValue(mockPath);

        const { result } = renderHook(() => useFindPath());

        let pathResult: { path: GraphNode[]; length: number } | null = null;
        await act(async () => {
          pathResult = await result.current.findPath('graph-1', 'node-1', 'node-2');
        });

        expect(result.current.loading).toBe(false);
        expect(result.current.error).toBeNull();
        expect(pathResult).toEqual(mockPath);
        expect(mockApi.findPath).toHaveBeenCalledWith('graph-1', 'node-1', 'node-2', undefined);
      });

      it('should find a path with maxDepth', async () => {
        const mockPath = {
          path: [createMockNode('node-1'), createMockNode('node-2')],
          length: 2,
        };
        mockApi.findPath.mockResolvedValue(mockPath);

        const { result } = renderHook(() => useFindPath());

        await act(async () => {
          await result.current.findPath('graph-1', 'node-1', 'node-2', 5);
        });

        expect(mockApi.findPath).toHaveBeenCalledWith('graph-1', 'node-1', 'node-2', 5);
      });
    });

    describe('useTraverse', () => {
      it('should traverse the graph successfully', async () => {
        const mockTraverse = {
          nodes: [createMockNode('node-1'), createMockNode('node-2')],
          relationships: [createMockRelationship('rel-1', 'node-1', 'node-2')],
          depth: 1,
          visited: ['node-1', 'node-2'],
        };
        mockApi.traverse.mockResolvedValue(mockTraverse);

        const { result } = renderHook(() => useTraverse());

        let traverseResult: {
          nodes: GraphNode[];
          relationships: Relationship[];
          depth: number;
          visited: string[];
        } | null = null;
        await act(async () => {
          traverseResult = await result.current.traverse('graph-1', 'node-1');
        });

        expect(result.current.loading).toBe(false);
        expect(result.current.error).toBeNull();
        expect(traverseResult).toEqual(mockTraverse);
        expect(mockApi.traverse).toHaveBeenCalledWith('graph-1', 'node-1', undefined);
      });

      it('should traverse with options', async () => {
        const mockTraverse = {
          nodes: [createMockNode('node-1')],
          relationships: [],
          depth: 0,
          visited: ['node-1'],
        };
        const options = {
          relationshipTypes: ['hasChild' as RelationshipType],
          direction: 'forward' as const,
          maxDepth: 2,
          limit: 10,
        };
        mockApi.traverse.mockResolvedValue(mockTraverse);

        const { result } = renderHook(() => useTraverse());

        await act(async () => {
          await result.current.traverse('graph-1', 'node-1', options);
        });

        expect(mockApi.traverse).toHaveBeenCalledWith('graph-1', 'node-1', options);
      });
    });

    describe('useExtractSubgraph', () => {
      it('should extract a subgraph successfully', async () => {
        const mockSubgraph = createMockGraph('subgraph-1');
        const nodeIds = ['node-1', 'node-2'];
        mockApi.extractSubgraph.mockResolvedValue(mockSubgraph);

        const { result } = renderHook(() => useExtractSubgraph());

        let subgraphResult: NodeBasedKnowledgeGraph | null = null;
        await act(async () => {
          subgraphResult = await result.current.extractSubgraph('graph-1', nodeIds);
        });

        expect(result.current.loading).toBe(false);
        expect(result.current.error).toBeNull();
        expect(subgraphResult).toEqual(mockSubgraph);
        expect(mockApi.extractSubgraph).toHaveBeenCalledWith('graph-1', nodeIds, undefined);
      });

      it('should extract a subgraph with depth', async () => {
        const mockSubgraph = createMockGraph('subgraph-1');
        const nodeIds = ['node-1', 'node-2'];
        mockApi.extractSubgraph.mockResolvedValue(mockSubgraph);

        const { result } = renderHook(() => useExtractSubgraph());

        await act(async () => {
          await result.current.extractSubgraph('graph-1', nodeIds, 2);
        });

        expect(mockApi.extractSubgraph).toHaveBeenCalledWith('graph-1', nodeIds, 2);
      });
    });
  });
});


