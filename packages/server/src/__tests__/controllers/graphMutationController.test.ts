/**
 * Tests for GraphMutationController
 * 
 * REST API endpoints for directly applying mutations to NodeBasedKnowledgeGraph.
 */

import { Request, Response } from 'express';
import {
  applyMutationsHandler,
  validateMutationsHandler,
} from '../../controllers/graphMutationController';
import type { NodeBasedKnowledgeGraph } from '../../types/nodeBasedKnowledgeGraph';
import type { MutationBatch } from '../../types/mutations';
import { createGraphNode, createRelationship } from '../../types/nodeBasedKnowledgeGraph';
import {
  createMockRequest,
  createMockResponse,
  createMockDecodedToken,
  setupFirebaseAdminMocks,
  resetAllMocks,
} from '../testUtils.helper';

// Mock the services
jest.mock('../../services/graphMutationService', () => {
  const mockApplyMutationBatchSafe = jest.fn();
  const mockValidateMutation = jest.fn();
  return {
    GraphMutationService: jest.fn().mockImplementation(() => ({
      applyMutationBatchSafe: mockApplyMutationBatchSafe,
      validateMutation: mockValidateMutation,
    })),
    __mocks: {
      mockApplyMutationBatchSafe,
      mockValidateMutation,
    },
  };
});

jest.mock('../../services/knowledgeGraphAccess/KnowledgeGraphAccessLayer', () => {
  const mockGetGraph = jest.fn();
  const mockSaveGraph = jest.fn();
  return {
    KnowledgeGraphAccessLayer: jest.fn().mockImplementation(() => ({
      getGraph: mockGetGraph,
      saveGraph: mockSaveGraph,
    })),
    __mocks: {
      mockGetGraph,
      mockSaveGraph,
    },
  };
});

jest.mock('../../services/graphAuthorizationService', () => {
  const mockVerifyGraphAccess = jest.fn();
  return {
    GraphAuthorizationService: jest.fn().mockImplementation(() => ({
      verifyGraphAccess: mockVerifyGraphAccess,
    })),
    __mocks: {
      mockVerifyGraphAccess,
    },
  };
});

// Import mocks for use in tests
const {
  mockApplyMutationBatchSafe,
  mockValidateMutation,
} = require('../../services/graphMutationService').__mocks;

const {
  mockGetGraph,
  mockSaveGraph,
} = require('../../services/knowledgeGraphAccess/KnowledgeGraphAccessLayer').__mocks;

const { mockVerifyGraphAccess } = require('../../services/graphAuthorizationService').__mocks;

describe('GraphMutationController', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;

  const uid = 'test-user-1';
  const graphId = 'test-graph-1';
  const nodeId1 = 'concept-1';
  const nodeId2 = 'concept-2';

  let sampleGraph: NodeBasedKnowledgeGraph;

  beforeEach(() => {
    setupFirebaseAdminMocks();
    resetAllMocks();
    jest.clearAllMocks();

    // Create sample graph
    const node1 = createGraphNode(nodeId1, 'Concept', {
      id: nodeId1,
      name: 'React',
      description: 'A JavaScript library',
    });
    const node2 = createGraphNode(nodeId2, 'Concept', {
      id: nodeId2,
      name: 'JavaScript',
      description: 'Programming language',
    });
    const graphNode = createGraphNode(graphId, 'Graph', {
      id: graphId,
      name: 'Test Graph',
      seedConceptId: nodeId1,
    });

    sampleGraph = {
      id: graphId,
      seedConceptId: nodeId1,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      version: 1,
      nodes: {
        [graphId]: graphNode,
        [nodeId1]: node1,
        [nodeId2]: node2,
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
      ],
    };

    // Reset all mocks
    mockApplyMutationBatchSafe.mockClear();
    mockValidateMutation.mockClear();
    mockGetGraph.mockClear();
    mockSaveGraph.mockClear();
    mockVerifyGraphAccess.mockClear();

    // Setup default return values
    mockGetGraph.mockResolvedValue(sampleGraph);
    mockSaveGraph.mockImplementation(async (uid: string, graph: any, version?: number) => graph); // Return the graph that was saved
    mockVerifyGraphAccess.mockResolvedValue(undefined); // No error = access granted

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

  describe('POST /api/knowledge-graphs-access/:graphId/mutations', () => {
    it('should apply mutations successfully', async () => {
      const updatedGraph = { ...sampleGraph, updatedAt: Date.now() };
      const mutations: MutationBatch = {
        mutations: [
          {
            type: 'update_node',
            nodeId: nodeId1,
            properties: { description: 'Updated' },
          },
        ],
        metadata: {
          operation: 'test',
          timestamp: Date.now(),
        },
      };

      (mockRequest as any).params = { graphId };
      (mockRequest as any).body = { mutations };

      mockApplyMutationBatchSafe.mockReturnValue({
        graph: updatedGraph,
        errors: [],
      });

      await applyMutationsHandler(
        mockRequest as any,
        mockResponse as Response
      );

      expect(mockGetGraph).toHaveBeenCalledWith(uid, graphId);
      expect(mockApplyMutationBatchSafe).toHaveBeenCalledWith(
        sampleGraph,
        mutations
      );
      expect(mockSaveGraph).toHaveBeenCalledWith(uid, updatedGraph, sampleGraph.version);
      // Note: saveGraph now takes (uid, graph, expectedVersion) for optimistic locking
      expect(mockResponse.json).toHaveBeenCalledWith(expect.objectContaining({
        id: updatedGraph.id,
      }));
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should return 400 if mutations array is missing', async () => {
      (mockRequest as any).params = { graphId };
      (mockRequest as any).body = {};

      await applyMutationsHandler(
        mockRequest as any,
        mockResponse as Response
      );

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Invalid mutations: mutations array is required',
      });
    });

    it('should return 401 if unauthorized', async () => {
      (mockRequest as any).firebaseUser = undefined;
      (mockRequest as any).params = { graphId };
      (mockRequest as any).body = {
        mutations: {
          mutations: [],
        },
      };

      await applyMutationsHandler(
        mockRequest as any,
        mockResponse as Response
      );

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: 'Unauthorized' });
    });

    it('should return 404 if graph not found', async () => {
      mockGetGraph.mockResolvedValue(null);
      (mockRequest as any).params = { graphId };
      (mockRequest as any).body = {
        mutations: {
          mutations: [],
        },
      };

      await applyMutationsHandler(
        mockRequest as any,
        mockResponse as Response
      );

      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: `Graph ${graphId} not found`,
      });
    });

    it('should handle errors gracefully', async () => {
      (mockRequest as any).params = { graphId };
      (mockRequest as any).body = {
        mutations: {
          mutations: [],
        },
      };
      mockGetGraph.mockRejectedValue(new Error('Database error'));

      await applyMutationsHandler(
        mockRequest as any,
        mockResponse as Response
      );

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Failed to apply mutations',
        details: 'Database error',
      });
    });
  });

  describe('POST /api/knowledge-graphs-access/:graphId/mutations/validate', () => {
    it('should validate mutations successfully', async () => {
      const mutations: MutationBatch = {
        mutations: [
          {
            type: 'update_node',
            nodeId: nodeId1,
            properties: { description: 'Updated' },
          },
        ],
        metadata: {
          operation: 'test',
          timestamp: Date.now(),
        },
      };

      (mockRequest as any).params = { graphId };
      (mockRequest as any).body = { mutations };

      mockValidateMutation.mockReturnValue(true);

      await validateMutationsHandler(
        mockRequest as any,
        mockResponse as Response
      );

      expect(mockGetGraph).toHaveBeenCalledWith(uid, graphId);
      expect(mockValidateMutation).toHaveBeenCalled();
      expect(mockResponse.json).toHaveBeenCalledWith({
        valid: true,
        errors: [],
      });
    });

    it('should return validation errors for invalid mutations', async () => {
      const mutations: MutationBatch = {
        mutations: [
          {
            type: 'update_node',
            nodeId: 'non-existent',
            properties: { description: 'Updated' },
          },
        ],
        metadata: {
          operation: 'test',
          timestamp: Date.now(),
        },
      };

      (mockRequest as any).params = { graphId };
      (mockRequest as any).body = { mutations };

      mockValidateMutation.mockReturnValue(false);

      await validateMutationsHandler(
        mockRequest as any,
        mockResponse as Response
      );

      expect(mockResponse.json).toHaveBeenCalledWith({
        valid: false,
        errors: expect.arrayContaining([
          expect.objectContaining({
            mutation: expect.any(Object),
            error: 'Validation failed',
          }),
        ]),
      });
    });

    it('should return 400 if mutations array is missing', async () => {
      (mockRequest as any).params = { graphId };
      (mockRequest as any).body = {};

      await validateMutationsHandler(
        mockRequest as any,
        mockResponse as Response
      );

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Invalid mutations: mutations array is required',
      });
    });

    it('should return 401 if unauthorized', async () => {
      (mockRequest as any).firebaseUser = undefined;
      (mockRequest as any).params = { graphId };
      (mockRequest as any).body = {
        mutations: {
          mutations: [],
        },
      };

      await validateMutationsHandler(
        mockRequest as any,
        mockResponse as Response
      );

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: 'Unauthorized' });
    });

    it('should return 404 if graph not found', async () => {
      mockGetGraph.mockResolvedValue(null);
      (mockRequest as any).params = { graphId };
      (mockRequest as any).body = {
        mutations: {
          mutations: [],
        },
      };

      await validateMutationsHandler(
        mockRequest as any,
        mockResponse as Response
      );

      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: `Graph ${graphId} not found`,
      });
    });
  });

  describe('update node isExpanded property', () => {
    it('should update isExpanded property on a node', async () => {
      const testGraphId = 'test-graph-id';
      const testNodeId = 'concept-1';
      const testUid = 'test-user-id';

      const existingGraph: NodeBasedKnowledgeGraph = {
        id: testGraphId,
        seedConceptId: testNodeId,
        version: 1,
        createdAt: 1000,
        updatedAt: 2000,
        nodes: {
          [testGraphId]: createGraphNode(testGraphId, 'Graph', { id: testGraphId }),
          [testNodeId]: createGraphNode(testNodeId, 'Concept', {
            id: testNodeId,
            name: 'Test Concept',
            isExpanded: false,
          }),
        },
        nodeTypes: {
          Graph: [testGraphId],
          Concept: [testNodeId],
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
      };

      const updatedGraph: NodeBasedKnowledgeGraph = {
        ...existingGraph,
        version: 2,
        updatedAt: 3000,
        nodes: {
          ...existingGraph.nodes,
          [testNodeId]: {
            ...existingGraph.nodes[testNodeId],
            properties: {
              ...existingGraph.nodes[testNodeId].properties,
              isExpanded: true,
            },
            updatedAt: 3000,
          },
        },
      };

      const mutations: MutationBatch = {
        mutations: [
          {
            type: 'update_node',
            nodeId: testNodeId,
            properties: {
              isExpanded: true,
            },
          },
        ],
      };

      (mockRequest as any).params = { graphId: testGraphId };
      (mockRequest as any).body = { mutations };
      const decodedToken = createMockDecodedToken({ uid: testUid });
      (mockRequest as any).firebaseUser = decodedToken;

      mockGetGraph.mockResolvedValue(existingGraph);
      mockApplyMutationBatchSafe.mockReturnValue({
        graph: updatedGraph,
        errors: [],
      });
      mockSaveGraph.mockResolvedValue(updatedGraph);

      await applyMutationsHandler(
        mockRequest as any,
        mockResponse as Response
      );

      expect(mockGetGraph).toHaveBeenCalledWith(testUid, testGraphId);
      expect(mockApplyMutationBatchSafe).toHaveBeenCalledWith(
        existingGraph,
        mutations
      );
      expect(mockSaveGraph).toHaveBeenCalledWith(testUid, updatedGraph, 1);
      expect(mockResponse.json).toHaveBeenCalledWith(updatedGraph);
      expect(mockResponse.status).not.toHaveBeenCalled();
    });
  });
});

