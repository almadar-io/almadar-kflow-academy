/**
 * GraphQL TypeScript Types
 * 
 * Type definitions for GraphQL resolvers to ensure full type safety.
 */

import type { DecodedIdToken } from 'firebase-admin/auth';
import type { NodeBasedKnowledgeGraph } from '../types/nodeBasedKnowledgeGraph';
import type { GraphMutation, MutationBatch, MutationError } from '../types/mutations';
import type { 
  ProgressiveExpandMultipleFromTextResult,
  ExplainResult,
  AnswerQuestionResult as AnswerQuestionResultOperation,
  GenerateGoalsResult as GenerateGoalsResultOperation,
  GenerateLayerPracticeResult as GenerateLayerPracticeResultOperation,
  CustomOperationResult as CustomOperationResultOperation
} from '../services/graphOperations';

/**
 * GraphQL Context Type
 */
export interface GraphQLContext {
  firebaseUser?: DecodedIdToken;
}

/**
 * Minimal Input Types for AI Agents
 */
export interface ProgressiveExpandArgs {
  graphId: string;
  numConcepts?: number;
}

export interface ExplainConceptArgs {
  graphId: string;
  targetNodeId: string;
}

export interface AnswerQuestionArgs {
  graphId: string;
  targetNodeId: string;
  question: string;
}

export interface QuestionAnswerInput {
  questionId: string;
  answer?: string;
  answers?: string[];
  isOther?: boolean;
  otherValue?: string;
  skipped?: boolean;
}

export interface GenerateGoalsArgs {
  graphId: string;
  anchorAnswer: string;
  questionAnswers: QuestionAnswerInput[];
}

export interface GenerateLayerPracticeArgs {
  graphId: string;
  targetNodeId: string;
  layerNumber: number;
}

export interface CustomOperationArgs {
  graphId: string;
  targetNodeIds: string[];
  userPrompt: string;
  details?: {
    lesson?: boolean;
    flashCards?: boolean;
  };
  parentForNewConcepts?: string;
}

/**
 * GraphQL Result Types
 */
export interface ProgressiveExpandResult {
  graph: NodeBasedKnowledgeGraph;
  mutations: MutationBatch;
  content: ProgressiveExpandMultipleFromTextResult['content'];
  errors: MutationError[];
}

export interface ExplainConceptResult {
  graph: NodeBasedKnowledgeGraph;
  mutations: MutationBatch;
  content: ExplainResult['content'];
  errors: MutationError[];
}

export interface AnswerQuestionResult {
  graph: NodeBasedKnowledgeGraph;
  mutations: MutationBatch;
  content: AnswerQuestionResultOperation['content'];
  errors: MutationError[];
}

export interface GenerateGoalsResult {
  graph: NodeBasedKnowledgeGraph;
  mutations: MutationBatch;
  content: GenerateGoalsResultOperation['content'];
  errors: MutationError[];
}

export interface GenerateLayerPracticeResult {
  graph: NodeBasedKnowledgeGraph;
  mutations: MutationBatch;
  content: GenerateLayerPracticeResultOperation['content'];
  errors: MutationError[];
}

export interface CustomOperationResult {
  graph: NodeBasedKnowledgeGraph;
  mutations: MutationBatch;
  content: CustomOperationResultOperation['content'];
  errors: MutationError[];
}

/**
 * Direct Mutation Types
 */
export interface ApplyMutationsArgs {
  graphId: string;
  mutations: GraphMutation[];
}

export interface ValidateMutationsArgs {
  graphId: string;
  mutations: GraphMutation[];
}

export interface MutationValidationResult {
  valid: boolean;
  errors: MutationError[];
}

