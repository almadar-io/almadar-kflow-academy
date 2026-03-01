/**
 * Assessment API
 * 
 * API client for assessment operations.
 * Note: Assessments are stored separately from the course graph structure.
 * This API uses the existing assessment endpoints.
 */

import { apiClient } from '../../services/apiClient';
import { auth } from '../../config/firebase';
import type { Assessment } from '../../../server/src/types/publishing';

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

export interface CreateAssessmentInput {
  title: string;
  description?: string;
  questions?: any[];
  passingScore?: number;
  maxAttempts?: number;
  timeLimit?: number;
  showResults?: boolean;
  randomizeQuestions?: boolean;
  autoGenerate?: boolean;
  numQuestions?: number;
  questionTypes?: ('multiple_choice' | 'true_false' | 'short_answer' | 'essay')[];
}

export interface UpdateAssessmentInput {
  title?: string;
  description?: string;
  questions?: any[];
  passingScore?: number;
  maxAttempts?: number;
  timeLimit?: number;
  showResults?: boolean;
  randomizeQuestions?: boolean;
}

export const assessmentApi = {
  /**
   * Create a new assessment for a lesson
   * Note: courseId here is the graphId for graph-based publishing
   */
  createAssessment: async (
    courseId: string,
    moduleId: string,
    lessonId: string,
    data: CreateAssessmentInput
  ): Promise<{ assessment: Assessment }> => {
    const headers = await withAuthHeaders();
    return apiClient.fetch(`/api/mentor/courses/${courseId}/modules/${moduleId}/lessons/${lessonId}/assessments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...headers },
      body: JSON.stringify(data),
    });
  },

  /**
   * Update an existing assessment
   */
  updateAssessment: async (
    courseId: string,
    moduleId: string,
    lessonId: string,
    assessmentId: string,
    data: UpdateAssessmentInput
  ): Promise<{ assessment: Assessment }> => {
    const headers = await withAuthHeaders();
    return apiClient.fetch(`/api/mentor/courses/${courseId}/modules/${moduleId}/lessons/${lessonId}/assessments/${assessmentId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...headers },
      body: JSON.stringify(data),
    });
  },

  /**
   * Get assessment by lesson
   */
  getAssessmentByLesson: async (
    courseId: string,
    moduleId: string,
    lessonId: string
  ): Promise<{ assessment: Assessment | null }> => {
    const headers = await withAuthHeaders();
    return apiClient.fetch(`/api/mentor/courses/${courseId}/modules/${moduleId}/lessons/${lessonId}/assessments`, {
      headers: { 'Content-Type': 'application/json', ...headers },
    });
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
};
