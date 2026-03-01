/**
 * API client for placement test endpoints
 */

import { apiClient } from '../../services/apiClient';
import { auth } from '../../config/firebase';
import type {
  PlacementTest,
  PlacementQuestion,
  PlacementAnswer,
  PlacementTestResult,
  GeneratePlacementQuestionsResult,
} from '@/types/server/placementTest';

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

export const placementTestApi = {
  /**
   * Generate placement test questions
   */
  generateQuestions: async (options: {
    goalId: string;
    graphId: string;
    topic: string;
  }): Promise<GeneratePlacementQuestionsResult> => {
    const headers = await withAuthHeaders();
    return apiClient.fetch('/api/learning/placement/generate-questions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...headers },
      body: JSON.stringify(options),
    });
  },

  /**
   * Create a new placement test
   */
  createTest: async (options: {
    goalId: string;
    graphId: string;
    topic: string;
  }): Promise<{ test: PlacementTest }> => {
    const headers = await withAuthHeaders();
    return apiClient.fetch('/api/learning/placement/tests', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...headers },
      body: JSON.stringify(options),
    });
  },

  /**
   * Get a placement test by ID
   */
  getTest: async (testId: string): Promise<{ test: PlacementTest }> => {
    const headers = await withAuthHeaders();
    return apiClient.fetch(`/api/learning/placement/tests/${testId}`, {
      headers: { 'Content-Type': 'application/json', ...headers },
    });
  },

  /**
   * Update placement test with questions
   */
  updateTestQuestions: async (
    testId: string,
    questions: PlacementQuestion[]
  ): Promise<{ test: PlacementTest }> => {
    const headers = await withAuthHeaders();
    return apiClient.fetch(`/api/learning/placement/tests/${testId}/questions`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...headers },
      body: JSON.stringify({ questions }),
    });
  },

  /**
   * Submit placement test answers
   */
  submitTest: async (
    testId: string,
    answers: PlacementAnswer[]
  ): Promise<{ result: PlacementTestResult }> => {
    const headers = await withAuthHeaders();
    return apiClient.fetch(`/api/learning/placement/tests/${testId}/submit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...headers },
      body: JSON.stringify({ answers }),
    });
  },

  /**
   * Get all placement tests for the current user
   */
  getUserTests: async (): Promise<{ tests: PlacementTest[] }> => {
    const headers = await withAuthHeaders();
    return apiClient.fetch('/api/learning/placement/tests', {
      headers: { 'Content-Type': 'application/json', ...headers },
    });
  },

  /**
   * Get placement tests for a specific goal
   */
  getTestsByGoal: async (goalId: string): Promise<{ tests: PlacementTest[] }> => {
    const headers = await withAuthHeaders();
    return apiClient.fetch(`/api/learning/placement/goals/${goalId}/tests`, {
      headers: { 'Content-Type': 'application/json', ...headers },
    });
  },

  /**
   * Delete a placement test
   */
  deleteTest: async (testId: string): Promise<{ success: boolean }> => {
    const headers = await withAuthHeaders();
    return apiClient.fetch(`/api/learning/placement/tests/${testId}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json', ...headers },
    });
  },
};

