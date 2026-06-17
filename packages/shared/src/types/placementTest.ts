/**
 * Types for placement test and level assessment
 */

/**
 * Placement test question
 */
export interface PlacementQuestion {
  id: string;
  question: string;
  type: 'multiple_choice' | 'true_false' | 'short_answer';
  options?: string[]; // For multiple choice
  correctAnswer: string | string[]; // Can be multiple correct answers
  conceptIds: string[]; // Concepts this question tests (concept names)
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  explanation?: string; // Explanation shown after answering
}

/**
 * User's answer to a placement question
 */
export interface PlacementAnswer {
  questionId: string;
  answer: string | string[];
  isCorrect: boolean;
  answeredAt: number;
}

/**
 * Placement test record
 */
export interface PlacementTest {
  id: string;
  graphId: string; // Links to the learning graph
  goalId: string; // Links to the learning goal
  userId: string;
  topic: string; // Main topic being assessed
  questions: PlacementQuestion[];
  answers: PlacementAnswer[];
  assessedLevel: 'beginner' | 'intermediate' | 'advanced' | null; // Final assessment
  score?: number; // Overall score (0-100)
  completedAt?: number; // Timestamp when test was completed
  createdAt: number;
  updatedAt: number;
}

/**
 * Result from placement test assessment
 */
export interface PlacementTestResult {
  test: PlacementTest;
  assessedLevel: 'beginner' | 'intermediate' | 'advanced';
  recommendedStartingLayer?: number; // Suggested starting layer for concept generation
  confidence: number; // Confidence in assessment (0-1)
  beginnerScore: number; // Score on beginner questions (0-1)
  intermediateScore: number; // Score on intermediate questions (0-1)
  advancedScore: number; // Score on advanced questions (0-1)
}

/**
 * Options for generating placement questions
 */
export interface GeneratePlacementQuestionsOptions {
  goalId: string;
  graphId: string;
  topic: string;
  uid?: string; // For cost tracking
}

/**
 * Result from placement question generation
 */
export interface GeneratePlacementQuestionsResult {
  questions: PlacementQuestion[];
  model?: string;
}

/**
 * Options for creating a placement test
 */
export interface CreatePlacementTestOptions {
  goalId: string;
  graphId: string;
  topic: string;
  uid: string;
}

/**
 * Options for submitting placement test answers
 */
export interface SubmitPlacementTestOptions {
  testId: string;
  answers: PlacementAnswer[];
  uid: string;
}

