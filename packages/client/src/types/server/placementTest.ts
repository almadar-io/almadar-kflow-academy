// Placement test types - simplified for Lite build

export interface PlacementTest {
  id: string;
  graphId?: string;
  goalId?: string;
  userId?: string;
  topic?: string;
  questions: PlacementQuestion[];
  answers: PlacementAnswer[];
  assessedLevel: 'beginner' | 'intermediate' | 'advanced' | null;
  score?: number;
  completedAt?: number;
  createdAt?: number;
  updatedAt?: number;
}

export interface PlacementQuestion {
  id: string;
  question?: string;
  text?: string;
  type: 'multiple_choice' | 'true_false' | 'short_answer';
  options?: string[];
  correctAnswer?: string | string[];
  conceptIds?: string[];
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  explanation?: string;
}

export interface PlacementOption {
  id: string;
  text: string;
}

export interface PlacementAnswer {
  questionId: string;
  answer?: string | string[];
  selectedOptionId?: string;
  isCorrect?: boolean;
  answeredAt?: number;
}

export interface PlacementTestResult {
  test: PlacementTest;
  assessedLevel: 'beginner' | 'intermediate' | 'advanced';
  recommendedStartingLayer?: number;
  confidence: number;
  beginnerScore: number;
  intermediateScore: number;
  advancedScore: number;
}

export interface PlacementResult {
  score: number;
  recommendedLevel: 'beginner' | 'intermediate' | 'advanced';
  feedback: string;
}

export interface GeneratePlacementQuestionsResult {
  questions: PlacementQuestion[];
  model?: string;
}
