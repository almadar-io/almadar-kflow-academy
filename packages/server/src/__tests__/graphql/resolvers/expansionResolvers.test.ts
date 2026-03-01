/**
 * Tests for GraphQL Expansion Resolvers
 * 
 * Resolvers for progressive expansion operations.
 */

import { expansionResolvers } from '../../../graphql/resolvers/expansionResolvers';
import type { GraphQLContext } from '../../../graphql/types';
import type { NodeBasedKnowledgeGraph } from '../../../types/nodeBasedKnowledgeGraph';
import { createGraphNode } from '../../../types/nodeBasedKnowledgeGraph';
import { createMockDecodedToken, setupFirebaseAdminMocks, resetAllMocks } from '../../testUtils.helper';

// Mock the services
jest.mock('../../../services/graphMutationService', () => {
  const mockApplyMutationBatchSafe = jest.fn();
  return {
    GraphMutationService: jest.fn().mockImplementation(() => ({
      applyMutationBatchSafe: mockApplyMutationBatchSafe,
    })),
    __mocks: {
      mockApplyMutationBatchSafe,
    },
  };
});

jest.mock('../../../services/knowledgeGraphAccess/KnowledgeGraphAccessLayer', () => {
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

jest.mock('../../../services/graphOperations', () => {
  const mockProgressiveExpandMultipleFromText = jest.fn();
  return {
    progressiveExpandMultipleFromText: mockProgressiveExpandMultipleFromText,
    __mocks: {
      mockProgressiveExpandMultipleFromText,
    },
  };
});

jest.mock('../../../graphql/resolvers/shared/resolverHelpers', () => {
  const mockGetUserId = jest.fn();
  const mockLoadGraphForOperation = jest.fn();
  const mockCreateMutationContext = jest.fn();
  const mockInferLearningGoalFromGraph = jest.fn();
  const mockVerifyGraphAccessForResolver = jest.fn();
  return {
    getUserId: mockGetUserId,
    loadGraphForOperation: mockLoadGraphForOperation,
    createMutationContext: mockCreateMutationContext,
    inferLearningGoalFromGraph: mockInferLearningGoalFromGraph,
    verifyGraphAccessForResolver: mockVerifyGraphAccessForResolver,
    __mocks: {
      mockGetUserId,
      mockLoadGraphForOperation,
      mockCreateMutationContext,
      mockInferLearningGoalFromGraph,
      mockVerifyGraphAccessForResolver,
    },
  };
});

const {
  mockApplyMutationBatchSafe,
} = require('../../../services/graphMutationService').__mocks;

const {
  mockSaveGraph,
} = require('../../../services/knowledgeGraphAccess/KnowledgeGraphAccessLayer').__mocks;

const {
  mockProgressiveExpandMultipleFromText,
} = require('../../../services/graphOperations').__mocks;

const {
  mockGetUserId,
  mockLoadGraphForOperation,
  mockCreateMutationContext,
  mockInferLearningGoalFromGraph,
  mockVerifyGraphAccessForResolver,
} = require('../../../graphql/resolvers/shared/resolverHelpers').__mocks;

describe('Expansion Resolvers', () => {
  let context: GraphQLContext;
  const uid = 'test-user-1';
  const graphId = 'test-graph-1';

  let sampleGraph: NodeBasedKnowledgeGraph;

  beforeEach(() => {
    setupFirebaseAdminMocks();
    resetAllMocks();
    jest.clearAllMocks();
    // Default: authorization passes
    mockVerifyGraphAccessForResolver.mockResolvedValue(undefined);

    context = {
      firebaseUser: createMockDecodedToken({ uid }),
    } as GraphQLContext;

    // Create sample graph
    const concept1 = createGraphNode('concept-1', 'Concept', {
      id: 'concept-1',
      name: 'React',
      description: 'A JavaScript library',
    });

    sampleGraph = {
      id: graphId,
      seedConceptId: 'concept-1',
      createdAt: 1000,
      updatedAt: 2000,
      nodes: {
        [graphId]: createGraphNode(graphId, 'Graph', { id: graphId }),
        'concept-1': concept1,
      },
      nodeTypes: {
        Graph: [graphId],
        Concept: ['concept-1'],
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

    // Setup mocks
    mockGetUserId.mockReturnValue(uid);
    mockLoadGraphForOperation.mockResolvedValue(sampleGraph);
    mockCreateMutationContext.mockReturnValue({
      graphId,
      seedConceptId: 'concept-1',
      existingNodes: sampleGraph.nodes,
      existingRelationships: sampleGraph.relationships,
    });
    mockInferLearningGoalFromGraph.mockReturnValue(undefined);
  });

  describe('progressiveExpand', () => {
    it('should expand graph with default numConcepts', async () => {
      const mockResult = {
        mutations: {
          mutations: [],
          metadata: { operation: 'progressiveExpand', timestamp: Date.now() },
        },
        content: {
          narrative: 'Expanded graph',
          concepts: [{ name: 'Component', description: 'Building block', parents: [] }],
        },
        prompt: { system: 'System prompt', user: 'User prompt' },
      };

      const updatedGraph = { ...sampleGraph, updatedAt: 3000 };
      mockProgressiveExpandMultipleFromText.mockResolvedValue(mockResult);
      mockApplyMutationBatchSafe.mockReturnValue({
        graph: updatedGraph,
        errors: [],
      });

      const result = await expansionResolvers.Mutation.progressiveExpand(
        null,
        { graphId },
        context
      );

      expect(mockGetUserId).toHaveBeenCalledWith(context);
      expect(mockLoadGraphForOperation).toHaveBeenCalledWith(uid, graphId);
      expect(mockProgressiveExpandMultipleFromText).toHaveBeenCalledWith(
        expect.objectContaining({
          graph: sampleGraph,
          numConcepts: 5, // Default
          learningGoal: undefined,
          stream: false,
        })
      );
      expect(mockSaveGraph).toHaveBeenCalledWith(uid, updatedGraph);
      expect(result.graph).toEqual(updatedGraph);
      expect(result.content).toEqual(mockResult.content);
    });

    it('should expand graph with custom numConcepts', async () => {
      const mockResult = {
        mutations: {
          mutations: [],
          metadata: { operation: 'progressiveExpand', timestamp: Date.now() },
        },
        content: {
          narrative: 'Expanded graph',
          concepts: [],
        },
        prompt: { system: 'System prompt', user: 'User prompt' },
      };

      const updatedGraph = { ...sampleGraph, updatedAt: 3000 };
      mockProgressiveExpandMultipleFromText.mockResolvedValue(mockResult);
      mockApplyMutationBatchSafe.mockReturnValue({
        graph: updatedGraph,
        errors: [],
      });

      const result = await expansionResolvers.Mutation.progressiveExpand(
        null,
        { graphId, numConcepts: 10 },
        context
      );

      expect(mockProgressiveExpandMultipleFromText).toHaveBeenCalledWith(
        expect.objectContaining({
          numConcepts: 10,
        })
      );
      expect(result.graph).toEqual(updatedGraph);
    });

    it('should handle errors from mutation application', async () => {
      const mockResult = {
        mutations: {
          mutations: [],
          metadata: { operation: 'progressiveExpand', timestamp: Date.now() },
        },
        content: {
          narrative: 'Expanded graph',
          concepts: [],
        },
        prompt: { system: 'System prompt', user: 'User prompt' },
      };

      const updatedGraph = { ...sampleGraph, updatedAt: 3000 };
      mockProgressiveExpandMultipleFromText.mockResolvedValue(mockResult);
      mockApplyMutationBatchSafe.mockReturnValue({
        graph: updatedGraph,
        errors: [{ mutation: {} as any, error: 'Test error' }],
      });

      const result = await expansionResolvers.Mutation.progressiveExpand(
        null,
        { graphId },
        context
      );

      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].error).toBe('Test error');
    });

    it('should throw error if graph not found', async () => {
      // Authorization check fails because graph doesn't exist
      const { AuthorizationError } = require('../../../types/graphAuthorization');
      const authError = new AuthorizationError('Graph test-graph-1 not found', 'NOT_FOUND', graphId, uid);
      mockVerifyGraphAccessForResolver.mockRejectedValue(authError);

      await expect(
        expansionResolvers.Mutation.progressiveExpand(null, { graphId }, context)
      ).rejects.toThrow('Graph test-graph-1 not found');
    });

    it('should throw error if unauthorized', async () => {
      const unauthorizedContext: GraphQLContext = {};
      mockGetUserId.mockImplementation(() => {
        throw new Error('Unauthorized');
      });

      await expect(
        expansionResolvers.Mutation.progressiveExpand(null, { graphId }, unauthorizedContext)
      ).rejects.toThrow('Unauthorized');
    });
  });
});

