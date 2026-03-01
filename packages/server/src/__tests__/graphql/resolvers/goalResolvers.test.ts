/**
 * Tests for GraphQL Goal Resolvers
 * 
 * Resolvers for goal generation operations.
 */

import { goalResolvers } from '../../../graphql/resolvers/goalResolvers';
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
  const mockGenerateGoals = jest.fn();
  return {
    generateGoals: mockGenerateGoals,
    __mocks: {
      mockGenerateGoals,
    },
  };
});

jest.mock('../../../graphql/resolvers/shared/resolverHelpers', () => {
  const mockGetUserId = jest.fn();
  const mockLoadGraphForOperation = jest.fn();
  const mockCreateMutationContext = jest.fn();
  const mockVerifyGraphAccessForResolver = jest.fn();
  return {
    getUserId: mockGetUserId,
    loadGraphForOperation: mockLoadGraphForOperation,
    createMutationContext: mockCreateMutationContext,
    verifyGraphAccessForResolver: mockVerifyGraphAccessForResolver,
    __mocks: {
      mockGetUserId,
      mockLoadGraphForOperation,
      mockCreateMutationContext,
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
  mockGenerateGoals,
} = require('../../../services/graphOperations').__mocks;

const {
  mockGetUserId,
  mockLoadGraphForOperation,
  mockCreateMutationContext,
  mockVerifyGraphAccessForResolver,
} = require('../../../graphql/resolvers/shared/resolverHelpers').__mocks;

describe('Goal Resolvers', () => {
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

    sampleGraph = {
      id: graphId,
      seedConceptId: 'concept-1',
      createdAt: 1000,
      updatedAt: 2000,
      nodes: {
        [graphId]: createGraphNode(graphId, 'Graph', { id: graphId }),
      },
      nodeTypes: {
        Graph: [graphId],
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
      relationships: [],
    };

    mockGetUserId.mockReturnValue(uid);
    mockLoadGraphForOperation.mockResolvedValue(sampleGraph);
    mockCreateMutationContext.mockReturnValue({
      graphId,
      seedConceptId: 'concept-1',
      existingNodes: sampleGraph.nodes,
      existingRelationships: sampleGraph.relationships,
    });
  });

  describe('generateGoals', () => {
    it('should generate goals successfully', async () => {
      const mockGoal = {
        id: 'goal-1',
        title: 'Learn React',
        description: 'Master React framework',
        type: 'skill' as const,
        milestones: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      const mockResult = {
        mutations: {
          mutations: [],
          metadata: { operation: 'generateGoals', timestamp: Date.now() },
        },
        content: {
          goal: mockGoal,
        },
        prompt: { system: 'System prompt', user: 'User prompt' },
      };

      const updatedGraph = { ...sampleGraph, updatedAt: 3000 };
      mockGenerateGoals.mockResolvedValue(mockResult);
      mockApplyMutationBatchSafe.mockReturnValue({
        graph: updatedGraph,
        errors: [],
      });

      const result = await goalResolvers.Mutation.generateGoals(
        null,
        {
          graphId,
          anchorAnswer: 'I want to learn React',
          questionAnswers: [
            { questionId: 'q1', answer: '6 months' },
          ],
        },
        context
      );

      expect(mockGenerateGoals).toHaveBeenCalledWith(
        expect.objectContaining({
          graph: sampleGraph,
          anchorAnswer: 'I want to learn React',
          questionAnswers: [{ questionId: 'q1', answer: '6 months' }],
          stream: false,
        })
      );
      expect(mockSaveGraph).toHaveBeenCalledWith(uid, updatedGraph);
      expect(result.content.goal.title).toBe('Learn React');
    });

    it('should handle errors from mutation application', async () => {
      const mockResult = {
        mutations: {
          mutations: [],
          metadata: { operation: 'generateGoals', timestamp: Date.now() },
        },
        content: {
          goal: {} as any,
        },
        prompt: { system: 'System prompt', user: 'User prompt' },
      };

      const updatedGraph = { ...sampleGraph, updatedAt: 3000 };
      mockGenerateGoals.mockResolvedValue(mockResult);
      mockApplyMutationBatchSafe.mockReturnValue({
        graph: updatedGraph,
        errors: [{ mutation: {} as any, error: 'Test error' }],
      });

      const result = await goalResolvers.Mutation.generateGoals(
        null,
        {
          graphId,
          anchorAnswer: 'I want to learn React',
          questionAnswers: [],
        },
        context
      );

      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].error).toBe('Test error');
    });
  });
});

