/**
 * Tests for GraphQueryController
 * 
 * REST API endpoints for optimized graph queries.
 */

import { Request, Response } from 'express';
import {
  getLearningPathsHandler,
  getGraphSummaryHandler,
  getConceptsHandler,
  getConceptDetailHandler,
  getMindMapHandler,
} from '../../controllers/graphQueryController';
import {
  createMockRequest,
  createMockResponse,
  createMockDecodedToken,
  setupFirebaseAdminMocks,
  resetAllMocks,
} from '../testUtils.helper';

// Mock the query service
jest.mock('../../services/graphQueryService', () => {
  const mockGetLearningPathsSummary = jest.fn();
  const mockGetGraphSummary = jest.fn();
  const mockGetConceptsByLayer = jest.fn();
  const mockGetConceptDetail = jest.fn();
  const mockGetMindMapStructure = jest.fn();
  return {
    GraphQueryService: jest.fn().mockImplementation(() => ({
      getLearningPathsSummary: mockGetLearningPathsSummary,
      getGraphSummary: mockGetGraphSummary,
      getConceptsByLayer: mockGetConceptsByLayer,
      getConceptDetail: mockGetConceptDetail,
      getMindMapStructure: mockGetMindMapStructure,
    })),
    __mocks: {
      mockGetLearningPathsSummary,
      mockGetGraphSummary,
      mockGetConceptsByLayer,
      mockGetConceptDetail,
      mockGetMindMapStructure,
    },
  };
});

const {
  mockGetLearningPathsSummary,
  mockGetGraphSummary,
  mockGetConceptsByLayer,
  mockGetConceptDetail,
  mockGetMindMapStructure,
} = require('../../services/graphQueryService').__mocks;

// Mock controller helpers to mock verifyGraphAccess
jest.mock('../../utils/controllerHelpers', () => {
  const actualHelpers = jest.requireActual('../../utils/controllerHelpers');
  const mockVerifyGraphAccess = jest.fn();
  return {
    ...actualHelpers,
    verifyGraphAccess: mockVerifyGraphAccess,
    __mocks: {
      mockVerifyGraphAccess,
    },
  };
});

const { mockVerifyGraphAccess } = require('../../utils/controllerHelpers').__mocks;

describe('GraphQueryController', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;

  const uid = 'test-user-1';
  const graphId = 'test-graph-1';
  const conceptId = 'concept-1';

  beforeEach(() => {
    setupFirebaseAdminMocks();
    resetAllMocks();
    jest.clearAllMocks();

    // Default: authorization passes
    mockVerifyGraphAccess.mockResolvedValue(undefined);

    mockRequest = createMockRequest({
      firebaseUser: createMockDecodedToken({ uid }),
    });

    mockResponse = createMockResponse();
  });

  describe('getLearningPathsHandler', () => {
    it('should return learning paths summary', async () => {
      const mockLearningPaths = [
        {
          id: graphId,
          title: 'Learn React',
          description: 'Master React',
          conceptCount: 5,
          seedConcept: { id: 'concept-1', name: 'React', description: 'A library' },
          updatedAt: 2000,
          createdAt: 1000,
        },
      ];

      mockGetLearningPathsSummary.mockResolvedValue(mockLearningPaths);

      await getLearningPathsHandler(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockGetLearningPathsSummary).toHaveBeenCalledWith(uid);
      expect(mockResponse.json).toHaveBeenCalledWith({
        learningPaths: mockLearningPaths,
      });
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should handle errors', async () => {
      const error = new Error('Service error');
      mockGetLearningPathsSummary.mockRejectedValue(error);

      await getLearningPathsHandler(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Failed to get learning paths: Service error',
      });
    });

    it('should handle unauthorized requests', async () => {
      const unauthorizedRequest = createMockRequest({});
      (unauthorizedRequest as any).firebaseUser = undefined;

      await getLearningPathsHandler(
        unauthorizedRequest as Request,
        mockResponse as Response
      );

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: expect.stringContaining('Unauthorized'),
      });
    });
  });

  describe('getGraphSummaryHandler', () => {
    it('should return graph summary', async () => {
      const mockSummary = {
        id: graphId,
        goal: {
          id: 'goal-1',
          title: 'Learn React',
          description: 'Master React',
          type: 'skill',
          target: 'intermediate',
        },
        milestones: [],
        conceptCount: 5,
        layerCount: 2,
        seedConcept: { id: 'concept-1', name: 'React' },
        updatedAt: 2000,
      };

      mockGetGraphSummary.mockResolvedValue(mockSummary);
      (mockRequest as any).params = { graphId };

      await getGraphSummaryHandler(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockGetGraphSummary).toHaveBeenCalledWith(uid, graphId);
      expect(mockResponse.json).toHaveBeenCalledWith(mockSummary);
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should return 404 if graph not found', async () => {
      // Authorization check fails because graph doesn't exist
      const { AuthorizationError } = require('../../types/graphAuthorization');
      const authError = new AuthorizationError('Graph test-graph-1 not found', 'NOT_FOUND', graphId, uid);
      mockVerifyGraphAccess.mockRejectedValue(authError);
      (mockRequest as any).params = { graphId };

      await getGraphSummaryHandler(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Graph test-graph-1 not found',
        code: 'NOT_FOUND',
        graphId,
      });
    });
  });

  describe('getConceptsHandler', () => {
    it('should return concepts with default options', async () => {
      const mockConceptsResponse = {
        concepts: [],
        groupedByLayer: {},
        layerInfo: [],
      };

      mockGetConceptsByLayer.mockResolvedValue(mockConceptsResponse);
      (mockRequest as any).params = { graphId };
      (mockRequest as any).query = {};

      await getConceptsHandler(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockGetConceptsByLayer).toHaveBeenCalledWith(uid, graphId, {
        includeRelationships: true,
        groupByLayer: true,
      });
      expect(mockResponse.json).toHaveBeenCalledWith(mockConceptsResponse);
    });

    it('should respect query parameters', async () => {
      const mockConceptsResponse = {
        concepts: [],
        layerInfo: [],
      };

      mockGetConceptsByLayer.mockResolvedValue(mockConceptsResponse);
      (mockRequest as any).params = { graphId };
      (mockRequest as any).query = {
        includeRelationships: 'false',
        groupByLayer: 'false',
      };

      await getConceptsHandler(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockGetConceptsByLayer).toHaveBeenCalledWith(uid, graphId, {
        includeRelationships: false,
        groupByLayer: false,
      });
      expect(mockResponse.json).toHaveBeenCalledWith(mockConceptsResponse);
    });
  });

  describe('getConceptDetailHandler', () => {
    it('should return concept detail', async () => {
      const mockDetail = {
        concept: {
          id: conceptId,
          name: 'React',
          description: 'A library',
          layer: 1,
          isSeed: true,
          parents: [],
          children: [],
          prerequisites: [],
          properties: {},
        },
        lesson: null,
        flashcards: [],
        metadata: null,
        relationships: {
          parents: [],
          children: [],
          prerequisites: [],
        },
      };

      mockGetConceptDetail.mockResolvedValue(mockDetail);
      (mockRequest as any).params = { graphId, conceptId };

      await getConceptDetailHandler(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockGetConceptDetail).toHaveBeenCalledWith(uid, graphId, conceptId);
      expect(mockResponse.json).toHaveBeenCalledWith(mockDetail);
    });

    it('should return 404 if concept not found', async () => {
      const error = new Error('Concept concept-1 not found');
      mockGetConceptDetail.mockRejectedValue(error);
      (mockRequest as any).params = { graphId, conceptId };

      await getConceptDetailHandler(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Concept concept-1 not found',
      });
    });
  });

  describe('getMindMapHandler', () => {
    it('should return mindmap structure', async () => {
      const mockMindMap = {
        nodes: [
          {
            id: 'seed-1',
            title: 'Scheme',
            content: 'Master Scheme programming',
            createdAt: new Date(1000),
            updatedAt: new Date(2000),
            tags: [],
            parentId: undefined,
            children: ['layer-1'],
            level: 0,
            isExpanded: true,
            nodeType: 'Concept',
          },
        ],
        seedNodeId: 'seed-1',
        totalNodes: 1,
        layerCount: 0,
        conceptCount: 1,
      };

      mockGetMindMapStructure.mockResolvedValue(mockMindMap);

      await getMindMapHandler(
        { ...mockRequest, params: { graphId }, query: {} } as any,
        mockResponse as Response
      );

      expect(mockVerifyGraphAccess).toHaveBeenCalledWith(uid, graphId, 'read');
      expect(mockGetMindMapStructure).toHaveBeenCalledWith(uid, graphId, { expandAll: false });
      expect(mockResponse.json).toHaveBeenCalledWith(mockMindMap);
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should respect expandAll query parameter', async () => {
      const mockMindMap = {
        nodes: [],
        seedNodeId: 'seed-1',
        totalNodes: 0,
        layerCount: 0,
        conceptCount: 0,
      };

      mockGetMindMapStructure.mockResolvedValue(mockMindMap);

      await getMindMapHandler(
        { ...mockRequest, params: { graphId }, query: { expandAll: 'true' } } as any,
        mockResponse as Response
      );

      expect(mockGetMindMapStructure).toHaveBeenCalledWith(uid, graphId, { expandAll: true });
    });

    it('should return 400 if graphId is missing', async () => {
      await getMindMapHandler(
        { ...mockRequest, params: {}, query: {} } as any,
        mockResponse as Response
      );

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: 'Graph ID is required' });
    });

    it('should return 404 if seed concept not found', async () => {
      const error = new Error('Seed concept not found in graph');
      mockGetMindMapStructure.mockRejectedValue(error);

      await getMindMapHandler(
        { ...mockRequest, params: { graphId }, query: {} } as any,
        mockResponse as Response
      );

      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: expect.stringContaining('Seed concept') })
      );
    });

    it('should handle authorization errors', async () => {
      const authError = new Error('Unauthorized');
      (authError as any).name = 'AuthorizationError';
      (authError as any).code = 'UNAUTHORIZED';
      mockVerifyGraphAccess.mockRejectedValue(authError);

      await getMindMapHandler(
        { ...mockRequest, params: { graphId }, query: {} } as any,
        mockResponse as Response
      );

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: 'Unauthorized', code: 'UNAUTHORIZED' })
      );
    });

    it('should handle other errors', async () => {
      const error = new Error('Internal server error');
      mockGetMindMapStructure.mockRejectedValue(error);

      await getMindMapHandler(
        { ...mockRequest, params: { graphId }, query: {} } as any,
        mockResponse as Response
      );

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: expect.stringContaining('Failed to get mindmap structure') })
      );
    });
  });
});

