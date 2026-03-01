/**
 * Tests for GraphQL Custom Operation Resolvers
 * 
 * Resolvers for custom operation (user-prompted modifications).
 */

import { customOperationResolvers } from '../../../graphql/resolvers/customOperationResolvers';
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
  const mockCustomOperation = jest.fn();
  return {
    customOperation: mockCustomOperation,
    __mocks: {
      mockCustomOperation,
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
  mockCustomOperation,
} = require('../../../services/graphOperations').__mocks;

const {
  mockGetUserId,
  mockLoadGraphForOperation,
  mockCreateMutationContext,
  mockInferLearningGoalFromGraph,
  mockVerifyGraphAccessForResolver,
} = require('../../../graphql/resolvers/shared/resolverHelpers').__mocks;

describe('Custom Operation Resolvers', () => {
  let context: GraphQLContext;
  const uid = 'test-user-1';
  const graphId = 'test-graph-1';
  const conceptId1 = 'concept-1';
  const conceptId2 = 'concept-2';

  let sampleGraph: NodeBasedKnowledgeGraph;

  beforeEach(() => {
    setupFirebaseAdminMocks();
    resetAllMocks();
    jest.clearAllMocks();
    // Default: authorization passes
    mockVerifyGraphAccessForResolver.mockResolvedValue(undefined);
    jest.clearAllMocks();

    context = {
      firebaseUser: createMockDecodedToken({ uid }),
    } as GraphQLContext;

    const concept1 = createGraphNode(conceptId1, 'Concept', {
      id: conceptId1,
      name: 'React',
    });

    const concept2 = createGraphNode(conceptId2, 'Concept', {
      id: conceptId2,
      name: 'Components',
    });

    sampleGraph = {
      id: graphId,
      seedConceptId: conceptId1,
      createdAt: 1000,
      updatedAt: 2000,
      nodes: {
        [graphId]: createGraphNode(graphId, 'Graph', { id: graphId }),
        [conceptId1]: concept1,
        [conceptId2]: concept2,
      },
      nodeTypes: {
        Graph: [graphId],
        Concept: [conceptId1, conceptId2],
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
      seedConceptId: conceptId1,
      existingNodes: sampleGraph.nodes,
      existingRelationships: sampleGraph.relationships,
    });
    mockInferLearningGoalFromGraph.mockReturnValue(undefined);
  });

  describe('customOperation', () => {
    it('should perform custom operation successfully', async () => {
      const mockResult = {
        mutations: {
          mutations: [],
          metadata: { operation: 'customOperation', timestamp: Date.now() },
        },
        content: {
          concepts: [
            { name: 'New Concept', action: 'added' },
          ],
        },
        prompt: { system: 'System prompt', user: 'User prompt' },
      };

      const updatedGraph = { ...sampleGraph, updatedAt: 3000 };
      mockCustomOperation.mockResolvedValue(mockResult);
      mockApplyMutationBatchSafe.mockReturnValue({
        graph: updatedGraph,
        errors: [],
      });

      const result = await customOperationResolvers.Mutation.customOperation(
        null,
        {
          graphId,
          targetNodeIds: [conceptId1, conceptId2],
          userPrompt: 'Add a new concept about hooks',
        },
        context
      );

      expect(mockCustomOperation).toHaveBeenCalledWith(
        expect.objectContaining({
          graph: sampleGraph,
          targetNodes: expect.arrayContaining([
            expect.objectContaining({ id: conceptId1 }),
            expect.objectContaining({ id: conceptId2 }),
          ]),
          userPrompt: 'Add a new concept about hooks',
          learningGoal: undefined,
          stream: false,
        })
      );
      expect(mockSaveGraph).toHaveBeenCalledWith(uid, updatedGraph);
      expect(result.content.concepts).toHaveLength(1);
      expect(result.content.concepts[0].name).toBe('New Concept');
    });

    it('should throw error if no valid concept nodes found', async () => {
      const graphWithoutConcepts = {
        ...sampleGraph,
        nodes: { [graphId]: sampleGraph.nodes[graphId] },
      };
      mockLoadGraphForOperation.mockResolvedValue(graphWithoutConcepts);

      await expect(
        customOperationResolvers.Mutation.customOperation(
          null,
          {
            graphId,
            targetNodeIds: [conceptId1],
            userPrompt: 'Test',
          },
          context
        )
      ).rejects.toThrow('No valid concept nodes found for custom operation');
    });

    it('should handle optional details and parentForNewConcepts', async () => {
      const mockResult = {
        mutations: {
          mutations: [],
          metadata: { operation: 'customOperation', timestamp: Date.now() },
        },
        content: {
          concepts: [],
        },
        prompt: { system: 'System prompt', user: 'User prompt' },
      };

      const updatedGraph = { ...sampleGraph, updatedAt: 3000 };
      mockCustomOperation.mockResolvedValue(mockResult);
      mockApplyMutationBatchSafe.mockReturnValue({
        graph: updatedGraph,
        errors: [],
      });

      await customOperationResolvers.Mutation.customOperation(
        null,
        {
          graphId,
          targetNodeIds: [conceptId1],
          userPrompt: 'Test',
          details: { lesson: true, flashCards: false },
          parentForNewConcepts: conceptId1,
        },
        context
      );

      expect(mockCustomOperation).toHaveBeenCalledWith(
        expect.objectContaining({
          details: { lesson: true, flashCards: false },
          parentForNewConcepts: conceptId1,
        })
      );
    });
  });
});

