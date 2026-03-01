/**
 * Tests for GraphQL Layer Practice Resolvers
 * 
 * Resolvers for layer practice generation operations.
 */

import { layerPracticeResolvers } from '../../../graphql/resolvers/layerPracticeResolvers';
import type { GraphQLContext } from '../../../graphql/types';
import type { NodeBasedKnowledgeGraph } from '../../../types/nodeBasedKnowledgeGraph';
import { createGraphNode, createRelationship } from '../../../types/nodeBasedKnowledgeGraph';
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
  const mockGenerateLayerPractice = jest.fn();
  return {
    generateLayerPractice: mockGenerateLayerPractice,
    __mocks: {
      mockGenerateLayerPractice,
    },
  };
});

jest.mock('../../../graphql/resolvers/shared/resolverHelpers', () => {
  const mockGetUserId = jest.fn();
  const mockLoadGraphForOperation = jest.fn();
  const mockCreateMutationContext = jest.fn();
  const mockInferLearningGoalFromGraph = jest.fn();
  const mockInferDifficulty = jest.fn();
  const mockInferFocus = jest.fn();
  const mockVerifyGraphAccessForResolver = jest.fn();
  return {
    getUserId: mockGetUserId,
    loadGraphForOperation: mockLoadGraphForOperation,
    createMutationContext: mockCreateMutationContext,
    inferLearningGoalFromGraph: mockInferLearningGoalFromGraph,
    inferDifficulty: mockInferDifficulty,
    inferFocus: mockInferFocus,
    verifyGraphAccessForResolver: mockVerifyGraphAccessForResolver,
    __mocks: {
      mockGetUserId,
      mockLoadGraphForOperation,
      mockCreateMutationContext,
      mockInferLearningGoalFromGraph,
      mockInferDifficulty,
      mockInferFocus,
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
  mockGenerateLayerPractice,
} = require('../../../services/graphOperations').__mocks;

const {
  mockGetUserId,
  mockLoadGraphForOperation,
  mockCreateMutationContext,
  mockInferLearningGoalFromGraph,
  mockInferDifficulty,
  mockInferFocus,
  mockVerifyGraphAccessForResolver,
} = require('../../../graphql/resolvers/shared/resolverHelpers').__mocks;

describe('Layer Practice Resolvers', () => {
  let context: GraphQLContext;
  const uid = 'test-user-1';
  const graphId = 'test-graph-1';
  const layerId = 'layer-1';
  const conceptId1 = 'concept-1';
  const conceptId2 = 'concept-2';

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

    const layer = createGraphNode(layerId, 'Layer', {
      id: layerId,
      layerNumber: 1,
      goal: 'Learn basics',
    });

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
        [layerId]: layer,
        [conceptId1]: concept1,
        [conceptId2]: concept2,
      },
      nodeTypes: {
        Graph: [graphId],
        Concept: [conceptId1, conceptId2],
        Layer: [layerId],
        LearningGoal: [],
        Milestone: [],
        PracticeExercise: [],
        Lesson: [],
        ConceptMetadata: [],
        GraphMetadata: [],
        FlashCard: [],
      },
      relationships: [
        createRelationship(layerId, conceptId1, 'containsConcept', 'forward'),
        createRelationship(layerId, conceptId2, 'containsConcept', 'forward'),
      ],
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
    mockInferDifficulty.mockReturnValue('intermediate');
    mockInferFocus.mockReturnValue(undefined);
  });

  describe('generateLayerPractice', () => {
    it('should generate layer practice successfully', async () => {
      const mockResult = {
        mutations: {
          mutations: [],
          metadata: { operation: 'generateLayerPractice', timestamp: Date.now() },
        },
        content: {
          review: '# Layer 1 Review\n\nPractice exercises...',
        },
        prompt: { system: 'System prompt', user: 'User prompt' },
      };

      const updatedGraph = { ...sampleGraph, updatedAt: 3000 };
      mockGenerateLayerPractice.mockResolvedValue(mockResult);
      mockApplyMutationBatchSafe.mockReturnValue({
        graph: updatedGraph,
        errors: [],
      });

      const result = await layerPracticeResolvers.Mutation.generateLayerPractice(
        null,
        { graphId, targetNodeId: layerId, layerNumber: 1 },
        context
      );

      expect(mockGenerateLayerPractice).toHaveBeenCalledWith(
        expect.objectContaining({
          graph: sampleGraph,
          concepts: expect.arrayContaining([
            expect.objectContaining({ id: conceptId1 }),
            expect.objectContaining({ id: conceptId2 }),
          ]),
          layerGoal: 'Learn basics',
          layerNumber: 1,
          difficulty: 'intermediate',
          stream: false,
        })
      );
      expect(mockSaveGraph).toHaveBeenCalledWith(uid, updatedGraph);
      expect(result.content.review).toContain('Layer 1 Review');
    });

    it('should throw error if no concepts found for layer', async () => {
      const graphWithoutConcepts = {
        ...sampleGraph,
        relationships: [],
      };
      mockLoadGraphForOperation.mockResolvedValue(graphWithoutConcepts);

      await expect(
        layerPracticeResolvers.Mutation.generateLayerPractice(
          null,
          { graphId, targetNodeId: layerId, layerNumber: 1 },
          context
        )
      ).rejects.toThrow('No concepts found for layer 1');
    });
  });
});

