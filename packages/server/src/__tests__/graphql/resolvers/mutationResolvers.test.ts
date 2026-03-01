/**
 * Tests for GraphQL Mutation Resolvers
 * 
 * Direct mutation resolvers for applying and validating mutations.
 */

import { mutationResolvers } from '../../../graphql/resolvers/mutationResolvers';
import type { GraphQLContext } from '../../../graphql/types';
import type { NodeBasedKnowledgeGraph } from '../../../types/nodeBasedKnowledgeGraph';
import type { GraphMutation } from '../../../types/mutations';
import { createGraphNode, createRelationship } from '../../../types/nodeBasedKnowledgeGraph';
import { createMockDecodedToken, setupFirebaseAdminMocks, resetAllMocks } from '../../testUtils.helper';

// Mock the services
jest.mock('../../../services/graphMutationService', () => {
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

jest.mock('../../../graphql/resolvers/shared/resolverHelpers', () => {
  const mockGetUserId = jest.fn();
  const mockLoadGraphForOperation = jest.fn();
  const mockVerifyGraphAccessForResolver = jest.fn();
  return {
    getUserId: mockGetUserId,
    loadGraphForOperation: mockLoadGraphForOperation,
    verifyGraphAccessForResolver: mockVerifyGraphAccessForResolver,
    __mocks: {
      mockGetUserId,
      mockLoadGraphForOperation,
      mockVerifyGraphAccessForResolver,
    },
  };
});

// Import mocks for use in tests
const {
  mockApplyMutationBatchSafe,
  mockValidateMutation,
} = require('../../../services/graphMutationService').__mocks;

const {
  mockGetGraph,
  mockSaveGraph,
} = require('../../../services/knowledgeGraphAccess/KnowledgeGraphAccessLayer').__mocks;

const {
  mockGetUserId,
  mockLoadGraphForOperation,
  mockVerifyGraphAccessForResolver,
} = require('../../../graphql/resolvers/shared/resolverHelpers').__mocks;

describe('GraphQL Mutation Resolvers', () => {
  let context: GraphQLContext;

  const uid = 'test-user-1';
  const graphId = 'test-graph-1';
  const nodeId1 = 'concept-1';
  const nodeId2 = 'concept-2';

  let sampleGraph: NodeBasedKnowledgeGraph;

  beforeEach(() => {
    setupFirebaseAdminMocks();
    resetAllMocks();
    jest.clearAllMocks();
    // Default: authorization passes
    mockVerifyGraphAccessForResolver.mockResolvedValue(undefined);

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
    mockGetUserId.mockClear();
    mockLoadGraphForOperation.mockClear();

    // Setup default return values
    mockLoadGraphForOperation.mockResolvedValue(sampleGraph);
    mockSaveGraph.mockResolvedValue(undefined);

    // Setup context
    const decodedToken = createMockDecodedToken({ uid });
    context = {
      firebaseUser: decodedToken,
    };

    // Setup helper mocks
    mockGetUserId.mockReturnValue(uid);
    mockLoadGraphForOperation.mockResolvedValue(sampleGraph);
  });

  describe('applyMutations', () => {
    it('should apply mutations successfully', async () => {
      const updatedGraph = { ...sampleGraph, updatedAt: Date.now() };
      const mutations: GraphMutation[] = [
        {
          type: 'update_node',
          nodeId: nodeId1,
          properties: { description: 'Updated' },
        },
      ];

      mockApplyMutationBatchSafe.mockReturnValue({
        graph: updatedGraph,
        errors: [],
      });

      const result = await mutationResolvers.Mutation.applyMutations(
        null,
        {
          graphId,
          mutations,
        },
        context
      );

      expect(mockGetUserId).toHaveBeenCalledWith(context);
      expect(mockLoadGraphForOperation).toHaveBeenCalledWith(uid, graphId);
      expect(mockApplyMutationBatchSafe).toHaveBeenCalled();
      expect(mockSaveGraph).toHaveBeenCalledWith(uid, updatedGraph);
      expect(result).toEqual(updatedGraph);
    });

    it('should throw error if mutations fail', async () => {
      const mutations: GraphMutation[] = [
        {
          type: 'update_node',
          nodeId: 'non-existent',
          properties: { description: 'Updated' },
        },
      ];

      mockApplyMutationBatchSafe.mockReturnValue({
        graph: sampleGraph,
        errors: [
          {
            mutation: mutations[0],
            error: 'Node not found',
          },
        ],
      });

      await expect(
        mutationResolvers.Mutation.applyMutations(
          null,
          {
            graphId,
            mutations,
          },
          context
        )
      ).rejects.toThrow('Failed to apply mutations');
    });

    it('should throw error if unauthorized', async () => {
      mockGetUserId.mockImplementation(() => {
        throw new Error('Unauthorized');
      });

      await expect(
        mutationResolvers.Mutation.applyMutations(
          null,
          {
            graphId,
            mutations: [],
          },
          context
        )
      ).rejects.toThrow('Unauthorized');
    });
  });

  describe('validateMutations', () => {
    it('should validate mutations successfully', async () => {
      const mutations: GraphMutation[] = [
        {
          type: 'update_node',
          nodeId: nodeId1,
          properties: { description: 'Updated' },
        },
      ];

      mockValidateMutation.mockReturnValue(true);

      const result = await mutationResolvers.Mutation.validateMutations(
        null,
        {
          graphId,
          mutations,
        },
        context
      );

      expect(mockGetUserId).toHaveBeenCalledWith(context);
      expect(mockLoadGraphForOperation).toHaveBeenCalledWith(uid, graphId);
      expect(mockValidateMutation).toHaveBeenCalled();
      expect(result).toEqual({
        valid: true,
        errors: [],
      });
    });

    it('should return errors for invalid mutations', async () => {
      const mutations: GraphMutation[] = [
        {
          type: 'update_node',
          nodeId: 'non-existent',
          properties: { description: 'Updated' },
        },
      ];

      mockValidateMutation.mockReturnValue(false);

      const result = await mutationResolvers.Mutation.validateMutations(
        null,
        {
          graphId,
          mutations,
        },
        context
      );

      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].error).toBe('Validation failed');
    });

    it('should throw error if unauthorized', async () => {
      mockGetUserId.mockImplementation(() => {
        throw new Error('Unauthorized');
      });

      await expect(
        mutationResolvers.Mutation.validateMutations(
          null,
          {
            graphId,
            mutations: [],
          },
          context
        )
      ).rejects.toThrow('Unauthorized');
    });
  });
});

