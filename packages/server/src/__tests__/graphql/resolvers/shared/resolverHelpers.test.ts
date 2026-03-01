/**
 * Tests for Shared GraphQL Resolver Helpers
 * 
 * Common utilities for GraphQL resolvers.
 */

import {
  getUserId,
  loadGraphForOperation,
  createMutationContext,
  inferLearningGoalFromGraph,
  inferDifficulty,
  inferFocus,
} from '../../../../graphql/resolvers/shared/resolverHelpers';
import type { GraphQLContext } from '../../../../graphql/types';
import type { NodeBasedKnowledgeGraph } from '../../../../types/nodeBasedKnowledgeGraph';
import { createGraphNode, createRelationship } from '../../../../types/nodeBasedKnowledgeGraph';
import { createMockDecodedToken, setupFirebaseAdminMocks, resetAllMocks } from '../../../testUtils.helper';

// Mock the access layer
jest.mock('../../../../services/knowledgeGraphAccess/KnowledgeGraphAccessLayer', () => {
  const mockGetGraph = jest.fn();
  return {
    KnowledgeGraphAccessLayer: jest.fn().mockImplementation(() => ({
      getGraph: mockGetGraph,
    })),
    __mocks: {
      mockGetGraph,
    },
  };
});

// Import mocks for use in tests
const {
  mockGetGraph,
} = require('../../../../services/knowledgeGraphAccess/KnowledgeGraphAccessLayer').__mocks;

describe('GraphQL Resolver Helpers', () => {

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
      difficulty: 'intermediate',
      focus: 'Frontend development',
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

    // Reset mock and set default return value
    mockGetGraph.mockClear();
    mockGetGraph.mockResolvedValue(sampleGraph);
  });

  describe('getUserId', () => {
    it('should return user ID from context', () => {
      const decodedToken = createMockDecodedToken({ uid });
      const context: GraphQLContext = {
        firebaseUser: decodedToken,
      };

      const result = getUserId(context);

      expect(result).toBe(uid);
    });

    it('should throw error if user is not authenticated', () => {
      const context: GraphQLContext = {
        firebaseUser: undefined,
      };

      expect(() => getUserId(context)).toThrow('Unauthorized');
    });
  });

  describe('loadGraphForOperation', () => {
    it('should load graph successfully', async () => {
      const result = await loadGraphForOperation(uid, graphId);

      expect(mockGetGraph).toHaveBeenCalledWith(uid, graphId);
      expect(result).toEqual(sampleGraph);
    });

    it('should throw error if graph not found', async () => {
      mockGetGraph.mockResolvedValue(null);

      await expect(loadGraphForOperation(uid, graphId)).rejects.toThrow(
        `Graph ${graphId} not found`
      );
    });
  });

  describe('createMutationContext', () => {
    it('should create mutation context from graph', () => {
      const result = createMutationContext(sampleGraph);

      expect(result).toEqual({
        graphId: sampleGraph.id,
        seedConceptId: sampleGraph.seedConceptId,
        targetNodeId: undefined,
        existingNodes: sampleGraph.nodes,
        existingRelationships: sampleGraph.relationships,
      });
    });

    it('should include target node ID if provided', () => {
      const result = createMutationContext(sampleGraph, nodeId1);

      expect(result.targetNodeId).toBe(nodeId1);
    });
  });

  describe('inferLearningGoalFromGraph', () => {
    it('should return learning goal if found in graph', () => {
      const goalNode = createGraphNode('goal-1', 'LearningGoal', {
        id: 'goal-1',
        description: 'Learn React',
        assessedLevel: 'beginner',
      });

      const graphWithGoal: NodeBasedKnowledgeGraph = {
        ...sampleGraph,
        nodes: {
          ...sampleGraph.nodes,
          'goal-1': goalNode,
        },
        nodeTypes: {
          ...sampleGraph.nodeTypes,
          LearningGoal: ['goal-1'],
        },
      };

      const result = inferLearningGoalFromGraph(graphWithGoal);

      expect(result).toEqual(goalNode.properties);
    });

    it('should return undefined if no learning goal found', () => {
      const result = inferLearningGoalFromGraph(sampleGraph);

      expect(result).toBeUndefined();
    });
  });

  describe('inferDifficulty', () => {
    it('should return difficulty from learning goal if available', () => {
      const goalNode = createGraphNode('goal-1', 'LearningGoal', {
        id: 'goal-1',
        assessedLevel: 'advanced',
      });

      const graphWithGoal: NodeBasedKnowledgeGraph = {
        ...sampleGraph,
        nodes: {
          ...sampleGraph.nodes,
          'goal-1': goalNode,
        },
        nodeTypes: {
          ...sampleGraph.nodeTypes,
          LearningGoal: ['goal-1'],
        },
      };

      const result = inferDifficulty(graphWithGoal);

      expect(result).toBe('advanced');
    });

    it('should return difficulty from graph if no learning goal', () => {
      const result = inferDifficulty(sampleGraph);

      expect(result).toBe('intermediate');
    });

    it('should default to intermediate if no difficulty specified', () => {
      const graphWithoutDifficulty: NodeBasedKnowledgeGraph = {
        ...sampleGraph,
        difficulty: undefined,
      };

      const result = inferDifficulty(graphWithoutDifficulty);

      expect(result).toBe('intermediate');
    });
  });

  describe('inferFocus', () => {
    it('should return focus from learning goal if available', () => {
      const goalNode = createGraphNode('goal-1', 'LearningGoal', {
        id: 'goal-1',
        description: 'Learn React',
        customMetadata: {
          focus: 'Component architecture',
        },
      });

      const graphWithGoal: NodeBasedKnowledgeGraph = {
        ...sampleGraph,
        nodes: {
          ...sampleGraph.nodes,
          'goal-1': goalNode,
        },
        nodeTypes: {
          ...sampleGraph.nodeTypes,
          LearningGoal: ['goal-1'],
        },
      };

      const result = inferFocus(graphWithGoal);

      expect(result).toBe('Component architecture');
    });

    it('should return focus from graph if no learning goal', () => {
      const result = inferFocus(sampleGraph);

      expect(result).toBe('Frontend development');
    });

    it('should return undefined if no focus specified', () => {
      const graphWithoutFocus: NodeBasedKnowledgeGraph = {
        ...sampleGraph,
        focus: undefined,
      };

      const result = inferFocus(graphWithoutFocus);

      expect(result).toBeUndefined();
    });
  });
});

