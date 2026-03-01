import { Request, Response } from 'express';
import { Concept } from './concept';

// Concept graph types (Phase 1)
export * from './concept';

// Request body types
export interface GenerateNoteRequest {
  prompt: string;
  parentTitle?: string;
  parentContent?: string;
  parentTags?: string[];
}

export interface GenerateChildrenRequest {
  parentTitle: string;
  parentContent?: string;
  parentTags?: string[];
}

// Response types
export interface NoteResponse {
  title: string;
  content: string;
  tags: string[];
}

export interface ChildNote {
  title: string;
  content: string;
  tags: string[];
}

export interface GenerateChildrenResponse {
  children: ChildNote[];
}

export interface HealthResponse {
  status: string;
  message: string;
}

export interface ErrorResponse {
  error: string;
  note?: string;
  details?: string;
}

// Concept operation request types
export interface ExpandConceptRequest {
  concept: Concept;
  graph?: {
    concepts: Record<string, Concept>; // JSON-serializable format (Map becomes Record in JSON)
  };
}

export interface GenerateNextLayerRequest {
  seedConcept: Concept;
  previousLayers: Concept[];
  numLayers?: number; // 1-5, default: 2
}

export interface GenerateNextConceptRequest {
  concept: Concept;
  numSteps?: number; // 1-5, default: 3
  graph?: {
    concepts: Record<string, Concept>; // JSON-serializable format
  };
}

export interface DeriveParentsRequest {
  concept: Concept;
  seedConcept?: Concept;
}

export interface DeriveSummaryRequest {
  concepts: Concept[];
  seedConcept?: Concept;
}

export interface ProgressiveExpandMultipleFromTextRequest {
  concept: Concept;
  previousLayers: Concept[];
  numConcepts?: number;
  graphId?: string; // Optional - required for graph operations but can be omitted for standalone operations
  // REMOVED: goalFocused (always goal-focused now)
  // REMOVED: difficulty (comes from LearningGoal)
  // REMOVED: focus (comes from LearningGoal)
  stream?: boolean; // Whether to stream the response (default: false)
}

export interface ExplainConceptRequest {
  concept: Concept;
  seedConcept?: Concept;
  simple?: boolean;
  minimal?: boolean; // If true, removes learning science tags AND practice questions
  graphId?: string;
  stream?: boolean; // Whether to stream the response (default: false)
}

export interface GenerateFlashCardsRequest {
  concept: Concept;
  graphId?: string;
}

export interface GenerateLayerPracticeRequest {
  concepts: Concept[];
  layerGoal: string;
  layerNumber: number;
  preferProject?: boolean;
  graphId?: string; // Optional graph ID to save practice exercises to layer
}

export interface AnswerQuestionRequest {
  conceptGraphId: string;
  conceptId: string;
  question: string;
  selectedText?: string; // Optional selected text context
}

export interface AnswerQuestionResponse {
  answer: string;
}

export interface CustomOperationRequest {
  concepts: Concept[];
  prompt: string;
  seedConcept?: Concept;
  graph?: {
    concepts: Record<string, Concept>; // JSON-serializable format
  };
  details?: {
    lesson?: string;
    flash?: Array<{ front: string; back: string }>;
  };
  stream?: boolean;
}

export interface SynthesizeRequest {
  parents: Concept[];
  seedConcept?: Concept;
}

export interface ExploreRequest {
  concept: Concept;
  diversity?: 'low' | 'medium' | 'high';
  seedConcept?: Concept;
}

export interface TracePathRequest {
  start: Concept;
  end: Concept;
  seedConcept?: Concept;
}

export interface ProgressiveExpandSingleRequest {
  seedConcept: Concept;
  conceptToExpand: Concept;
  previousSubLayers: Concept[];
  graph?: {
    concepts: Record<string, Concept>;
  };
}

export interface ProgressiveExploreRequest {
  concept: Concept;
  seedConcept: Concept;
  previousLayer: Concept[];
  currentLayer: Concept[];
  nextLayer: Concept[];
}

// Concept operation response types
export interface ConceptOperationResponse {
  concepts: Concept[];
  model?: string;  // The LLM model that was used to generate the concepts
  deletions?: Concept[]; // Optional array of deleted concepts (for custom operations)
  prompt?: string; // The prompt used to generate this operation
  layer?: {
    layerNumber: number;
    goal?: string;
    conceptIds: string[];
  };
}

export interface GenerateLayerPracticeResponse {
  items: Array<{
    type: 'question' | 'project';
    question: string;
    answer: string;
  }>;
  model?: string;
}

// Controller types
export type ControllerHandler = (req: Request, res: Response) => Promise<void | Response> | void | Response;

// Express Request with typed body
export interface TypedRequest<T = any> extends Request {
  body: T;
}

