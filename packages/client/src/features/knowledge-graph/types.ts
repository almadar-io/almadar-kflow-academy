/**
 * Type Definitions for Knowledge Graph Access
 * 
 * Frontend types matching the backend NodeBasedKnowledgeGraph structure
 */

export type NodeType =
  | 'Graph'
  | 'Concept'
  | 'Layer'
  | 'LearningGoal'
  | 'Milestone'
  | 'PracticeExercise'
  | 'Lesson'
  | 'ConceptMetadata'
  | 'GraphMetadata'
  | 'FlashCard'
  // Publishing/Course types
  | 'CourseSettings'
  | 'ModuleSettings'
  | 'LessonSettings'
  | 'Assessment'
  | 'AssessmentQuestion'
  | 'Translation'
  | 'LanguageConfig'
  // Student management types
  | 'Student'
  | 'ScheduleSlot';

export type RelationshipType =
  // Hierarchical
  | 'hasParent'
  | 'hasChild'
  // Containment
  | 'containsConcept'
  | 'belongsToLayer'
  | 'hasLesson'
  | 'hasFlashCard'
  | 'hasMetadata'
  // Sequence
  | 'precedesLayer'
  | 'precedesConcept'
  // Prerequisites
  | 'hasPrerequisite'
  | 'isPrerequisiteOf'
  // Goals
  | 'hasLearningGoal'
  | 'hasMilestone'
  // Practice
  | 'hasPracticeExercise'
  // Metadata
  | 'hasGraphMetadata'
  | 'hasConceptMetadata'
  // Publishing/Course relationships
  | 'hasCourseSettings'
  | 'hasModuleSettings'
  | 'hasLessonSettings'
  | 'hasAssessment'
  | 'hasQuestion'
  | 'hasTranslation'
  | 'translationOf'
  | 'hasLanguageConfig'
  // Student management relationships
  | 'hasEnrolledStudent'
  | 'belongsToStudent'
  | 'assignedToCourse';

export type RelationshipDirection = 'forward' | 'backward' | 'bidirectional';

export interface GraphNode {
  id: string;
  type: NodeType;
  properties: Record<string, any>;
  createdAt: number;
  updatedAt: number;
}

export interface Relationship {
  id: string;
  source: string;
  target: string;
  type: RelationshipType;
  direction: RelationshipDirection;
  strength?: number;
  metadata?: Record<string, any>;
  createdAt: number;
}

export interface NodeTypeIndex {
  Graph: string[];
  Concept: string[];
  Layer: string[];
  LearningGoal: string[];
  Milestone: string[];
  PracticeExercise: string[];
  Lesson: string[];
  ConceptMetadata: string[];
  GraphMetadata: string[];
  FlashCard: string[];
  // Publishing/Course types (optional for backward compatibility)
  CourseSettings?: string[];
  ModuleSettings?: string[];
  LessonSettings?: string[];
  Assessment?: string[];
  AssessmentQuestion?: string[];
  Translation?: string[];
  LanguageConfig?: string[];
  // Student management types
  Student?: string[];
  ScheduleSlot?: string[];
}

export interface NodeBasedKnowledgeGraph {
  id: string;
  seedConceptId: string;
  createdAt: number;
  updatedAt: number;
  nodes: Record<string, GraphNode>;
  relationships: Relationship[];
  nodeTypes: NodeTypeIndex;
}

/**
 * Graph Mutation Types
 * 
 * Types for mutations that can be applied to the knowledge graph.
 * These match the backend mutation types.
 */

export interface CreateNodeMutation {
  type: 'create_node';
  node: GraphNode;
  updateIndex?: boolean;
}

export interface UpdateNodeMutation {
  type: 'update_node';
  nodeId: string;
  properties: Partial<Record<string, any>>;
  updateTimestamp?: boolean;
}

export interface DeleteNodeMutation {
  type: 'delete_node';
  nodeId: string;
  cascade?: boolean;
}

export interface CreateRelationshipMutation {
  type: 'create_relationship';
  relationship: Relationship;
}

export interface DeleteRelationshipMutation {
  type: 'delete_relationship';
  relationshipId: string;
}

export interface UpdateNodeTypeIndexMutation {
  type: 'update_node_type_index';
  nodeType: NodeType;
  nodeId: string;
  operation: 'add' | 'remove';
}

export type GraphMutation =
  | CreateNodeMutation
  | UpdateNodeMutation
  | DeleteNodeMutation
  | CreateRelationshipMutation
  | DeleteRelationshipMutation
  | UpdateNodeTypeIndexMutation;

export interface MutationBatch {
  mutations: GraphMutation[];
  metadata?: {
    operation: string;
    timestamp: number;
    model?: string;
  };
}

export interface MutationError {
  mutation: GraphMutation;
  error: string;
}

/**
 * Lesson Annotation Types
 * 
 * Types for questions and notes attached to lesson content.
 */

/**
 * Question and answer item for lesson annotations
 */
export interface QuestionAnswerItem {
  id: string;
  question: string;
  answer: string;
  selectedText?: string; // Full selected text for display context
  selectedTextChunks?: string[]; // Chunks of selected text for highlighting
  timestamp: number;
}

/**
 * Note item for lesson annotations
 */
export interface NoteItem {
  id: string;
  text: string; // The note content
  selectedText?: string; // Full selected text for display context
  selectedTextChunks?: string[]; // Chunks of selected text for highlighting
  timestamp: number;
}

/**
 * Annotation highlight type for UI
 */
export type AnnotationType = 'question' | 'note';

