/**
 * API Type Definitions for Graph Operations
 * 
 * Types for requests and responses to the graph operations API endpoints.
 * These types match the backend REST controller types.
 */

import type { NodeBasedKnowledgeGraph, GraphMutation, MutationBatch, MutationError } from '../types';
import type { LearningGoal } from '../../../features/learning/goalApi';

/**
 * Minimal Request Types (AI Agent Friendly)
 */
export interface ProgressiveExpandRequest {
  numConcepts?: number; // Optional, defaults to 5. Everything else inferred.
}

export interface ExplainConceptRequest {
  targetNodeId: string; // Only required input. Everything else inferred.
  simple?: boolean; // If true, generates a simple lesson without learning science tags
  minimal?: boolean; // If true, generates minimal content without learning science tags or practice questions
}

export interface AnswerQuestionRequest {
  targetNodeId: string;
  question: string; // Minimal inputs. Rest inferred.
}

export interface QuestionAnswerInput {
  questionId: string;
  answer?: string;
  answers?: string[];
  isOther?: boolean;
  otherValue?: string;
  skipped?: boolean;
}

export interface GenerateGoalsRequest {
  anchorAnswer: string;
  questionAnswers?: QuestionAnswerInput[]; // Made optional - can use manualGoal instead
  manualGoal?: {
    title: string;
    description?: string; // Optional - can use just title
    type?: string;
    target?: string;
    estimatedTime?: number | null;
  };
}

export interface GenerateLayerPracticeRequest {
  layerNumber: number; // Required - identifies the layer and its concepts. Everything else inferred.
  layerGoal?: string; // Optional - inferred from layer node if not provided
}

export interface CustomOperationRequest {
  targetNodeIds: string[]; // Required - nodes to operate on
  userPrompt: string; // Required - user's custom prompt. Everything else inferred.
}

export interface ApplyMutationsRequest {
  mutations: MutationBatch;
}

export interface ValidateMutationsRequest {
  mutations: MutationBatch;
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
    review: string; // Markdown review content
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

export interface ApplyMutationsResponse {
  graph: NodeBasedKnowledgeGraph;
}

export interface ValidateMutationsResponse {
  valid: boolean;
  errors: MutationError[];
}

/**
 * Optimized Query API Types (Phase 3.2)
 * 
 * Types for optimized query endpoints that return pre-formatted, display-ready data.
 * These types match the backend query service response types.
 */

/**
 * Learning Path Summary (for MentorPage)
 */
export interface LearningPathSummary {
  id: string;
  title: string;
  description: string;
  conceptCount: number;
  seedConcept: {
    id: string;
    name: string;
    description: string;
  } | null;
  updatedAt: number;
  createdAt: number;
}

export interface LearningPathsSummaryResponse {
  learningPaths: LearningPathSummary[];
}

/**
 * Graph Summary (for MentorConceptListPage header)
 */
export interface GraphSummary {
  id: string;
  goal: {
    id: string;
    title: string;
    description: string;
    type: string;
    target: string;
  } | null;
  milestones: Array<{
    id: string;
    title: string;
    description: string;
    targetDate?: number;
    completed: boolean;
  }>;
  conceptCount: number;
  layerCount: number;
  seedConcept: {
    id: string;
    name: string;
  } | null;
  updatedAt: number;
}

/**
 * Concept Display (for MentorConceptListPage and MentorConceptDetailPage)
 */
export interface ConceptDisplay {
  id: string;
  name: string;
  description: string;
  layer: number;
  isSeed: boolean;
  sequence?: number;
  parents: string[];
  children: string[];
  prerequisites: string[];
  properties: Record<string, any>;
}

export interface ConceptsByLayerResponse {
  concepts: ConceptDisplay[];
  groupedByLayer?: Record<number, ConceptDisplay[]>;
  layerInfo: Array<{
    layerNumber: number;
    conceptCount: number;
    goal?: string;
  }>;
}

/**
 * Concept Detail (for MentorConceptDetailPage)
 */
export interface ConceptDetail {
  concept: ConceptDisplay;
  lesson: {
    id: string;
    content: string;
    prerequisites: string[];
  } | null;
  flashcards: Array<{
    id: string;
    front: string;
    back: string;
  }>;
  metadata: {
    qa: Array<{
      question: string;
      answer: string;
    }>;
  } | null;
  relationships: {
    parents: Array<{
      id: string;
      name: string;
    }>;
    children: Array<{
      id: string;
      name: string;
    }>;
    prerequisites: Array<{
      id: string;
      name: string;
    }>;
  };
}

/**
 * MindMap Node (for MindMap component)
 * 
 * Represents a node in the mindmap structure, converted from NodeBasedKnowledgeGraph.
 * This structure matches the Note interface expected by the MindMap component.
 */
export interface MindMapNode {
  id: string;
  title: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
  tags: string[];
  parentId?: string;
  children: string[];
  level: number;
  isExpanded: boolean;
  nodeType: string; // 'Concept' | 'Layer' | etc.
  metadata?: {
    layer?: number;
    isSeed?: boolean;
    sequence?: number;
    layerNumber?: number;
    goal?: string;
    [key: string]: any;
  };
}

/**
 * MindMap Response
 * 
 * Response from the mindmap query endpoint containing all nodes
 * and metadata for the mindmap visualization.
 */
export interface MindMapResponse {
  nodes: MindMapNode[];
  seedNodeId: string;
  totalNodes: number;
  layerCount: number;
  conceptCount: number;
}

