/**
 * Type Definitions for Knowledge Graph Access
 *
 * Frontend types matching the backend NodeBasedKnowledgeGraph structure (v0.3.0)
 */

import type { JsonValue } from '@almadar-io/knowledge';

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
  | 'Story'
  | 'Course'
  | 'Assessment'
  | 'Translation'
  | 'LanguageConfig'
  | 'Student'
  | 'ScheduleSlot'
  | 'Progress'
  | 'Enrollment'
  | 'AssessmentSubmission'
  | 'Achievement'
  | 'StudentPreferences'
  | 'CourseCategory'
  | 'CourseTemplate';

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
  // Course/Story relationships
  | 'hasAssessment'
  | 'hasQuestion'
  | 'hasTranslation'
  | 'translationOf'
  | 'hasLanguageConfig'
  | 'hasStory'
  | 'hasProgress'
  | 'forConcept'
  | 'hasEnrollment'
  | 'forCourse'
  | 'explainsConcept'
  | 'derivedFrom'
  // Student management relationships
  | 'hasEnrolledStudent'
  | 'belongsToStudent'
  | 'assignedToCourse';

export type RelationshipDirection = 'forward' | 'backward' | 'bidirectional';

export interface GraphNode {
  id: string;
  type: NodeType;
  properties: Record<string, JsonValue>;
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
  metadata?: Record<string, string | number | boolean | undefined>;
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
  Story?: string[];
  Course?: string[];
  Assessment?: string[];
  Translation?: string[];
  LanguageConfig?: string[];
  Student?: string[];
  ScheduleSlot?: string[];
  Progress?: string[];
  Enrollment?: string[];
  AssessmentSubmission?: string[];
  Achievement?: string[];
  StudentPreferences?: string[];
  CourseCategory?: string[];
  CourseTemplate?: string[];
}

export interface NodeBasedKnowledgeGraph {
  id: string;
  seedConceptId?: string;
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
  properties: Partial<Record<string, JsonValue>>;
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
