/**
 * Tests for REST API (restApi.ts)
 */

import { knowledgeGraphRestApi } from '../../../../features/knowledge-graph/api/restApi';
import { apiClient } from '../../../../services/apiClient';
import { auth } from '../../../../config/firebase';
import type {
  NodeBasedKnowledgeGraph,
  GraphNode,
  Relationship,
  NodeType,
  RelationshipType,
} from '../../../../features/knowledge-graph/types';

// Mock dependencies
jest.mock('../../../../services/apiClient', () => ({
  apiClient: {
    fetch: jest.fn(),
  },
}));

jest.mock('../../../../config/firebase', () => ({
  auth: {
    currentUser: null,
  },
}));

describe('knowledgeGraphRestApi', () => {
  const mockApiClient = apiClient as jest.Mocked<typeof apiClient>;
  const mockAuth = auth as jest.Mocked<typeof auth>;

  beforeEach(() => {
    jest.clearAllMocks();
    // Use Object.defineProperty to make currentUser writable
    Object.defineProperty(mockAuth, 'currentUser', {
      value: null,
      writable: true,
      configurable: true,
    });
  });

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

  describe('getAuthHeaders', () => {
    it('should include Authorization header when user is authenticated', async () => {
      const mockUser = {
        getIdToken: jest.fn().mockResolvedValue('mock-token'),
      };
      Object.defineProperty(mockAuth, 'currentUser', {
        value: mockUser,
        writable: true,
        configurable: true,
      });

      await knowledgeGraphRestApi.getGraph('graph-1');

      expect(mockApiClient.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer mock-token',
          }),
        })
      );
    });

    it('should not include Authorization header when user is not authenticated', async () => {
      Object.defineProperty(mockAuth, 'currentUser', {
        value: null,
        writable: true,
        configurable: true,
      });

      await knowledgeGraphRestApi.getGraph('graph-1');

      expect(mockApiClient.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.not.objectContaining({
            Authorization: expect.anything(),
          }),
        })
      );
    });

    it('should handle token retrieval errors gracefully', async () => {
      const mockUser = {
        getIdToken: jest.fn().mockRejectedValue(new Error('Token error')),
      };
      Object.defineProperty(mockAuth, 'currentUser', {
        value: mockUser,
        writable: true,
        configurable: true,
      });
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      await knowledgeGraphRestApi.getGraph('graph-1');

      expect(consoleErrorSpy).toHaveBeenCalled();
      expect(mockApiClient.fetch).toHaveBeenCalled();
      consoleErrorSpy.mockRestore();
    });
  });

  describe('Graph operations', () => {
    describe('getGraph', () => {
      it('should fetch a graph by ID', async () => {
        const mockGraph = createMockGraph('graph-1');
        mockApiClient.fetch.mockResolvedValue(mockGraph);

        const result = await knowledgeGraphRestApi.getGraph('graph-1');

        expect(mockApiClient.fetch).toHaveBeenCalledWith(
          '/api/knowledge-graphs-access/graph-1',
          expect.objectContaining({
            headers: expect.any(Object),
          })
        );
        expect(result).toEqual(mockGraph);
      });

      it('should throw error when API call fails', async () => {
        const error = new Error('API Error');
        mockApiClient.fetch.mockRejectedValue(error);

        await expect(knowledgeGraphRestApi.getGraph('graph-1')).rejects.toThrow('API Error');
      });
    });

    describe('saveGraph', () => {
      it('should save a graph and fetch it back when backend returns success object', async () => {
        const mockGraph = createMockGraph('graph-1');
        // First call (PUT) returns { success: true, graphId }
        // Second call (GET) returns the actual graph
        mockApiClient.fetch
          .mockResolvedValueOnce({ success: true, graphId: 'graph-1' })
          .mockResolvedValueOnce(mockGraph);

        const result = await knowledgeGraphRestApi.saveGraph('graph-1', mockGraph);

        expect(mockApiClient.fetch).toHaveBeenCalledTimes(2);
        expect(mockApiClient.fetch).toHaveBeenNthCalledWith(
          1,
          '/api/knowledge-graphs-access/graph-1',
          expect.objectContaining({
            method: 'PUT',
            headers: expect.any(Object),
            body: JSON.stringify(mockGraph),
          })
        );
        expect(mockApiClient.fetch).toHaveBeenNthCalledWith(
          2,
          '/api/knowledge-graphs-access/graph-1',
          expect.objectContaining({
            headers: expect.any(Object),
          })
        );
        expect(result).toEqual(mockGraph);
      });

      it('should return graph directly if response is already a graph object', async () => {
        const mockGraph = createMockGraph('graph-1');
        // If the PUT response is already a graph, don't fetch again
        mockApiClient.fetch.mockResolvedValueOnce(mockGraph);

        const result = await knowledgeGraphRestApi.saveGraph('graph-1', mockGraph);

        expect(mockApiClient.fetch).toHaveBeenCalledTimes(1);
        expect(result).toEqual(mockGraph);
      });

      it('should throw error when save fails', async () => {
        const mockGraph = createMockGraph('graph-1');
        const error = new Error('Save failed');
        mockApiClient.fetch.mockRejectedValue(error);

        await expect(knowledgeGraphRestApi.saveGraph('graph-1', mockGraph)).rejects.toThrow(
          'Save failed'
        );
      });

      it('should handle fetch errors after successful save', async () => {
        const mockGraph = createMockGraph('graph-1');
        // First call (PUT) succeeds, second call (GET) fails
        mockApiClient.fetch
          .mockResolvedValueOnce({ success: true, graphId: 'graph-1' })
          .mockRejectedValueOnce(new Error('Fetch failed'));

        await expect(knowledgeGraphRestApi.saveGraph('graph-1', mockGraph)).rejects.toThrow(
          'Fetch failed'
        );
      });
    });
  });

  describe('Node operations', () => {
    describe('getNodes', () => {
      it('should fetch all nodes', async () => {
        const mockNodes = {
          nodes: [createMockNode('node-1'), createMockNode('node-2')],
          count: 2,
        };
        mockApiClient.fetch.mockResolvedValue(mockNodes);

        const result = await knowledgeGraphRestApi.getNodes('graph-1');

        expect(mockApiClient.fetch).toHaveBeenCalledWith(
          '/api/knowledge-graphs-access/graph-1/nodes',
          expect.objectContaining({
            headers: expect.any(Object),
          })
        );
        expect(result).toEqual(mockNodes);
      });

      it('should fetch nodes with type filter', async () => {
        const mockNodes = {
          nodes: [createMockNode('node-1', 'Concept')],
          count: 1,
        };
        mockApiClient.fetch.mockResolvedValue(mockNodes);

        const result = await knowledgeGraphRestApi.getNodes('graph-1', { type: 'Concept' });

        expect(mockApiClient.fetch).toHaveBeenCalledWith(
          '/api/knowledge-graphs-access/graph-1/nodes?type=Concept',
          expect.objectContaining({
            headers: expect.any(Object),
          })
        );
        expect(result).toEqual(mockNodes);
      });
    });

    describe('getNode', () => {
      it('should fetch a single node by ID', async () => {
        const mockNode = createMockNode('node-1');
        mockApiClient.fetch.mockResolvedValue(mockNode);

        const result = await knowledgeGraphRestApi.getNode('graph-1', 'node-1');

        expect(mockApiClient.fetch).toHaveBeenCalledWith(
          '/api/knowledge-graphs-access/graph-1/nodes/node-1',
          expect.objectContaining({
            headers: expect.any(Object),
          })
        );
        expect(result).toEqual(mockNode);
      });
    });

    describe('createNode', () => {
      it('should create a new node', async () => {
        const mockNode = createMockNode('node-1');
        const input = {
          type: 'Concept' as NodeType,
          properties: { name: 'New Node' },
        };
        mockApiClient.fetch.mockResolvedValue(mockNode);

        const result = await knowledgeGraphRestApi.createNode('graph-1', input);

        expect(mockApiClient.fetch).toHaveBeenCalledWith(
          '/api/knowledge-graphs-access/graph-1/nodes',
          expect.objectContaining({
            method: 'POST',
            headers: expect.any(Object),
            body: JSON.stringify(input),
          })
        );
        expect(result).toEqual(mockNode);
      });
    });

    describe('updateNode', () => {
      it('should update an existing node', async () => {
        const mockNode = createMockNode('node-1');
        const input = {
          properties: { name: 'Updated Node' },
        };
        mockApiClient.fetch.mockResolvedValue(mockNode);

        const result = await knowledgeGraphRestApi.updateNode('graph-1', 'node-1', input);

        expect(mockApiClient.fetch).toHaveBeenCalledWith(
          '/api/knowledge-graphs-access/graph-1/nodes/node-1',
          expect.objectContaining({
            method: 'PUT',
            headers: expect.any(Object),
            body: JSON.stringify(input),
          })
        );
        expect(result).toEqual(mockNode);
      });
    });

    describe('deleteNode', () => {
      it('should delete a node', async () => {
        mockApiClient.fetch.mockResolvedValue(undefined);

        await knowledgeGraphRestApi.deleteNode('graph-1', 'node-1');

        expect(mockApiClient.fetch).toHaveBeenCalledWith(
          '/api/knowledge-graphs-access/graph-1/nodes/node-1',
          expect.objectContaining({
            method: 'DELETE',
            headers: expect.any(Object),
          })
        );
      });

      it('should delete a node with cascade option', async () => {
        mockApiClient.fetch.mockResolvedValue(undefined);

        await knowledgeGraphRestApi.deleteNode('graph-1', 'node-1', { cascade: true });

        expect(mockApiClient.fetch).toHaveBeenCalledWith(
          '/api/knowledge-graphs-access/graph-1/nodes/node-1?cascade=true',
          expect.objectContaining({
            method: 'DELETE',
            headers: expect.any(Object),
          })
        );
      });
    });

    describe('findNodes', () => {
      it('should find nodes with filter', async () => {
        const mockNodes = {
          nodes: [createMockNode('node-1')],
          count: 1,
        };
        const filter = { type: 'Concept', properties: { name: 'Test' } };
        mockApiClient.fetch.mockResolvedValue(mockNodes);

        const result = await knowledgeGraphRestApi.findNodes('graph-1', filter);

        expect(mockApiClient.fetch).toHaveBeenCalledWith(
          '/api/knowledge-graphs-access/graph-1/nodes/find',
          expect.objectContaining({
            method: 'POST',
            headers: expect.any(Object),
            body: JSON.stringify({ filter }),
          })
        );
        expect(result).toEqual(mockNodes);
      });
    });
  });

  describe('Relationship operations', () => {
    describe('getRelationships', () => {
      it('should fetch all relationships', async () => {
        const mockRelationships = {
          relationships: [createMockRelationship('rel-1', 'node-1', 'node-2')],
          count: 1,
        };
        mockApiClient.fetch.mockResolvedValue(mockRelationships);

        const result = await knowledgeGraphRestApi.getRelationships('graph-1');

        expect(mockApiClient.fetch).toHaveBeenCalledWith(
          '/api/knowledge-graphs-access/graph-1/relationships',
          expect.objectContaining({
            headers: expect.any(Object),
          })
        );
        expect(result).toEqual(mockRelationships);
      });

      it('should fetch relationships with filters', async () => {
        const mockRelationships = {
          relationships: [createMockRelationship('rel-1', 'node-1', 'node-2')],
          count: 1,
        };
        mockApiClient.fetch.mockResolvedValue(mockRelationships);

        const result = await knowledgeGraphRestApi.getRelationships('graph-1', {
          nodeId: 'node-1',
          direction: 'outgoing',
          type: 'hasChild',
        });

        expect(mockApiClient.fetch).toHaveBeenCalledWith(
          '/api/knowledge-graphs-access/graph-1/relationships?nodeId=node-1&direction=outgoing&type=hasChild',
          expect.objectContaining({
            headers: expect.any(Object),
          })
        );
        expect(result).toEqual(mockRelationships);
      });
    });

    describe('getNodeRelationships', () => {
      it('should fetch relationships for a specific node', async () => {
        const mockRelationships = {
          relationships: [createMockRelationship('rel-1', 'node-1', 'node-2')],
          count: 1,
        };
        mockApiClient.fetch.mockResolvedValue(mockRelationships);

        const result = await knowledgeGraphRestApi.getNodeRelationships('graph-1', 'node-1');

        expect(mockApiClient.fetch).toHaveBeenCalledWith(
          '/api/knowledge-graphs-access/graph-1/nodes/node-1/relationships',
          expect.objectContaining({
            headers: expect.any(Object),
          })
        );
        expect(result).toEqual(mockRelationships);
      });

      it('should fetch node relationships with direction and type filters', async () => {
        const mockRelationships = {
          relationships: [createMockRelationship('rel-1', 'node-1', 'node-2')],
          count: 1,
        };
        mockApiClient.fetch.mockResolvedValue(mockRelationships);

        const result = await knowledgeGraphRestApi.getNodeRelationships('graph-1', 'node-1', {
          direction: 'outgoing',
          type: 'hasChild',
        });

        expect(mockApiClient.fetch).toHaveBeenCalledWith(
          '/api/knowledge-graphs-access/graph-1/nodes/node-1/relationships?direction=outgoing&type=hasChild',
          expect.objectContaining({
            headers: expect.any(Object),
          })
        );
        expect(result).toEqual(mockRelationships);
      });
    });

    describe('createRelationship', () => {
      it('should create a new relationship', async () => {
        const mockRelationship = createMockRelationship('rel-1', 'node-1', 'node-2');
        const input = {
          source: 'node-1',
          target: 'node-2',
          type: 'hasChild' as RelationshipType,
        };
        mockApiClient.fetch.mockResolvedValue(mockRelationship);

        const result = await knowledgeGraphRestApi.createRelationship('graph-1', input);

        expect(mockApiClient.fetch).toHaveBeenCalledWith(
          '/api/knowledge-graphs-access/graph-1/relationships',
          expect.objectContaining({
            method: 'POST',
            headers: expect.any(Object),
            body: JSON.stringify(input),
          })
        );
        expect(result).toEqual(mockRelationship);
      });

      it('should create a relationship with optional fields', async () => {
        const mockRelationship = createMockRelationship('rel-1', 'node-1', 'node-2');
        const input = {
          source: 'node-1',
          target: 'node-2',
          type: 'hasChild' as RelationshipType,
          direction: 'forward' as const,
          strength: 0.8,
          metadata: { custom: 'data' },
        };
        mockApiClient.fetch.mockResolvedValue(mockRelationship);

        const result = await knowledgeGraphRestApi.createRelationship('graph-1', input);

        expect(mockApiClient.fetch).toHaveBeenCalledWith(
          '/api/knowledge-graphs-access/graph-1/relationships',
          expect.objectContaining({
            method: 'POST',
            body: JSON.stringify(input),
          })
        );
        expect(result).toEqual(mockRelationship);
      });
    });

    describe('deleteRelationship', () => {
      it('should delete a relationship', async () => {
        mockApiClient.fetch.mockResolvedValue(undefined);

        await knowledgeGraphRestApi.deleteRelationship('graph-1', 'rel-1');

        expect(mockApiClient.fetch).toHaveBeenCalledWith(
          '/api/knowledge-graphs-access/graph-1/relationships/rel-1',
          expect.objectContaining({
            method: 'DELETE',
            headers: expect.any(Object),
          })
        );
      });
    });
  });

  describe('Query operations', () => {
    describe('findPath', () => {
      it('should find a path between two nodes', async () => {
        const mockPath = {
          path: [createMockNode('node-1'), createMockNode('node-2')],
          length: 2,
        };
        mockApiClient.fetch.mockResolvedValue(mockPath);

        const result = await knowledgeGraphRestApi.findPath('graph-1', 'node-1', 'node-2');

        expect(mockApiClient.fetch).toHaveBeenCalledWith(
          '/api/knowledge-graphs-access/graph-1/path/node-1/node-2',
          expect.objectContaining({
            headers: expect.any(Object),
          })
        );
        expect(result).toEqual(mockPath);
      });

      it('should find a path with maxDepth', async () => {
        const mockPath = {
          path: [createMockNode('node-1'), createMockNode('node-2')],
          length: 2,
        };
        mockApiClient.fetch.mockResolvedValue(mockPath);

        const result = await knowledgeGraphRestApi.findPath('graph-1', 'node-1', 'node-2', 5);

        expect(mockApiClient.fetch).toHaveBeenCalledWith(
          '/api/knowledge-graphs-access/graph-1/path/node-1/node-2?maxDepth=5',
          expect.objectContaining({
            headers: expect.any(Object),
          })
        );
        expect(result).toEqual(mockPath);
      });
    });

    describe('traverse', () => {
      it('should traverse the graph from a start node', async () => {
        const mockTraverse = {
          nodes: [createMockNode('node-1'), createMockNode('node-2')],
          relationships: [createMockRelationship('rel-1', 'node-1', 'node-2')],
          depth: 1,
          visited: ['node-1', 'node-2'],
        };
        mockApiClient.fetch.mockResolvedValue(mockTraverse);

        const result = await knowledgeGraphRestApi.traverse('graph-1', 'node-1');

        expect(mockApiClient.fetch).toHaveBeenCalledWith(
          '/api/knowledge-graphs-access/graph-1/traverse/node-1',
          expect.objectContaining({
            method: 'POST',
            headers: expect.any(Object),
            body: JSON.stringify(undefined),
          })
        );
        expect(result).toEqual(mockTraverse);
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
        mockApiClient.fetch.mockResolvedValue(mockTraverse);

        const result = await knowledgeGraphRestApi.traverse('graph-1', 'node-1', options);

        expect(mockApiClient.fetch).toHaveBeenCalledWith(
          '/api/knowledge-graphs-access/graph-1/traverse/node-1',
          expect.objectContaining({
            method: 'POST',
            body: JSON.stringify(options),
          })
        );
        expect(result).toEqual(mockTraverse);
      });
    });

    describe('extractSubgraph', () => {
      it('should extract a subgraph from node IDs', async () => {
        const mockSubgraph = createMockGraph('subgraph-1');
        const nodeIds = ['node-1', 'node-2'];
        mockApiClient.fetch.mockResolvedValue(mockSubgraph);

        const result = await knowledgeGraphRestApi.extractSubgraph('graph-1', nodeIds);

        expect(mockApiClient.fetch).toHaveBeenCalledWith(
          '/api/knowledge-graphs-access/graph-1/subgraph',
          expect.objectContaining({
            method: 'POST',
            headers: expect.any(Object),
            body: JSON.stringify({ nodeIds, depth: undefined }),
          })
        );
        expect(result).toEqual(mockSubgraph);
      });

      it('should extract a subgraph with depth', async () => {
        const mockSubgraph = createMockGraph('subgraph-1');
        const nodeIds = ['node-1', 'node-2'];
        mockApiClient.fetch.mockResolvedValue(mockSubgraph);

        const result = await knowledgeGraphRestApi.extractSubgraph('graph-1', nodeIds, 2);

        expect(mockApiClient.fetch).toHaveBeenCalledWith(
          '/api/knowledge-graphs-access/graph-1/subgraph',
          expect.objectContaining({
            method: 'POST',
            body: JSON.stringify({ nodeIds, depth: 2 }),
          })
        );
        expect(result).toEqual(mockSubgraph);
      });
    });
  });
});


