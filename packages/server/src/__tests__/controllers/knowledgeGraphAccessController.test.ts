/**
 * Integration Tests for Knowledge Graph Access Controller
 * 
 * Tests all REST API endpoints for querying and mutating NodeBasedKnowledgeGraph
 */

import { Request, Response } from 'express';
import {
  getGraphHandler,
  saveGraphHandler,
  getNodesHandler,
  getNodeHandler,
  createNodeHandler,
  updateNodeHandler,
  deleteNodeHandler,
  getRelationshipsHandler,
  getNodeRelationshipsHandler,
  createRelationshipHandler,
  deleteRelationshipHandler,
  findPathHandler,
  traverseHandler,
  extractSubgraphHandler,
  findNodesHandler,
} from '../../controllers/knowledgeGraphAccessController';
import type { NodeBasedKnowledgeGraph, GraphNode, Relationship } from '../../types/nodeBasedKnowledgeGraph';
import { createGraphNode, createRelationship } from '../../types/nodeBasedKnowledgeGraph';
import {
  createMockRequest,
  createMockResponse,
  createMockDecodedToken,
  setupFirebaseAdminMocks,
  resetAllMocks,
} from '../testUtils.helper';

// Mock the KnowledgeGraphAccessLayer module
jest.mock('../../services/knowledgeGraphAccess/KnowledgeGraphAccessLayer', () => {
  const mockGetGraph = jest.fn();
  const mockSaveGraph = jest.fn();
  const mockGetNode = jest.fn();
  const mockGetNodesByType = jest.fn();
  const mockFindNodes = jest.fn();
  const mockCreateNode = jest.fn();
  const mockUpdateNode = jest.fn();
  const mockDeleteNode = jest.fn();
  const mockGetRelationships = jest.fn();
  const mockGetRelationshipsByType = jest.fn();
  const mockCreateRelationship = jest.fn();
  const mockDeleteRelationship = jest.fn();
  const mockFindPath = jest.fn();
  const mockTraverse = jest.fn();
  const mockExtractSubgraph = jest.fn();

  return {
    KnowledgeGraphAccessLayer: jest.fn().mockImplementation(() => ({
      getGraph: mockGetGraph,
      saveGraph: mockSaveGraph,
      getNode: mockGetNode,
      getNodesByType: mockGetNodesByType,
      findNodes: mockFindNodes,
      createNode: mockCreateNode,
      updateNode: mockUpdateNode,
      deleteNode: mockDeleteNode,
      getRelationships: mockGetRelationships,
      getRelationshipsByType: mockGetRelationshipsByType,
      createRelationship: mockCreateRelationship,
      deleteRelationship: mockDeleteRelationship,
      findPath: mockFindPath,
      traverse: mockTraverse,
      extractSubgraph: mockExtractSubgraph,
      clearCache: jest.fn(),
      clearAllCache: jest.fn(),
    })),
    // Export mocks for use in tests
    __mocks: {
      mockGetGraph,
      mockSaveGraph,
      mockGetNode,
      mockGetNodesByType,
      mockFindNodes,
      mockCreateNode,
      mockUpdateNode,
      mockDeleteNode,
      mockGetRelationships,
      mockGetRelationshipsByType,
      mockCreateRelationship,
      mockDeleteRelationship,
      mockFindPath,
      mockTraverse,
      mockExtractSubgraph,
    },
  };
});

// Import mocks for use in tests
const {
  mockGetGraph,
  mockSaveGraph,
  mockGetNode,
  mockGetNodesByType,
  mockFindNodes,
  mockCreateNode,
  mockUpdateNode,
  mockDeleteNode,
  mockGetRelationships,
  mockGetRelationshipsByType,
  mockCreateRelationship,
  mockDeleteRelationship,
  mockFindPath,
  mockTraverse,
  mockExtractSubgraph,
} = require('../../services/knowledgeGraphAccess/KnowledgeGraphAccessLayer').__mocks;

describe('Knowledge Graph Access Controller - Integration Tests', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  const uid = 'test-user-1';
  const graphId = 'test-graph-1';
  const nodeId1 = 'concept-1';
  const nodeId2 = 'concept-2';
  const relId = 'rel-1';

  let sampleGraph: NodeBasedKnowledgeGraph;
  let sampleNode1: GraphNode;
  let sampleNode2: GraphNode;
  let sampleRelationship: Relationship;

  beforeEach(() => {
    setupFirebaseAdminMocks();
    resetAllMocks();
    jest.clearAllMocks();

    // Create sample nodes
    sampleNode1 = createGraphNode(nodeId1, 'Concept', {
      id: nodeId1,
      name: 'React',
      description: 'A JavaScript library',
    });
    sampleNode2 = createGraphNode(nodeId2, 'Concept', {
      id: nodeId2,
      name: 'JavaScript',
      description: 'Programming language',
    });

    // Create sample relationship
    sampleRelationship = createRelationship(
      nodeId1,
      nodeId2,
      'hasPrerequisite',
      'forward',
      0.9
    );

    // Create sample graph
    sampleGraph = {
      id: graphId,
      seedConceptId: nodeId1,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      nodes: {
        [graphId]: createGraphNode(graphId, 'Graph', {
          id: graphId,
          name: 'Test Graph',
          seedConceptId: nodeId1,
        }),
        [nodeId1]: sampleNode1,
        [nodeId2]: sampleNode2,
      },
      nodeTypes: {
        Graph: [graphId],
        Concept: [nodeId1, nodeId2],
        Layer: [],
        LearningGoal: [],
        Milestone: [],
        PracticeExercise: [],
        Lesson: [],
        ConceptMetadata: [],
        GraphMetadata: [],
        FlashCard: [],
      },
      relationships: [
        createRelationship(graphId, nodeId1, 'containsConcept', 'forward', 1.0),
        createRelationship(graphId, nodeId2, 'containsConcept', 'forward', 1.0),
        sampleRelationship,
      ],
    };

    // Setup default mocks
    mockGetGraph.mockResolvedValue(sampleGraph);
    mockGetNode.mockResolvedValue(sampleNode1);
    mockGetNodesByType.mockResolvedValue([sampleNode1, sampleNode2]);
    mockFindNodes.mockResolvedValue([sampleNode1, sampleNode2]);
    mockGetRelationships.mockResolvedValue([sampleRelationship]);
    mockGetRelationshipsByType.mockResolvedValue([sampleRelationship]);
    mockFindPath.mockResolvedValue([sampleNode1, sampleNode2]);
    mockTraverse.mockResolvedValue({
      nodes: [sampleNode2],
      relationships: [sampleRelationship],
      depth: 1,
      visited: [nodeId1, nodeId2],
    });
    mockExtractSubgraph.mockResolvedValue(sampleGraph);
    mockCreateNode.mockResolvedValue(sampleNode1);
    mockUpdateNode.mockResolvedValue(sampleNode1);
    mockCreateRelationship.mockResolvedValue(sampleRelationship);

    // Setup request/response
    const decodedToken = createMockDecodedToken({ uid });
    mockRequest = createMockRequest(
      {
        firebaseUser: decodedToken,
      },
      decodedToken
    );
    mockResponse = createMockResponse();
  });

  describe('Graph Operations', () => {
    describe('GET /api/knowledge-graphs-access/:graphId', () => {
      it('should return the graph', async () => {
        (mockRequest as any).params = { graphId };

        await getGraphHandler(mockRequest as Request, mockResponse as Response);

        expect(mockGetGraph).toHaveBeenCalledWith(uid, graphId);
        expect(mockResponse.json).toHaveBeenCalledWith(sampleGraph);
        expect(mockResponse.status).not.toHaveBeenCalled();
      });

      it('should return 401 if unauthorized', async () => {
        (mockRequest as any).firebaseUser = undefined;
        (mockRequest as any).params = { graphId };

        await getGraphHandler(mockRequest as Request, mockResponse as Response);

        expect(mockResponse.status).toHaveBeenCalledWith(401);
        expect(mockResponse.json).toHaveBeenCalledWith({ error: 'Unauthorized' });
      });

      it('should return 404 if graph not found', async () => {
        (mockRequest as any).params = { graphId };
        mockGetGraph.mockRejectedValueOnce(new Error('Graph test-graph-1 not found'));

        await getGraphHandler(mockRequest as Request, mockResponse as Response);

        expect(mockResponse.status).toHaveBeenCalledWith(404);
        expect(mockResponse.json).toHaveBeenCalledWith({
          error: 'Graph test-graph-1 not found',
        });
      });
    });

    describe('PUT /api/knowledge-graphs-access/:graphId', () => {
      it('should save the graph', async () => {
        (mockRequest as any).params = { graphId };
        (mockRequest as any).body = sampleGraph;
        
        // Mock saveGraph to return the saved graph
        mockSaveGraph.mockResolvedValue(sampleGraph);

        await saveGraphHandler(mockRequest as Request, mockResponse as Response);

        expect(mockGetGraph).toHaveBeenCalledWith(uid, graphId);
        
        // Verify saveGraph was called with correct arguments
        expect(mockSaveGraph).toHaveBeenCalled();
        const saveGraphCall = mockSaveGraph.mock.calls[0];
        expect(saveGraphCall[0]).toBe(uid);
        expect(saveGraphCall[1]).toMatchObject({ id: graphId });
        // Third argument (expectedVersion) can be undefined or a number
        expect(saveGraphCall[2] === undefined || typeof saveGraphCall[2] === 'number').toBe(true);
        
        // Get the saved graph from the mock call
        const savedGraph = saveGraphCall[1] || sampleGraph;
        expect(mockResponse.json).toHaveBeenCalledWith({ 
          success: true, 
          graphId,
          graph: savedGraph
        });
        expect(mockResponse.status).not.toHaveBeenCalled();
      });

      it('should return 400 if graph data is invalid', async () => {
        (mockRequest as any).params = { graphId };
        (mockRequest as any).body = { id: 'different-id' };

        await saveGraphHandler(mockRequest as Request, mockResponse as Response);

        expect(mockResponse.status).toHaveBeenCalledWith(400);
        expect(mockResponse.json).toHaveBeenCalledWith({ error: 'Invalid graph data' });
      });

      it('should create graph if it does not exist', async () => {
        (mockRequest as any).params = { graphId };
        (mockRequest as any).body = sampleGraph;
        
        // Mock getGraph to throw "not found" error (simulating new graph creation)
        mockGetGraph.mockRejectedValue(new Error(`Graph ${graphId} not found`));
        
        // Mock saveGraph to return the saved graph
        mockSaveGraph.mockResolvedValue(sampleGraph);

        await saveGraphHandler(mockRequest as Request, mockResponse as Response);

        // Verify getGraph was called (and failed, which is expected)
        expect(mockGetGraph).toHaveBeenCalledWith(uid, graphId);
        
        // Verify saveGraph was called with undefined expectedVersion (allows creation)
        expect(mockSaveGraph).toHaveBeenCalled();
        const saveGraphCall = mockSaveGraph.mock.calls[0];
        expect(saveGraphCall[0]).toBe(uid);
        expect(saveGraphCall[1]).toMatchObject({ id: graphId });
        expect(saveGraphCall[2]).toBeUndefined(); // expectedVersion should be undefined for new graphs
        
        expect(mockResponse.json).toHaveBeenCalledWith({ 
          success: true, 
          graphId,
          graph: sampleGraph
        });
      });
    });
  });

  describe('Node Operations', () => {
    describe('GET /api/knowledge-graphs-access/:graphId/nodes', () => {
      it('should return all nodes', async () => {
        (mockRequest as any).params = { graphId };
        (mockRequest as any).query = {};

        await getNodesHandler(mockRequest as Request, mockResponse as Response);

        expect(mockGetGraph).toHaveBeenCalledWith(uid, graphId);
        const allNodes = Object.values(sampleGraph.nodes);
        expect(mockResponse.json).toHaveBeenCalledWith({
          nodes: allNodes,
          count: allNodes.length,
        });
      });

      it('should filter nodes by type', async () => {
        (mockRequest as any).params = { graphId };
        (mockRequest as any).query = { type: 'Concept' };

        await getNodesHandler(mockRequest as Request, mockResponse as Response);

        expect(mockGetNodesByType).toHaveBeenCalledWith(uid, graphId, 'Concept');
        expect(mockResponse.json).toHaveBeenCalledWith({
          nodes: [sampleNode1, sampleNode2],
          count: 2,
        });
      });
    });

    describe('GET /api/knowledge-graphs-access/:graphId/nodes/:nodeId', () => {
      it('should return a single node', async () => {
        (mockRequest as any).params = { graphId, nodeId: nodeId1 };

        await getNodeHandler(mockRequest as Request, mockResponse as Response);

        expect(mockGetNode).toHaveBeenCalledWith(uid, graphId, nodeId1);
        expect(mockResponse.json).toHaveBeenCalledWith(sampleNode1);
      });

      it('should return 404 if node not found', async () => {
        (mockRequest as any).params = { graphId, nodeId: 'non-existent' };
        mockGetNode.mockResolvedValue(null);

        await getNodeHandler(mockRequest as Request, mockResponse as Response);

        expect(mockResponse.status).toHaveBeenCalledWith(404);
        expect(mockResponse.json).toHaveBeenCalledWith({
          error: 'Node non-existent not found',
        });
      });
    });

    describe('POST /api/knowledge-graphs-access/:graphId/nodes', () => {
      it('should create a node', async () => {
        (mockRequest as any).params = { graphId };
        (mockRequest as any).body = {
          type: 'Concept',
          properties: {
            name: 'New Concept',
            description: 'A new concept',
          },
        };

        await createNodeHandler(mockRequest as Request, mockResponse as Response);

        expect(mockCreateNode).toHaveBeenCalledWith(
          uid,
          graphId,
          expect.objectContaining({
            type: 'Concept',
            properties: expect.objectContaining({
              name: 'New Concept',
            }),
          })
        );
        expect(mockResponse.status).toHaveBeenCalledWith(201);
        expect(mockResponse.json).toHaveBeenCalledWith(sampleNode1);
      });

      it('should return 400 if type is missing', async () => {
        (mockRequest as any).params = { graphId };
        (mockRequest as any).body = { properties: {} };

        await createNodeHandler(mockRequest as Request, mockResponse as Response);

        expect(mockResponse.status).toHaveBeenCalledWith(400);
        expect(mockResponse.json).toHaveBeenCalledWith({
          error: 'type and properties are required',
        });
      });

      it('should return 409 if node already exists', async () => {
        (mockRequest as any).params = { graphId };
        (mockRequest as any).body = {
          type: 'Concept',
          properties: { id: nodeId1, name: 'Test' },
        };
        mockCreateNode.mockRejectedValue(new Error('Node already exists'));

        await createNodeHandler(mockRequest as Request, mockResponse as Response);

        expect(mockResponse.status).toHaveBeenCalledWith(409);
      });
    });

    describe('PUT /api/knowledge-graphs-access/:graphId/nodes/:nodeId', () => {
      it('should update a node', async () => {
        (mockRequest as any).params = { graphId, nodeId: nodeId1 };
        (mockRequest as any).body = { description: 'Updated description' };

        await updateNodeHandler(mockRequest as Request, mockResponse as Response);

        expect(mockUpdateNode).toHaveBeenCalledWith(
          uid,
          graphId,
          nodeId1,
          { description: 'Updated description' }
        );
        expect(mockResponse.json).toHaveBeenCalledWith(sampleNode1);
      });

      it('should return 404 if node not found', async () => {
        (mockRequest as any).params = { graphId, nodeId: 'non-existent' };
        (mockRequest as any).body = { description: 'Updated' };
        mockUpdateNode.mockRejectedValue(new Error('Node not found'));

        await updateNodeHandler(mockRequest as Request, mockResponse as Response);

        expect(mockResponse.status).toHaveBeenCalledWith(404);
      });
    });

    describe('DELETE /api/knowledge-graphs-access/:graphId/nodes/:nodeId', () => {
      it('should delete a node', async () => {
        (mockRequest as any).params = { graphId, nodeId: nodeId1 };
        (mockRequest as any).query = {};

        await deleteNodeHandler(mockRequest as Request, mockResponse as Response);

        expect(mockDeleteNode).toHaveBeenCalledWith(
          uid,
          graphId,
          nodeId1,
          { cascade: false }
        );
        expect(mockResponse.json).toHaveBeenCalledWith({ success: true, nodeId: nodeId1 });
      });

      it('should support cascade deletion', async () => {
        (mockRequest as any).params = { graphId, nodeId: nodeId1 };
        (mockRequest as any).query = { cascade: 'true' };

        await deleteNodeHandler(mockRequest as Request, mockResponse as Response);

        expect(mockDeleteNode).toHaveBeenCalledWith(
          uid,
          graphId,
          nodeId1,
          { cascade: true }
        );
      });
    });

    describe('POST /api/knowledge-graphs-access/:graphId/nodes/find', () => {
      it('should find nodes with predicate', async () => {
        (mockRequest as any).params = { graphId };
        (mockRequest as any).body = { filter: { type: 'Concept' } };

        mockFindNodes.mockResolvedValue([sampleNode1, sampleNode2]);

        await findNodesHandler(mockRequest as Request, mockResponse as Response);

        expect(mockFindNodes).toHaveBeenCalledWith(
          uid,
          graphId,
          expect.any(Function)
        );
        expect(mockResponse.json).toHaveBeenCalledWith({
          nodes: [sampleNode1, sampleNode2],
          count: 2,
        });
      });

      it('should return 400 if filter is missing', async () => {
        (mockRequest as any).params = { graphId };
        (mockRequest as any).body = {};

        await findNodesHandler(mockRequest as Request, mockResponse as Response);

        expect(mockResponse.status).toHaveBeenCalledWith(400);
        expect(mockResponse.json).toHaveBeenCalledWith({
          error: 'filter object is required',
        });
      });
    });
  });

  describe('Relationship Operations', () => {
    describe('GET /api/knowledge-graphs-access/:graphId/relationships', () => {
      it('should return all relationships', async () => {
        (mockRequest as any).params = { graphId };
        (mockRequest as any).query = {};

        await getRelationshipsHandler(mockRequest as Request, mockResponse as Response);

        expect(mockGetRelationships).toHaveBeenCalledWith(uid, graphId, undefined, undefined);
        expect(mockResponse.json).toHaveBeenCalledWith({
          relationships: [sampleRelationship],
          count: 1,
        });
      });

      it('should filter by nodeId and direction', async () => {
        (mockRequest as any).params = { graphId };
        (mockRequest as any).query = { nodeId: nodeId1, direction: 'outgoing' };

        await getRelationshipsHandler(mockRequest as Request, mockResponse as Response);

        expect(mockGetRelationships).toHaveBeenCalledWith(
          uid,
          graphId,
          nodeId1,
          'outgoing'
        );
      });

      it('should filter by type', async () => {
        (mockRequest as any).params = { graphId };
        (mockRequest as any).query = { type: 'hasPrerequisite' };

        await getRelationshipsHandler(mockRequest as Request, mockResponse as Response);

        expect(mockGetRelationshipsByType).toHaveBeenCalledWith(
          uid,
          graphId,
          'hasPrerequisite',
          undefined
        );
      });
    });

    describe('GET /api/knowledge-graphs-access/:graphId/nodes/:nodeId/relationships', () => {
      it('should return node relationships', async () => {
        (mockRequest as any).params = { graphId, nodeId: nodeId1 };
        (mockRequest as any).query = {};

        await getNodeRelationshipsHandler(mockRequest as Request, mockResponse as Response);

        expect(mockGetRelationships).toHaveBeenCalledWith(
          uid,
          graphId,
          nodeId1,
          undefined
        );
        expect(mockResponse.json).toHaveBeenCalledWith({
          relationships: [sampleRelationship],
          count: 1,
        });
      });
    });

    describe('POST /api/knowledge-graphs-access/:graphId/relationships', () => {
      it('should create a relationship', async () => {
        (mockRequest as any).params = { graphId };
        (mockRequest as any).body = {
          source: nodeId1,
          target: nodeId2,
          type: 'hasPrerequisite',
          direction: 'forward',
          strength: 0.9,
        };

        await createRelationshipHandler(mockRequest as Request, mockResponse as Response);

        expect(mockCreateRelationship).toHaveBeenCalledWith(
          uid,
          graphId,
          expect.objectContaining({
            source: nodeId1,
            target: nodeId2,
            type: 'hasPrerequisite',
          })
        );
        expect(mockResponse.status).toHaveBeenCalledWith(201);
        expect(mockResponse.json).toHaveBeenCalledWith(sampleRelationship);
      });

      it('should return 400 if required fields are missing', async () => {
        (mockRequest as any).params = { graphId };
        (mockRequest as any).body = { source: nodeId1 };

        await createRelationshipHandler(mockRequest as Request, mockResponse as Response);

        expect(mockResponse.status).toHaveBeenCalledWith(400);
        expect(mockResponse.json).toHaveBeenCalledWith({
          error: 'source, target, and type are required',
        });
      });

      it('should return 400 if nodes do not exist', async () => {
        (mockRequest as any).params = { graphId };
        (mockRequest as any).body = {
          source: nodeId1,
          target: nodeId2,
          type: 'hasPrerequisite',
        };
        mockCreateRelationship.mockRejectedValue(
          new Error('Source or target node does not exist')
        );

        await createRelationshipHandler(mockRequest as Request, mockResponse as Response);

        expect(mockResponse.status).toHaveBeenCalledWith(400);
      });
    });

    describe('DELETE /api/knowledge-graphs-access/:graphId/relationships/:relId', () => {
      it('should delete a relationship', async () => {
        (mockRequest as any).params = { graphId, relId };

        await deleteRelationshipHandler(mockRequest as Request, mockResponse as Response);

        expect(mockDeleteRelationship).toHaveBeenCalledWith(uid, graphId, relId);
        expect(mockResponse.json).toHaveBeenCalledWith({ success: true, relId });
      });

      it('should return 404 if relationship not found', async () => {
        (mockRequest as any).params = { graphId, relId: 'non-existent' };
        mockDeleteRelationship.mockRejectedValue(
          new Error('Relationship not found')
        );

        await deleteRelationshipHandler(mockRequest as Request, mockResponse as Response);

        expect(mockResponse.status).toHaveBeenCalledWith(404);
      });
    });
  });

  describe('Query Operations', () => {
    describe('GET /api/knowledge-graphs-access/:graphId/path/:from/:to', () => {
      it('should find path between nodes', async () => {
        (mockRequest as any).params = { graphId, from: nodeId1, to: nodeId2 };
        (mockRequest as any).query = {};

        await findPathHandler(mockRequest as Request, mockResponse as Response);

        expect(mockFindPath).toHaveBeenCalledWith(
          uid,
          graphId,
          nodeId1,
          nodeId2,
          undefined
        );
        expect(mockResponse.json).toHaveBeenCalledWith({
          path: [sampleNode1, sampleNode2],
          length: 2,
        });
      });

      it('should support maxDepth parameter', async () => {
        (mockRequest as any).params = { graphId, from: nodeId1, to: nodeId2 };
        (mockRequest as any).query = { maxDepth: '5' };

        await findPathHandler(mockRequest as Request, mockResponse as Response);

        expect(mockFindPath).toHaveBeenCalledWith(
          uid,
          graphId,
          nodeId1,
          nodeId2,
          5
        );
      });

      it('should return 404 if path not found', async () => {
        (mockRequest as any).params = { graphId, from: nodeId1, to: 'non-existent' };
        mockFindPath.mockRejectedValue(new Error('Path not found'));

        await findPathHandler(mockRequest as Request, mockResponse as Response);

        expect(mockResponse.status).toHaveBeenCalledWith(404);
      });
    });

    describe('POST /api/knowledge-graphs-access/:graphId/traverse/:startNodeId', () => {
      it('should traverse graph from a node', async () => {
        (mockRequest as any).params = { graphId, startNodeId: nodeId1 };
        (mockRequest as any).body = {
          relationshipTypes: ['hasPrerequisite'],
          direction: 'outgoing',
          maxDepth: 3,
          limit: 50,
        };

        await traverseHandler(mockRequest as Request, mockResponse as Response);

        expect(mockTraverse).toHaveBeenCalledWith(
          uid,
          graphId,
          nodeId1,
          {
            relationshipTypes: ['hasPrerequisite'],
            direction: 'outgoing',
            maxDepth: 3,
            limit: 50,
          }
        );
        expect(mockResponse.json).toHaveBeenCalledWith({
          nodes: [sampleNode2],
          relationships: [sampleRelationship],
          depth: 1,
          visited: [nodeId1, nodeId2],
        });
      });

      it('should return 404 if start node not found', async () => {
        (mockRequest as any).params = { graphId, startNodeId: 'non-existent' };
        (mockRequest as any).body = {};
        mockTraverse.mockRejectedValue(new Error('Node not found'));

        await traverseHandler(mockRequest as Request, mockResponse as Response);

        expect(mockResponse.status).toHaveBeenCalledWith(404);
      });
    });

    describe('POST /api/knowledge-graphs-access/:graphId/subgraph', () => {
      it('should extract subgraph', async () => {
        (mockRequest as any).params = { graphId };
        (mockRequest as any).body = {
          nodeIds: [nodeId1, nodeId2],
          depth: 2,
        };

        await extractSubgraphHandler(mockRequest as Request, mockResponse as Response);

        expect(mockExtractSubgraph).toHaveBeenCalledWith(
          uid,
          graphId,
          [nodeId1, nodeId2],
          2
        );
        expect(mockResponse.json).toHaveBeenCalledWith(sampleGraph);
      });

      it('should return 400 if nodeIds is missing', async () => {
        (mockRequest as any).params = { graphId };
        (mockRequest as any).body = {};

        await extractSubgraphHandler(mockRequest as Request, mockResponse as Response);

        expect(mockResponse.status).toHaveBeenCalledWith(400);
        expect(mockResponse.json).toHaveBeenCalledWith({
          error: 'nodeIds array is required',
        });
      });

      it('should return 400 if nodeIds is empty', async () => {
        (mockRequest as any).params = { graphId };
        (mockRequest as any).body = { nodeIds: [] };

        await extractSubgraphHandler(mockRequest as Request, mockResponse as Response);

        expect(mockResponse.status).toHaveBeenCalledWith(400);
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle 500 errors gracefully', async () => {
      (mockRequest as any).params = { graphId };
        mockGetGraph.mockRejectedValue(new Error('Database error'));

      await getGraphHandler(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Failed to get graph',
        message: 'Database error',
      });
    });
  });
});

