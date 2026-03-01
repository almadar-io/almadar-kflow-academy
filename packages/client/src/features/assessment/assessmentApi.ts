/**
 * Assessment API client
 * 
 * Provides methods to interact with assessment service endpoints.
 * This combines mentor-side (CRUD) and student-side (submission) functionality.
 */

import { apiClient } from '../../services/apiClient';
import { auth } from '../../config/firebase';

// Helper function for auth headers
const withAuthHeaders = async (): Promise<HeadersInit> => {
  const currentUser = auth.currentUser;
  if (!currentUser) {
    throw new Error('User is not authenticated');
  }
  const token = await currentUser.getIdToken();
  return {
    Authorization: `Bearer ${token}`,
  };
};

// ============================================================================
// Types
// ============================================================================

export type QuestionType = 'multiple_choice' | 'true_false' | 'short_answer' | 'essay';

export interface AssessmentQuestion {
  id: string;
  type: QuestionType;
  question: string;
  options?: string[];
  correctAnswer?: string | number;
  points: number;
  explanation?: string;
  order: number;
}

export interface Assessment {
  id: string;
  courseId: string;
  moduleId: string;
  lessonId: string;
  conceptId: string;
  title: string;
  description?: string;
  questions: AssessmentQuestion[];
  passingScore: number;
  timeLimit?: number; // in minutes
  maxAttempts?: number;
  shuffleQuestions: boolean;
  showCorrectAnswers: boolean;
  isPublished: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface AssessmentSubmission {
  id: string;
  assessmentId: string;
  studentId: string;
  enrollmentId: string;
  lessonId: string;
  answers: Array<{
    questionId: string;
    answer: string | number;
    isCorrect?: boolean;
    pointsAwarded?: number;
    feedback?: string;
  }>;
  score: number;
  maxScore: number;
  percentage: number;
  passed: boolean;
  timeSpentSeconds: number;
  submittedAt: number;
  evaluatedAt?: number;
  attemptNumber: number;
}

export interface CreateAssessmentInput {
  title: string;
  description?: string;
  questions: Omit<AssessmentQuestion, 'id'>[];
  passingScore: number;
  timeLimit?: number;
  maxAttempts?: number;
  shuffleQuestions?: boolean;
  showCorrectAnswers?: boolean;
}

export interface UpdateAssessmentInput {
  title?: string;
  description?: string;
  questions?: Omit<AssessmentQuestion, 'id'>[];
  passingScore?: number;
  timeLimit?: number;
  maxAttempts?: number;
  shuffleQuestions?: boolean;
  showCorrectAnswers?: boolean;
  isPublished?: boolean;
}

export interface SubmitAssessmentInput {
  answers: Array<{
    questionId: string;
    answer: string | number;
  }>;
  timeSpentSeconds: number;
}

export interface AnswerEvaluation {
  isCorrect: boolean;
  pointsAwarded: number;
  maxPoints: number;
  feedback: string;
  correctAnswer?: string;
}

// ============================================================================
// API Functions
// ============================================================================

export const assessmentApi = {
  // ============================================================================
  // Mentor APIs (CRUD)
  // ============================================================================
  
  /**
   * Create a new assessment for a lesson
   */
  createAssessment: async (
    courseId: string,
    moduleId: string,
    lessonId: string,
    data: CreateAssessmentInput
  ): Promise<{ assessment: Assessment }> => {
    const headers = await withAuthHeaders();
    return apiClient.fetch(
      `/api/mentor/courses/${courseId}/modules/${moduleId}/lessons/${lessonId}/assessments`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify(data),
      }
    );
  },

  /**
   * Get assessment by ID
   */
  getAssessment: async (
    courseId: string,
    assessmentId: string
  ): Promise<{ assessment: Assessment }> => {
    const headers = await withAuthHeaders();
    return apiClient.fetch(`/api/mentor/courses/${courseId}/assessments/${assessmentId}`, {
      headers: { 'Content-Type': 'application/json', ...headers },
    });
  },

  /**
   * Get assessment for a specific lesson
   */
  getAssessmentByLesson: async (
    courseId: string,
    moduleId: string,
    lessonId: string
  ): Promise<{ assessment: Assessment | null }> => {
    const headers = await withAuthHeaders();
    return apiClient.fetch(
      `/api/mentor/courses/${courseId}/modules/${moduleId}/lessons/${lessonId}/assessments`,
      {
        headers: { 'Content-Type': 'application/json', ...headers },
      }
    );
  },

  /**
   * Update an assessment
   */
  updateAssessment: async (
    courseId: string,
    moduleId: string,
    lessonId: string,
    assessmentId: string,
    updates: UpdateAssessmentInput
  ): Promise<{ assessment: Assessment }> => {
    const headers = await withAuthHeaders();
    return apiClient.fetch(
      `/api/mentor/courses/${courseId}/modules/${moduleId}/lessons/${lessonId}/assessments/${assessmentId}`,
      {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify(updates),
      }
    );
  },

  /**
   * Delete an assessment
   */
  deleteAssessment: async (
    courseId: string,
    assessmentId: string
  ): Promise<{ success: boolean }> => {
    const headers = await withAuthHeaders();
    return apiClient.fetch(`/api/mentor/courses/${courseId}/assessments/${assessmentId}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json', ...headers },
    });
  },

  // ============================================================================
  // Student APIs (Submission)
  // ============================================================================

  /**
   * Get assessment for student (may hide correct answers)
   */
  getStudentAssessment: async (
    courseId: string,
    lessonId: string
  ): Promise<{ assessment: Assessment | null }> => {
    const headers = await withAuthHeaders();
    return apiClient.fetch(`/api/student/courses/${courseId}/lessons/${lessonId}/assessments`, {
      headers: { 'Content-Type': 'application/json', ...headers },
    });
  },

  /**
   * Submit assessment answers
   */
  submitAssessment: async (
    assessmentId: string,
    courseId: string,
    enrollmentId: string,
    lessonId: string,
    input: SubmitAssessmentInput
  ): Promise<{ submission: AssessmentSubmission }> => {
    const headers = await withAuthHeaders();
    return apiClient.fetch(`/api/student/assessments/${assessmentId}/submit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...headers },
      body: JSON.stringify({
        courseId,
        assessmentId,
        enrollmentId,
        lessonId,
        answers: input.answers,
        timeSpentSeconds: input.timeSpentSeconds,
      }),
    });
  },

  /**
   * Get a specific submission
   */
  getSubmission: async (
    submissionId: string
  ): Promise<{ submission: AssessmentSubmission }> => {
    const headers = await withAuthHeaders();
    return apiClient.fetch(`/api/student/assessments/submissions/${submissionId}`, {
      headers: { 'Content-Type': 'application/json', ...headers },
    });
  },

  /**
   * Get all submissions for an assessment
   */
  getSubmissions: async (
    assessmentId: string,
    enrollmentId?: string
  ): Promise<{ submissions: AssessmentSubmission[] }> => {
    const headers = await withAuthHeaders();
    const query = enrollmentId ? `?enrollmentId=${enrollmentId}` : '';
    return apiClient.fetch(`/api/student/assessments/${assessmentId}/submissions${query}`, {
      headers: { 'Content-Type': 'application/json', ...headers },
    });
  },

  /**
   * Get student's submissions for an enrollment
   */
  getEnrollmentSubmissions: async (
    enrollmentId: string
  ): Promise<{ submissions: AssessmentSubmission[] }> => {
    const headers = await withAuthHeaders();
    return apiClient.fetch(`/api/student/enrollments/${enrollmentId}/submissions`, {
      headers: { 'Content-Type': 'application/json', ...headers },
    });
  },

  /**
   * Evaluate a single answer (for essay/short answer)
   */
  evaluateAnswer: async (
    courseId: string,
    moduleId: string,
    lessonId: string,
    question: string,
    studentAnswer: string,
    correctAnswer: string | undefined,
    maxPoints: number
  ): Promise<AnswerEvaluation> => {
    const headers = await withAuthHeaders();
    return apiClient.fetch('/api/student/assessments/evaluate-answer', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...headers },
      body: JSON.stringify({
        courseId,
        moduleId,
        lessonId,
        question,
        studentAnswer,
        correctAnswer,
        maxPoints,
      }),
    });
  },
};
