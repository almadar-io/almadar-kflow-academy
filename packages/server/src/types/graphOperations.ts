/**
 * Graph Operations API Types
 * 
 * Type definitions for REST API requests and responses for graph operations.
 */

import type { NodeBasedKnowledgeGraph } from './nodeBasedKnowledgeGraph';
import type { MutationBatch, MutationError } from './mutations';
import type { LearningGoal } from './goal';

/**
 * Request Types
 */
export interface ProgressiveExpandRequest {
  numConcepts?: number;
}

export interface ExplainConceptRequest {
  targetNodeId: string;
  simple?: boolean; // If true, generates a simple lesson without learning science tags
  minimal?: boolean; // If true, generates minimal content without learning science tags or practice questions
}

export interface AnswerQuestionRequest {
  targetNodeId: string;
  question: string;
}

export interface GenerateGoalsRequest {
  anchorAnswer: string;
  questionAnswers?: Array<{
    questionId: string;
    answer?: string;
    answers?: string[];
    isOther?: boolean;
    otherValue?: string;
    skipped?: boolean;
  }>;
  manualGoal?: {
    title: string;
    description: string;
    type?: string;
    target?: string;
    estimatedTime?: number | null;
  };
}

export interface GenerateLayerPracticeRequest {
  layerNumber: number;
  layerGoal?: string;
}

export interface CustomOperationRequest {
  targetNodeIds: string[];
  userPrompt: string;
}

/**
 * Response Types
 */
export interface ProgressiveExpandResponse {
  mutations: MutationBatch;
  content: {
    narrative: string;
    goal?: string;
    levelName?: string;
    concepts: Array<{ name: string; description: string; parents: string[] }>;
  };
  graph: NodeBasedKnowledgeGraph;
  errors?: MutationError[];
}

export interface ExplainConceptResponse {
  mutations: MutationBatch;
  content: {
    lesson: string;
    prerequisites?: string[];
  };
  graph: NodeBasedKnowledgeGraph;
  errors?: MutationError[];
}

export interface AnswerQuestionResponse {
  mutations: MutationBatch;
  content: {
    answer: string;
  };
  graph: NodeBasedKnowledgeGraph;
  errors?: MutationError[];
}

export interface GenerateGoalsResponse {
  mutations: MutationBatch;
  content: {
    goal: LearningGoal;
  };
  graph: NodeBasedKnowledgeGraph;
  errors?: MutationError[];
}

export interface GenerateLayerPracticeResponse {
  mutations: MutationBatch;
  content: {
    review: string;
  };
  graph: NodeBasedKnowledgeGraph;
  errors?: MutationError[];
}

export interface CustomOperationResponse {
  mutations: MutationBatch;
  content: {
    concepts: Array<{
      name: string;
      action: 'added' | 'updated' | 'deleted';
    }>;
  };
  graph: NodeBasedKnowledgeGraph;
  errors?: MutationError[];
}

