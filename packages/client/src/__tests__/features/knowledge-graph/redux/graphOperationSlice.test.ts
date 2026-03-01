/**
 * Tests for Graph Operation Redux Slice (graphOperationSlice.ts)
 */

import { configureStore } from '@reduxjs/toolkit';
import graphOperationSlice, {
  type GraphOperationState,
  progressiveExpandStart,
  progressiveExpandSuccess,
  progressiveExpandFailure,
  explainConceptStart,
  explainConceptSuccess,
  explainConceptFailure,
  answerQuestionStart,
  answerQuestionSuccess,
  answerQuestionFailure,
  generateGoalsStart,
  generateGoalsSuccess,
  generateGoalsFailure,
  streamingStart,
  streamingChunk,
  streamingMutations,
  streamingDone,
  streamingError,
} from '../../../../features/knowledge-graph/redux/graphOperationSlice';
import type {
  ProgressiveExpandResponse,
  ExplainConceptResponse,
  AnswerQuestionResponse,
  GenerateGoalsResponse,
} from '../../../../features/knowledge-graph/api/types';
import type { GraphMutation } from '../../../../features/knowledge-graph/types';

// Helper to create a mock response
const createMockResponse = <T extends ProgressiveExpandResponse | ExplainConceptResponse | AnswerQuestionResponse | GenerateGoalsResponse>(
  overrides?: Partial<T>
): T => ({
  mutations: {
    mutations: [],
    metadata: {
      operation: 'test',
      timestamp: Date.now(),
    },
  },
  graph: {
    id: 'graph-1',
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
  },
  errors: [],
  ...overrides,
} as T);

describe('graphOperationSlice', () => {
  let store: ReturnType<typeof configureStore<{ graphOperations: GraphOperationState }>>;

  beforeEach(() => {
    store = configureStore({
      reducer: {
        graphOperations: graphOperationSlice,
      },
    });
  });

  describe('initial state', () => {
    it('should have correct initial state', () => {
      const state = store.getState().graphOperations;

      expect(state.progressiveExpand).toEqual({
        isLoading: false,
        error: null,
      });
      expect(state.explainConcept).toEqual({
        isLoading: false,
        error: null,
      });
      expect(state.answerQuestion).toEqual({
        isLoading: false,
        error: null,
      });
      expect(state.generateGoals).toEqual({
        isLoading: false,
        error: null,
      });
      expect(state.streaming).toEqual({
        isStreaming: false,
        operation: null,
        graphId: null,
        accumulatedMutations: [],
        content: '',
      });
    });
  });

  describe('progressiveExpand actions', () => {
    it('should set loading state on start', () => {
      store.dispatch(progressiveExpandStart());

      const state = store.getState().graphOperations;
      expect(state.progressiveExpand.isLoading).toBe(true);
      expect(state.progressiveExpand.error).toBeNull();
    });

    it('should clear loading and error on success', () => {
      store.dispatch(progressiveExpandStart());
      const response = createMockResponse<ProgressiveExpandResponse>({
        content: {
          narrative: 'Test narrative',
          concepts: [],
        },
      });

      store.dispatch(progressiveExpandSuccess({ graphId: 'graph-1', response }));

      const state = store.getState().graphOperations;
      expect(state.progressiveExpand.isLoading).toBe(false);
      expect(state.progressiveExpand.error).toBeNull();
    });

    it('should set error on failure', () => {
      store.dispatch(progressiveExpandStart());
      store.dispatch(progressiveExpandFailure('Test error'));

      const state = store.getState().graphOperations;
      expect(state.progressiveExpand.isLoading).toBe(false);
      expect(state.progressiveExpand.error).toBe('Test error');
    });
  });

  describe('explainConcept actions', () => {
    it('should set loading state on start', () => {
      store.dispatch(explainConceptStart());

      const state = store.getState().graphOperations;
      expect(state.explainConcept.isLoading).toBe(true);
      expect(state.explainConcept.error).toBeNull();
    });

    it('should clear loading on success', () => {
      store.dispatch(explainConceptStart());
      const response = createMockResponse<ExplainConceptResponse>({
        content: {
          lesson: 'Test lesson',
        },
      });

      store.dispatch(explainConceptSuccess({ graphId: 'graph-1', response }));

      const state = store.getState().graphOperations;
      expect(state.explainConcept.isLoading).toBe(false);
    });

    it('should set error on failure', () => {
      store.dispatch(explainConceptStart());
      store.dispatch(explainConceptFailure('Test error'));

      const state = store.getState().graphOperations;
      expect(state.explainConcept.isLoading).toBe(false);
      expect(state.explainConcept.error).toBe('Test error');
    });
  });

  describe('answerQuestion actions', () => {
    it('should set loading state on start', () => {
      store.dispatch(answerQuestionStart());

      const state = store.getState().graphOperations;
      expect(state.answerQuestion.isLoading).toBe(true);
      expect(state.answerQuestion.error).toBeNull();
    });

    it('should clear loading on success', () => {
      store.dispatch(answerQuestionStart());
      const response = createMockResponse<AnswerQuestionResponse>({
        content: {
          answer: 'Test answer',
        },
      });

      store.dispatch(answerQuestionSuccess({ graphId: 'graph-1', response }));

      const state = store.getState().graphOperations;
      expect(state.answerQuestion.isLoading).toBe(false);
    });

    it('should set error on failure', () => {
      store.dispatch(answerQuestionStart());
      store.dispatch(answerQuestionFailure('Test error'));

      const state = store.getState().graphOperations;
      expect(state.answerQuestion.isLoading).toBe(false);
      expect(state.answerQuestion.error).toBe('Test error');
    });
  });

  describe('generateGoals actions', () => {
    it('should set loading state on start', () => {
      store.dispatch(generateGoalsStart());

      const state = store.getState().graphOperations;
      expect(state.generateGoals.isLoading).toBe(true);
      expect(state.generateGoals.error).toBeNull();
    });

    it('should clear loading on success', () => {
      store.dispatch(generateGoalsStart());
      const response = createMockResponse<GenerateGoalsResponse>({
        content: {
          goal: {
            id: 'goal-1',
            graphId: 'graph-1',
            title: 'Test Goal',
            description: 'Test description',
            type: 'test',
            target: 'test target',
            createdAt: Date.now(),
            updatedAt: Date.now(),
          },
        },
      });

      store.dispatch(generateGoalsSuccess({ graphId: 'graph-1', response }));

      const state = store.getState().graphOperations;
      expect(state.generateGoals.isLoading).toBe(false);
    });

    it('should set error on failure', () => {
      store.dispatch(generateGoalsStart());
      store.dispatch(generateGoalsFailure('Test error'));

      const state = store.getState().graphOperations;
      expect(state.generateGoals.isLoading).toBe(false);
      expect(state.generateGoals.error).toBe('Test error');
    });
  });

  describe('streaming actions', () => {
    it('should initialize streaming state on start', () => {
      store.dispatch(streamingStart({ operation: 'progressiveExpand', graphId: 'graph-1' }));

      const state = store.getState().graphOperations.streaming;
      expect(state.isStreaming).toBe(true);
      expect(state.operation).toBe('progressiveExpand');
      expect(state.graphId).toBe('graph-1');
      expect(state.accumulatedMutations).toEqual([]);
      expect(state.content).toBe('');
    });

    it('should accumulate content chunks', () => {
      store.dispatch(streamingStart({ operation: 'progressiveExpand', graphId: 'graph-1' }));
      store.dispatch(streamingChunk('Hello '));
      store.dispatch(streamingChunk('World'));

      const state = store.getState().graphOperations.streaming;
      expect(state.content).toBe('Hello World');
    });

    it('should accumulate mutations', () => {
      store.dispatch(streamingStart({ operation: 'progressiveExpand', graphId: 'graph-1' }));

      const mutation1: GraphMutation = {
        type: 'create_node',
        node: {
          id: 'node-1',
          type: 'Concept',
          properties: {},
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
      };

      const mutation2: GraphMutation = {
        type: 'create_node',
        node: {
          id: 'node-2',
          type: 'Concept',
          properties: {},
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
      };

      store.dispatch(streamingMutations([mutation1]));
      store.dispatch(streamingMutations([mutation2]));

      const state = store.getState().graphOperations.streaming;
      expect(state.accumulatedMutations).toHaveLength(2);
      expect(state.accumulatedMutations[0]).toEqual(mutation1);
      expect(state.accumulatedMutations[1]).toEqual(mutation2);
    });

    it('should clear streaming state on done', () => {
      store.dispatch(streamingStart({ operation: 'progressiveExpand', graphId: 'graph-1' }));
      store.dispatch(streamingChunk('Test content'));

      const mockGraph = {
        id: 'graph-1',
        seedConceptId: 'seed-1',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        nodes: {},
        relationships: [],
        nodeTypes: {} as any,
      };

      store.dispatch(
        streamingDone({
          mutations: [],
          graph: mockGraph,
        })
      );

      const state = store.getState().graphOperations.streaming;
      expect(state.isStreaming).toBe(false);
      expect(state.operation).toBeNull();
      expect(state.graphId).toBeNull();
    });

    it('should clear streaming state on error', () => {
      store.dispatch(streamingStart({ operation: 'progressiveExpand', graphId: 'graph-1' }));
      store.dispatch(streamingError('Test error'));

      const state = store.getState().graphOperations.streaming;
      expect(state.isStreaming).toBe(false);
      expect(state.operation).toBeNull();
      expect(state.graphId).toBeNull();
    });
  });
});

