/**
 * Tests for GraphQL Query Resolvers
 * 
 * GraphQL query resolvers for optimized graph queries.
 */

import { queryResolvers } from '../../../graphql/resolvers/queryResolvers';
import type { GraphQLContext } from '../../../graphql/types';

// Mock the query service
jest.mock('../../../services/graphQueryService', () => {
  const mockGetLearningPathsSummary = jest.fn();
  const mockGetGraphSummary = jest.fn();
  const mockGetConceptsByLayer = jest.fn();
  const mockGetConceptDetail = jest.fn();
  return {
    GraphQueryService: jest.fn().mockImplementation(() => ({
      getLearningPathsSummary: mockGetLearningPathsSummary,
      getGraphSummary: mockGetGraphSummary,
      getConceptsByLayer: mockGetConceptsByLayer,
      getConceptDetail: mockGetConceptDetail,
    })),
    __mocks: {
      mockGetLearningPathsSummary,
      mockGetGraphSummary,
      mockGetConceptsByLayer,
      mockGetConceptDetail,
    },
  };
});

// Mock resolver helpers
jest.mock('../../../graphql/resolvers/shared/resolverHelpers', () => {
  const actualHelpers = jest.requireActual('../../../graphql/resolvers/shared/resolverHelpers');
  const mockVerifyGraphAccessForResolver = jest.fn();
  return {
    ...actualHelpers,
    getUserId: jest.fn((context: GraphQLContext) => {
      if (!context.firebaseUser?.uid) {
        throw new Error('Unauthorized');
      }
      return context.firebaseUser.uid;
    }),
    verifyGraphAccessForResolver: mockVerifyGraphAccessForResolver,
    __mocks: {
      mockVerifyGraphAccessForResolver,
    },
  };
});

const { mockVerifyGraphAccessForResolver } = require('../../../graphql/resolvers/shared/resolverHelpers').__mocks;

const {
  mockGetLearningPathsSummary,
  mockGetGraphSummary,
  mockGetConceptsByLayer,
  mockGetConceptDetail,
} = require('../../../services/graphQueryService').__mocks;

describe('Query Resolvers', () => {
  const uid = 'test-user-1';
  const graphId = 'test-graph-1';
  const conceptId = 'concept-1';

  const mockContext: GraphQLContext = {
    firebaseUser: {
      uid,
      email: 'test@example.com',
    } as any,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    // Default: authorization passes
    mockVerifyGraphAccessForResolver.mockResolvedValue(undefined);
  });

  describe('learningPaths', () => {
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

      const result = await queryResolvers.Query.learningPaths(
        null,
        {},
        mockContext
      );

      expect(mockGetLearningPathsSummary).toHaveBeenCalledWith(uid);
      expect(result).toEqual(mockLearningPaths);
    });

    it('should throw error if unauthorized', async () => {
      const unauthorizedContext: GraphQLContext = {};

      await expect(
        queryResolvers.Query.learningPaths(null, {}, unauthorizedContext)
      ).rejects.toThrow('Unauthorized');
    });
  });

  describe('graphSummary', () => {
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

      const result = await queryResolvers.Query.graphSummary(
        null,
        { graphId },
        mockContext
      );

      expect(mockGetGraphSummary).toHaveBeenCalledWith(uid, graphId);
      expect(result).toEqual(mockSummary);
    });

    it('should throw error if graph not found', async () => {
      // Authorization check fails because graph doesn't exist
      const { AuthorizationError } = require('../../../types/graphAuthorization');
      const authError = new AuthorizationError('Graph test-graph-1 not found', 'NOT_FOUND', graphId, uid);
      mockVerifyGraphAccessForResolver.mockRejectedValue(authError);

      await expect(
        queryResolvers.Query.graphSummary(null, { graphId }, mockContext)
      ).rejects.toThrow('Graph test-graph-1 not found');
    });
  });

  describe('concepts', () => {
    it('should return concepts with default options', async () => {
      const mockResponse = {
        concepts: [],
        groupedByLayer: {},
        layerInfo: [],
      };

      mockGetConceptsByLayer.mockResolvedValue(mockResponse);

      const result = await queryResolvers.Query.concepts(
        null,
        { graphId },
        mockContext
      );

      expect(mockGetConceptsByLayer).toHaveBeenCalledWith(uid, graphId, {
        includeRelationships: true,
        groupByLayer: true,
      });
      expect(result).toEqual(mockResponse);
    });

    it('should respect options', async () => {
      const mockResponse = {
        concepts: [],
        layerInfo: [],
      };

      mockGetConceptsByLayer.mockResolvedValue(mockResponse);

      const result = await queryResolvers.Query.concepts(
        null,
        {
          graphId,
          includeRelationships: false,
          groupByLayer: false,
        },
        mockContext
      );

      expect(mockGetConceptsByLayer).toHaveBeenCalledWith(uid, graphId, {
        includeRelationships: false,
        groupByLayer: false,
      });
      expect(result).toEqual(mockResponse);
    });
  });

  describe('conceptDetail', () => {
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

      const result = await queryResolvers.Query.conceptDetail(
        null,
        { graphId, conceptId },
        mockContext
      );

      expect(mockGetConceptDetail).toHaveBeenCalledWith(uid, graphId, conceptId);
      expect(result).toEqual(mockDetail);
    });

    it('should throw error if concept not found', async () => {
      // Authorization passes, but concept doesn't exist
      const error = new Error('Concept concept-1 not found');
      mockGetConceptDetail.mockRejectedValue(error);

      await expect(
        queryResolvers.Query.conceptDetail(
          null,
          { graphId, conceptId },
          mockContext
        )
      ).rejects.toThrow('Concept concept-1 not found');
    });
  });
});

