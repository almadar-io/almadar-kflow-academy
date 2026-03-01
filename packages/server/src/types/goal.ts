/**
 * Types for learning goals and goal-related operations
 */

// Common goal types (suggestions, but custom types allowed)
export type CommonGoalType = 
  | 'certification' 
  | 'skill_mastery' 
  | 'language_level' 
  | 'project_completion';

// Flexible goal type - can be common type or custom type from LLM
export type GoalType = CommonGoalType | string;

/**
 * Milestone for a learning goal
 */
export interface Milestone {
  id: string;
  title: string;
  description?: string;
  targetDate?: number; // timestamp
  completed: boolean;
  completedAt?: number; // timestamp
}

/**
 * Learning goal structure - linked to a specific graph
 */
export interface LearningGoal {
  id: string;
  graphId: string; // Links goal to specific graph
  title: string;
  description: string;
  type: GoalType; // Flexible: can be common type or custom type from LLM
  target: string; // e.g., "Data Science Certification", "B1 Spanish", "Publish research paper"
  estimatedTime?: number; // hours
  milestones?: Milestone[];
  shortTermGoals?: string[]; // References to layer goals in graph
  customMetadata?: Record<string, any>; // For domain-specific goal data
  assessedLevel?: 'beginner' | 'intermediate' | 'advanced'; // From placement test
  placementTestId?: string; // Reference to placement test
  createdAt: number;
  updatedAt: number;
}

/**
 * Question generated for goal refinement
 */
export interface GoalQuestion {
  id: string;
  question: string;
  type: 'multiple_choice' | 'text' | 'scale' | 'yes_no';
  selectionType?: 'single' | 'multi'; // 'single' for radio buttons (one answer), 'multi' for checkboxes (multiple answers). Defaults to 'multi' for backward compatibility
  options: string[]; // Always provided (suggestions for text questions)
  allowOther: boolean; // Always true - includes "Other (specify)" option
  allowSkip: boolean; // Always true - allows skipping the question
  required?: boolean; // Default: false (since skip is allowed)
  helpText?: string;
}

/**
 * User's answer to a goal question
 */
export interface GoalQuestionAnswer {
  questionId: string;
  answer?: string | string[]; // Selected option(s) or text answer - can be array for multiple selections
  isOther?: boolean; // True if "Other" option selected
  otherValue?: string; // Custom value if isOther is true
  skipped?: boolean; // True if question was skipped
}

/**
 * Result from goal question generation operation
 */
export interface GenerateGoalQuestionsResult {
  questions: GoalQuestion[];
  inferredGoalType?: string; // LLM's suggestion for goal type
  suggestedDomain?: string; // LLM's suggestion for domain
  model?: string;
}

/**
 * Options for generating goal questions
 */
export interface GenerateGoalQuestionsOptions {
  anchorAnswer: string; // User's response to anchor question
  goalDescription?: string;
  goalType?: string;
  domain?: string;
  userId?: string;
  uid?: string; // For cost tracking
}

/**
 * Options for generating a learning goal
 */
export interface GenerateGoalOptions {
  anchorAnswer: string; // User's response to anchor question
  questionAnswers: GoalQuestionAnswer[]; // User's answers to follow-up questions
  userId: string;
  graphId?: string; // If creating goal for existing graph
  uid?: string; // For cost tracking
  stream?: boolean; // Whether to stream the response
  // Manual goal entry - if provided, use this goal exactly and only generate milestones
  manualGoal?: {
    title: string;
    description: string;
    type?: string;
    target?: string;
    estimatedTime?: number;
  };
}

/**
 * Result from goal generation
 */
export interface GenerateGoalResult {
  goal: LearningGoal;
  model?: string;
}

