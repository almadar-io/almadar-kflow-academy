/**
 * Tests for GraphQL Explanation Resolvers
 * 
 * Resolvers for explanation and Q&A operations.
 */

import { explanationResolvers } from '../../../graphql/resolvers/explanationResolvers';
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
  const mockExplain = jest.fn();
  const mockAnswerQuestion = jest.fn();
  return {
    explain: mockExplain,
    answerQuestion: mockAnswerQuestion,
    __mocks: {
      mockExplain,
      mockAnswerQuestion,
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
  mockExplain,
  mockAnswerQuestion,
} = require('../../../services/graphOperations').__mocks;

const {
  mockGetUserId,
  mockLoadGraphForOperation,
  mockCreateMutationContext,
  mockInferLearningGoalFromGraph,
  mockVerifyGraphAccessForResolver,
} = require('../../../graphql/resolvers/shared/resolverHelpers').__mocks;

describe('Explanation Resolvers', () => {
  let context: GraphQLContext;
  const uid = 'test-user-1';
  const graphId = 'test-graph-1';
  const conceptId = 'concept-1';

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

    const concept = createGraphNode(conceptId, 'Concept', {
      id: conceptId,
      name: 'React',
      description: 'A JavaScript library',
    });

    sampleGraph = {
      id: graphId,
      seedConceptId: conceptId,
      createdAt: 1000,
      updatedAt: 2000,
      nodes: {
        [graphId]: createGraphNode(graphId, 'Graph', { id: graphId }),
        [conceptId]: concept,
      },
      nodeTypes: {
        Graph: [graphId],
        Concept: [conceptId],
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
      seedConceptId: conceptId,
      targetNodeId: conceptId,
      existingNodes: sampleGraph.nodes,
      existingRelationships: sampleGraph.relationships,
    });
    mockInferLearningGoalFromGraph.mockReturnValue(undefined);
  });

  describe('explainConcept', () => {
    it('should explain concept successfully', async () => {
      const mockResult = {
        mutations: {
          mutations: [],
          metadata: { operation: 'explain', timestamp: Date.now() },
        },
        content: {
          lesson: '# React Lesson\n\nLearn React...',
          prerequisites: [],
        },
        prompt: { system: 'System prompt', user: 'User prompt' },
      };

      const updatedGraph = { ...sampleGraph, updatedAt: 3000 };
      mockExplain.mockResolvedValue(mockResult);
      mockApplyMutationBatchSafe.mockReturnValue({
        graph: updatedGraph,
        errors: [],
      });

      const result = await explanationResolvers.Mutation.explainConcept(
        null,
        { graphId, targetNodeId: conceptId },
        context
      );

      expect(mockExplain).toHaveBeenCalledWith(
        expect.objectContaining({
          graph: sampleGraph,
          targetNodeId: conceptId,
          learningGoal: undefined,
          stream: false,
        })
      );
      expect(mockSaveGraph).toHaveBeenCalledWith(uid, updatedGraph);
      expect(result.content.lesson).toContain('React Lesson');
    });

    it('should throw error if concept not found', async () => {
      const graphWithoutConcept = {
        ...sampleGraph,
        nodes: { [graphId]: sampleGraph.nodes[graphId] },
      };
      mockLoadGraphForOperation.mockResolvedValue(graphWithoutConcept);

      await expect(
        explanationResolvers.Mutation.explainConcept(
          null,
          { graphId, targetNodeId: conceptId },
          context
        )
      ).rejects.toThrow(`Concept node ${conceptId} not found`);
    });
  });

  describe('answerQuestion', () => {
    it('should answer question successfully (ephemeral)', async () => {
      const mockResult = {
        mutations: {
          mutations: [], // Empty because storeQA is false
          metadata: { operation: 'answerQuestion', timestamp: Date.now() },
        },
        content: {
          answer: 'React is a JavaScript library for building user interfaces.',
        },
        prompt: { system: 'System prompt', user: 'User prompt' },
      };

      mockAnswerQuestion.mockResolvedValue(mockResult);
      mockApplyMutationBatchSafe.mockReturnValue({
        graph: sampleGraph,
        errors: [],
      });

      const result = await explanationResolvers.Mutation.answerQuestion(
        null,
        { graphId, targetNodeId: conceptId, question: 'What is React?' },
        context
      );

      expect(mockAnswerQuestion).toHaveBeenCalledWith(
        expect.objectContaining({
          graph: sampleGraph,
          targetNodeId: conceptId,
          question: 'What is React?',
          storeQA: false,
          stream: false,
        })
      );
      expect(mockSaveGraph).not.toHaveBeenCalled(); // No mutations, so no save
      expect(result.content.answer).toContain('React is a JavaScript library');
      expect(result.graph).toEqual(sampleGraph); // Original graph returned
    });

    it('should throw error if concept not found', async () => {
      const graphWithoutConcept = {
        ...sampleGraph,
        nodes: { [graphId]: sampleGraph.nodes[graphId] },
      };
      mockLoadGraphForOperation.mockResolvedValue(graphWithoutConcept);

      await expect(
        explanationResolvers.Mutation.answerQuestion(
          null,
          { graphId, targetNodeId: conceptId, question: 'What is React?' },
          context
        )
      ).rejects.toThrow(`Concept node ${conceptId} not found`);
    });
  });
});

