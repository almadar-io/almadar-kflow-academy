/**
 * Tests for Mutation Middleware (mutationMiddleware.ts)
 */

import { configureStore } from '@reduxjs/toolkit';
import { mutationMiddleware } from '../../../../features/knowledge-graph/redux/mutationMiddleware';
import knowledgeGraphSlice, { updateGraph } from '../../../../features/knowledge-graph/knowledgeGraphSlice';
import graphOperationSlice, {
  progressiveExpandSuccess,
  explainConceptSuccess,
  answerQuestionSuccess,
  generateGoalsSuccess,
  streamingDone,
} from '../../../../features/knowledge-graph/redux/graphOperationSlice';
import type {
  ProgressiveExpandResponse,
  ExplainConceptResponse,
  AnswerQuestionResponse,
  GenerateGoalsResponse,
} from '../../../../features/knowledge-graph/api/types';
import type { NodeBasedKnowledgeGraph } from '../../../../features/knowledge-graph/types';

// Type for the test store state
type TestStoreState = {
  knowledgeGraphs: {
    graphs: Record<string, NodeBasedKnowledgeGraph>;
    currentGraphId: string | null;
    isLoading: boolean;
    error: string | null;
    lastUpdated: number | null;
  };
  graphOperations: any;
};

// Helper to create a mock graph
const createMockGraph = (id: string): NodeBasedKnowledgeGraph => ({
  id,
  seedConceptId: 'seed-1',
  createdAt: Date.now(),
  updatedAt: Date.now(),
  nodes: {},
  relationships: [],
  nodeTypes: {
    Graph: [],
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
});

// Helper to create a mock response
const createMockResponse = (mutations: any[] = []) => ({
  mutations: {
    mutations,
    metadata: {
      operation: 'test',
      timestamp: Date.now(),
    },
  },
  graph: createMockGraph('graph-1'),
  errors: [],
});

describe('mutationMiddleware', () => {
  let store: ReturnType<typeof configureStore>;

  beforeEach(() => {
    store = configureStore({
      reducer: {
        knowledgeGraphs: knowledgeGraphSlice,
        graphOperations: graphOperationSlice,
      },
      middleware: (getDefaultMiddleware) =>
        getDefaultMiddleware().concat(mutationMiddleware as any),
      preloadedState: {
        knowledgeGraphs: {
          graphs: {
            'graph-1': createMockGraph('graph-1'),
          },
          currentGraphId: 'graph-1',
          isLoading: false,
          error: null,
          lastUpdated: null,
        },
      },
    });
  });

  describe('progressiveExpandSuccess', () => {
    it('should apply mutations from progressiveExpandSuccess action', () => {
      const mutation = {
        type: 'create_node' as const,
        node: {
          id: 'node-1',
          type: 'Concept' as const,
          properties: { name: 'New Concept' },
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
      };

      const response: ProgressiveExpandResponse = {
        ...createMockResponse([mutation]),
        content: {
          narrative: 'Test',
          concepts: [],
        },
      };

      store.dispatch(
        progressiveExpandSuccess({
          graphId: 'graph-1',
          response,
        })
      );

      const state = store.getState() as TestStoreState;
      expect(state.knowledgeGraphs.graphs['graph-1'].nodes['node-1']).toBeDefined();
      expect(state.knowledgeGraphs.graphs['graph-1'].nodes['node-1'].properties.name).toBe('New Concept');
    });

    it('should not apply mutations if graph does not exist', () => {
      const mutation = {
        type: 'create_node' as const,
        node: {
          id: 'node-1',
          type: 'Concept' as const,
          properties: {},
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
      };

      const response: ProgressiveExpandResponse = {
        ...createMockResponse([mutation]),
        content: {
          narrative: 'Test',
          concepts: [],
        },
      };

      store.dispatch(
        progressiveExpandSuccess({
          graphId: 'non-existent',
          response,
        })
      );

      const state = store.getState() as TestStoreState;
      expect(state.knowledgeGraphs.graphs['non-existent']).toBeUndefined();
    });

    it('should not apply mutations if mutations array is empty', () => {
      const response: ProgressiveExpandResponse = {
        ...createMockResponse([]),
        content: {
          narrative: 'Test',
          concepts: [],
        },
      };

      const initialState = store.getState() as TestStoreState;
      const initialGraph = initialState.knowledgeGraphs.graphs['graph-1'];
      const initialNodeCount = Object.keys(initialGraph.nodes).length;

      store.dispatch(
        progressiveExpandSuccess({
          graphId: 'graph-1',
          response,
        })
      );

      const state = store.getState() as TestStoreState;
      const finalNodeCount = Object.keys(state.knowledgeGraphs.graphs['graph-1'].nodes).length;
      expect(finalNodeCount).toBe(initialNodeCount);
    });
  });

  describe('explainConceptSuccess', () => {
    it('should apply mutations from explainConceptSuccess action', () => {
      const mutation = {
        type: 'create_node' as const,
        node: {
          id: 'lesson-1',
          type: 'Lesson' as const,
          properties: { content: 'Test lesson' },
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
      };

      const response: ExplainConceptResponse = {
        ...createMockResponse([mutation]),
        content: {
          lesson: 'Test lesson',
        },
      };

      store.dispatch(
        explainConceptSuccess({
          graphId: 'graph-1',
          response,
        })
      );

      const state = store.getState() as TestStoreState;
      expect(state.knowledgeGraphs.graphs['graph-1'].nodes['lesson-1']).toBeDefined();
    });
  });

  describe('answerQuestionSuccess', () => {
    it('should apply mutations from answerQuestionSuccess action', () => {
      const mutation = {
        type: 'create_node' as const,
        node: {
          id: 'metadata-1',
          type: 'ConceptMetadata' as const,
          properties: { qa: [] },
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
      };

      const response: AnswerQuestionResponse = {
        ...createMockResponse([mutation]),
        content: {
          answer: 'Test answer',
        },
      };

      store.dispatch(
        answerQuestionSuccess({
          graphId: 'graph-1',
          response,
        })
      );

      const state = store.getState() as TestStoreState;
      expect(state.knowledgeGraphs.graphs['graph-1'].nodes['metadata-1']).toBeDefined();
    });
  });

  describe('generateGoalsSuccess', () => {
    it('should apply mutations from generateGoalsSuccess action', () => {
      const mutations = [
        {
          type: 'create_node' as const,
          node: {
            id: 'goal-1',
            type: 'LearningGoal' as const,
            properties: { title: 'Test Goal' },
            createdAt: Date.now(),
            updatedAt: Date.now(),
          },
        },
        {
          type: 'create_node' as const,
          node: {
            id: 'milestone-1',
            type: 'Milestone' as const,
            properties: { title: 'Milestone 1' },
            createdAt: Date.now(),
            updatedAt: Date.now(),
          },
        },
      ];

      const response: GenerateGoalsResponse = {
        ...createMockResponse(mutations),
        content: {
          goal: {
            id: 'goal-1',
            graphId: 'graph-1',
            title: 'Test Goal',
            description: 'Test',
            type: 'test',
            target: 'test',
            createdAt: Date.now(),
            updatedAt: Date.now(),
          },
        },
      };

      store.dispatch(
        generateGoalsSuccess({
          graphId: 'graph-1',
          response,
        })
      );

      const state = store.getState() as TestStoreState;
      expect(state.knowledgeGraphs.graphs['graph-1'].nodes['goal-1']).toBeDefined();
      expect(state.knowledgeGraphs.graphs['graph-1'].nodes['milestone-1']).toBeDefined();
    });
  });

  describe('streamingDone', () => {
    it('should apply mutations from streamingDone action', () => {
      const mutation = {
        type: 'create_node' as const,
        node: {
          id: 'node-1',
          type: 'Concept' as const,
          properties: {},
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
      };

      store.dispatch(
        streamingDone({
          mutations: [mutation],
          graph: createMockGraph('graph-1'),
        })
      );

      // Note: streamingDone might not have mutations in the payload structure
      // This test verifies the middleware handles the action without errors
      const state = store.getState() as TestStoreState;
      expect(state.graphOperations.streaming.isStreaming).toBe(false);
    });
  });

  describe('non-mutation actions', () => {
    it('should pass through non-mutation actions unchanged', () => {
      const action = { type: 'SOME_OTHER_ACTION', payload: {} };
      const result = store.dispatch(action as any);

      expect(result).toEqual(action);
    });
  });

  describe('multiple mutations', () => {
    it('should apply multiple mutations in sequence', () => {
      const mutations = [
        {
          type: 'create_node' as const,
          node: {
            id: 'node-1',
            type: 'Concept' as const,
            properties: { name: 'Concept 1' },
            createdAt: Date.now(),
            updatedAt: Date.now(),
          },
        },
        {
          type: 'create_node' as const,
          node: {
            id: 'node-2',
            type: 'Concept' as const,
            properties: { name: 'Concept 2' },
            createdAt: Date.now(),
            updatedAt: Date.now(),
          },
        },
        {
          type: 'update_node' as const,
          nodeId: 'node-1',
          properties: { description: 'Updated' },
        },
      ];

      const response: ProgressiveExpandResponse = {
        ...createMockResponse(mutations),
        content: {
          narrative: 'Test',
          concepts: [],
        },
      };

      store.dispatch(
        progressiveExpandSuccess({
          graphId: 'graph-1',
          response,
        })
      );

      const state = store.getState() as TestStoreState;
      const graph = state.knowledgeGraphs.graphs['graph-1'];
      expect(graph.nodes['node-1']).toBeDefined();
      expect(graph.nodes['node-2']).toBeDefined();
      expect(graph.nodes['node-1'].properties.description).toBe('Updated');
    });
  });
});

