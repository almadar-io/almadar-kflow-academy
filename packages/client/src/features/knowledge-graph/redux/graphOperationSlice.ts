/**
 * Redux Slice for Graph Operations
 * 
 * Manages state for graph operations (progressive expand, explain, etc.)
 * and streaming operations.
 */

import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { GraphMutation } from '../types';
import type {
  ProgressiveExpandResponse,
  ExplainConceptResponse,
  AnswerQuestionResponse,
  GenerateGoalsResponse,
  GenerateLayerPracticeResponse,
  CustomOperationResponse,
} from '../api/types';

export interface GraphOperationState {
  // Operation states
  progressiveExpand: {
    isLoading: boolean;
    error: string | null;
  };
  explainConcept: {
    isLoading: boolean;
    error: string | null;
  };
  answerQuestion: {
    isLoading: boolean;
    error: string | null;
  };
  generateGoals: {
    isLoading: boolean;
    error: string | null;
  };
  generateLayerPractice: {
    isLoading: boolean;
    error: string | null;
  };
  customOperation: {
    isLoading: boolean;
    error: string | null;
  };

  // Streaming state
  streaming: {
    isStreaming: boolean;
    operation: string | null;
    graphId: string | null;
    accumulatedMutations: GraphMutation[];
    content: string;
  };
}

const initialState: GraphOperationState = {
  progressiveExpand: {
    isLoading: false,
    error: null,
  },
  explainConcept: {
    isLoading: false,
    error: null,
  },
  answerQuestion: {
    isLoading: false,
    error: null,
  },
  generateGoals: {
    isLoading: false,
    error: null,
  },
  generateLayerPractice: {
    isLoading: false,
    error: null,
  },
  customOperation: {
    isLoading: false,
    error: null,
  },
  streaming: {
    isStreaming: false,
    operation: null,
    graphId: null,
    accumulatedMutations: [],
    content: '',
  },
};

const graphOperationSlice = createSlice({
  name: 'graphOperations',
  initialState,
  reducers: {
    // Progressive expand
    progressiveExpandStart: (state) => {
      state.progressiveExpand.isLoading = true;
      state.progressiveExpand.error = null;
    },
    progressiveExpandSuccess: (
      state,
      action: PayloadAction<{ graphId: string; response: ProgressiveExpandResponse }>
    ) => {
      state.progressiveExpand.isLoading = false;
      // Mutations will be applied via middleware
    },
    progressiveExpandFailure: (state, action: PayloadAction<string>) => {
      state.progressiveExpand.isLoading = false;
      state.progressiveExpand.error = action.payload;
    },

    // Explain concept
    explainConceptStart: (state) => {
      state.explainConcept.isLoading = true;
      state.explainConcept.error = null;
    },
    explainConceptSuccess: (
      state,
      action: PayloadAction<{ graphId: string; response: ExplainConceptResponse }>
    ) => {
      state.explainConcept.isLoading = false;
    },
    explainConceptFailure: (state, action: PayloadAction<string>) => {
      state.explainConcept.isLoading = false;
      state.explainConcept.error = action.payload;
    },

    // Answer question
    answerQuestionStart: (state) => {
      state.answerQuestion.isLoading = true;
      state.answerQuestion.error = null;
    },
    answerQuestionSuccess: (
      state,
      action: PayloadAction<{ graphId: string; response: AnswerQuestionResponse }>
    ) => {
      state.answerQuestion.isLoading = false;
    },
    answerQuestionFailure: (state, action: PayloadAction<string>) => {
      state.answerQuestion.isLoading = false;
      state.answerQuestion.error = action.payload;
    },

    // Generate goals
    generateGoalsStart: (state) => {
      state.generateGoals.isLoading = true;
      state.generateGoals.error = null;
    },
    generateGoalsSuccess: (
      state,
      action: PayloadAction<{ graphId: string; response: GenerateGoalsResponse }>
    ) => {
      state.generateGoals.isLoading = false;
    },
    generateGoalsFailure: (state, action: PayloadAction<string>) => {
      state.generateGoals.isLoading = false;
      state.generateGoals.error = action.payload;
    },

    // Generate layer practice
    generateLayerPracticeStart: (state) => {
      state.generateLayerPractice.isLoading = true;
      state.generateLayerPractice.error = null;
    },
    generateLayerPracticeSuccess: (
      state,
      action: PayloadAction<{ graphId: string; response: GenerateLayerPracticeResponse }>
    ) => {
      state.generateLayerPractice.isLoading = false;
    },
    generateLayerPracticeFailure: (state, action: PayloadAction<string>) => {
      state.generateLayerPractice.isLoading = false;
      state.generateLayerPractice.error = action.payload;
    },

    // Custom operation
    customOperationStart: (state) => {
      state.customOperation.isLoading = true;
      state.customOperation.error = null;
    },
    customOperationSuccess: (
      state,
      action: PayloadAction<{ graphId: string; response: CustomOperationResponse }>
    ) => {
      state.customOperation.isLoading = false;
    },
    customOperationFailure: (state, action: PayloadAction<string>) => {
      state.customOperation.isLoading = false;
      state.customOperation.error = action.payload;
    },

    // Streaming
    streamingStart: (
      state,
      action: PayloadAction<{ operation: string; graphId: string }>
    ) => {
      state.streaming.isStreaming = true;
      state.streaming.operation = action.payload.operation;
      state.streaming.graphId = action.payload.graphId;
      state.streaming.accumulatedMutations = [];
      state.streaming.content = '';
    },
    streamingChunk: (state, action: PayloadAction<string>) => {
      state.streaming.content += action.payload;
    },
    streamingMutations: (state, action: PayloadAction<GraphMutation[]>) => {
      state.streaming.accumulatedMutations.push(...action.payload);
    },
    streamingDone: (
      state,
      action: PayloadAction<{ mutations: GraphMutation[]; graph: any }>
    ) => {
      state.streaming.isStreaming = false;
      state.streaming.operation = null;
      state.streaming.graphId = null;
      // Apply accumulated mutations via middleware
    },
    streamingError: (state, action: PayloadAction<string>) => {
      state.streaming.isStreaming = false;
      state.streaming.operation = null;
      state.streaming.graphId = null;
    },
  },
});

export const {
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
  generateLayerPracticeStart,
  generateLayerPracticeSuccess,
  generateLayerPracticeFailure,
  customOperationStart,
  customOperationSuccess,
  customOperationFailure,
  streamingStart,
  streamingChunk,
  streamingMutations,
  streamingDone,
  streamingError,
} = graphOperationSlice.actions;

export default graphOperationSlice.reducer;

