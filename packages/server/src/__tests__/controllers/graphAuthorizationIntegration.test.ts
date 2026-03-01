/**
 * Integration Tests for Graph Authorization
 * 
 * Tests that authorization is properly enforced across all controllers and resolvers.
 */

import { Request, Response } from 'express';
import { progressiveExpandHandler } from '../../controllers/graphExpansionController';
import { explainConceptHandler } from '../../controllers/graphExplanationController';
import { generateGoalsHandler } from '../../controllers/graphGoalController';
import { applyMutationsHandler } from '../../controllers/graphMutationController';
import {
  createMockRequest,
  createMockResponse,
  createMockDecodedToken,
  setupFirebaseAdminMocks,
  resetAllMocks,
} from '../testUtils.helper';
import type { NodeBasedKnowledgeGraph } from '../../types/nodeBasedKnowledgeGraph';
import { createGraphNode } from '../../types/nodeBasedKnowledgeGraph';
import { AuthorizationError } from '../../types/graphAuthorization';

// Mock the graph operations service
jest.mock('../../services/graphOperations', () => {
  const mockProgressiveExpand = jest.fn();
  const mockExplain = jest.fn();
  const mockGenerateGoals = jest.fn();
  return {
    progressiveExpandMultipleFromText: mockProgressiveExpand,
    explain: mockExplain,
    generateGoals: mockGenerateGoals,
    __mocks: {
      mockProgressiveExpand,
      mockExplain,
      mockGenerateGoals,
    },
  };
});

// Mock the mutation service
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

// Mock the access layer
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

// Mock the authorization service
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

// Mock controller helpers
jest.mock('../../utils/controllerHelpers', () => {
  const actualHelpers = jest.requireActual('../../utils/controllerHelpers');
  const { mockGetGraph } = require('../../services/knowledgeGraphAccess/KnowledgeGraphAccessLayer').__mocks;
  const { mockVerifyGraphAccess } = require('../../services/graphAuthorizationService').__mocks;
  
  return {
    ...actualHelpers,
    loadGraphForOperation: async (uid: string, graphId: string) => {
      const graph = await mockGetGraph(uid, graphId);
      if (!graph) {
        throw new Error(`Graph ${graphId} not found`);
      }
      return graph;
    },
    verifyGraphAccess: async (uid: string, graphId: string, operation: string) => {
      await mockVerifyGraphAccess(uid, graphId, operation);
    },
  };
});

const {
  mockProgressiveExpand,
  mockExplain,
  mockGenerateGoals,
} = require('../../services/graphOperations').__mocks;

const { mockApplyMutationBatchSafe } = require('../../services/graphMutationService').__mocks;
const { mockGetGraph, mockSaveGraph } = require('../../services/knowledgeGraphAccess/KnowledgeGraphAccessLayer').__mocks;
const { mockVerifyGraphAccess } = require('../../services/graphAuthorizationService').__mocks;

describe('Graph Authorization Integration', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;

  const ownerUid = 'owner-user-1';
  const otherUserUid = 'other-user-1';
  const graphId = 'test-graph-1';
  const nodeId1 = 'concept-1';

  let sampleGraph: NodeBasedKnowledgeGraph;

  beforeEach(() => {
    setupFirebaseAdminMocks();
    resetAllMocks();
    jest.clearAllMocks();

    // Create sample graph
    sampleGraph = {
      id: graphId,
      seedConceptId: nodeId1,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      nodes: {
        [graphId]: createGraphNode(graphId, 'Graph', { id: graphId, name: 'Test Graph' }),
        [nodeId1]: createGraphNode(nodeId1, 'Concept', { id: nodeId1, name: 'React' }),
      },
      nodeTypes: {
        Graph: [graphId],
        Concept: [nodeId1],
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

    mockRequest = createMockRequest({
      firebaseUser: createMockDecodedToken({ uid: ownerUid }),
      params: { graphId },
    });

    mockResponse = createMockResponse();

    // Setup default mocks for authorized access
    mockGetGraph.mockResolvedValue(sampleGraph);
    mockSaveGraph.mockResolvedValue(undefined);
    mockApplyMutationBatchSafe.mockImplementation((graph: NodeBasedKnowledgeGraph) => ({
      graph,
      errors: [],
    }));
    mockVerifyGraphAccess.mockResolvedValue(undefined); // No error = access granted
  });

  describe('Authorization Enforcement', () => {
    it('should verify graph access before progressive expansion', async () => {
      const mockResult = {
        mutations: { mutations: [], metadata: { operation: 'progressiveExpand', timestamp: Date.now() } },
        content: {
          narrative: 'Expanded graph',
          concepts: [],
        },
      };

      mockProgressiveExpand.mockResolvedValue(mockResult);
      (mockRequest as any).body = { numConcepts: 5 };
      (mockRequest as any).query = { stream: 'false' };

      await progressiveExpandHandler(
        mockRequest as Request<{ graphId: string }>,
        mockResponse as Response
      );

      expect(mockVerifyGraphAccess).toHaveBeenCalledWith(ownerUid, graphId, 'write');
    });

    it('should reject unauthorized access to progressive expansion', async () => {
      mockVerifyGraphAccess.mockRejectedValue(
        new AuthorizationError('Access denied', 'FORBIDDEN', graphId, otherUserUid)
      );

      (mockRequest as any).body = { numConcepts: 5 };
      (mockRequest as any).query = { stream: 'false' };
      (mockRequest as any).firebaseUser = createMockDecodedToken({ uid: otherUserUid });

      await progressiveExpandHandler(
        mockRequest as Request<{ graphId: string }>,
        mockResponse as Response
      );

      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.stringContaining('Access denied'),
          code: 'FORBIDDEN',
        })
      );
    });

    it('should verify graph access before explain concept', async () => {
      const mockResult = {
        mutations: { mutations: [], metadata: { operation: 'explain', timestamp: Date.now() } },
        content: {
          lesson: 'React is a JavaScript library',
          prerequisites: [],
        },
      };

      mockExplain.mockResolvedValue(mockResult);
      (mockRequest as any).body = { targetNodeId: nodeId1 };
      (mockRequest as any).query = { stream: 'false' };

      await explainConceptHandler(
        mockRequest as Request<{ graphId: string }>,
        mockResponse as Response
      );

      expect(mockVerifyGraphAccess).toHaveBeenCalledWith(ownerUid, graphId, 'write');
    });

    it('should reject unauthorized access to explain concept', async () => {
      mockVerifyGraphAccess.mockRejectedValue(
        new AuthorizationError('Graph not found', 'NOT_FOUND', graphId, otherUserUid)
      );

      (mockRequest as any).body = { targetNodeId: nodeId1 };
      (mockRequest as any).query = { stream: 'false' };
      (mockRequest as any).firebaseUser = createMockDecodedToken({ uid: otherUserUid });

      await explainConceptHandler(
        mockRequest as Request<{ graphId: string }>,
        mockResponse as Response
      );

      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.stringContaining('not found'),
          code: 'NOT_FOUND',
        })
      );
    });

    it('should verify graph access before generate goals', async () => {
      const mockResult = {
        mutations: { mutations: [], metadata: { operation: 'generateGoals', timestamp: Date.now() } },
        content: {
          goal: {} as any,
        },
      };

      mockGenerateGoals.mockResolvedValue(mockResult);
      (mockRequest as any).body = {
        anchorAnswer: 'I want to learn React',
        questionAnswers: [],
      };
      (mockRequest as any).query = { stream: 'false' };

      await generateGoalsHandler(
        mockRequest as Request<{ graphId: string }>,
        mockResponse as Response
      );

      expect(mockVerifyGraphAccess).toHaveBeenCalledWith(ownerUid, graphId, 'write');
    });

    it('should verify graph access before applying mutations', async () => {
      const mutations = {
        mutations: [],
        metadata: { operation: 'test', timestamp: Date.now() },
      };

      (mockRequest as any).body = { mutations };

      await applyMutationsHandler(
        mockRequest as Request<{ graphId: string }>,
        mockResponse as Response
      );

      expect(mockVerifyGraphAccess).toHaveBeenCalledWith(ownerUid, graphId, 'write');
    });

    it('should reject unauthorized access to apply mutations', async () => {
      mockVerifyGraphAccess.mockRejectedValue(
        new AuthorizationError('Access denied', 'FORBIDDEN', graphId, otherUserUid)
      );

      const mutations = {
        mutations: [],
        metadata: { operation: 'test', timestamp: Date.now() },
      };

      (mockRequest as any).body = { mutations };
      (mockRequest as any).firebaseUser = createMockDecodedToken({ uid: otherUserUid });

      await applyMutationsHandler(
        mockRequest as Request<{ graphId: string }>,
        mockResponse as Response
      );

      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.stringContaining('Access denied'),
          code: 'FORBIDDEN',
        })
      );
    });
  });

  describe('Authorization Error Handling', () => {
    it('should handle NOT_FOUND errors correctly', async () => {
      mockVerifyGraphAccess.mockRejectedValue(
        new AuthorizationError('Graph not found', 'NOT_FOUND', graphId, ownerUid)
      );

      (mockRequest as any).body = { numConcepts: 5 };
      (mockRequest as any).query = { stream: 'false' };

      await progressiveExpandHandler(
        mockRequest as Request<{ graphId: string }>,
        mockResponse as Response
      );

      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          code: 'NOT_FOUND',
        })
      );
    });

    it('should handle FORBIDDEN errors correctly', async () => {
      mockVerifyGraphAccess.mockRejectedValue(
        new AuthorizationError('Access denied', 'FORBIDDEN', graphId, otherUserUid)
      );

      (mockRequest as any).body = { numConcepts: 5 };
      (mockRequest as any).query = { stream: 'false' };
      (mockRequest as any).firebaseUser = createMockDecodedToken({ uid: otherUserUid });

      await progressiveExpandHandler(
        mockRequest as Request<{ graphId: string }>,
        mockResponse as Response
      );

      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          code: 'FORBIDDEN',
        })
      );
    });
  });
});

