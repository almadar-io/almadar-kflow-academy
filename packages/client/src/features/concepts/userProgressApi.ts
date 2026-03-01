import { apiClient } from '../../services/apiClient';
import { auth } from '../../config/firebase';
import type { UserProgress, BloomLevel } from './types';

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

// UserProgress API
export const userProgressApi = {
  /**
   * Save or update UserProgress for a concept
   */
  saveUserProgress: async (conceptId: string, progress: Partial<{
    conceptName: string;
    graphId?: string;
    courseId?: string;
    lessonId?: string;
    masteryLevel: 0 | 1 | 2 | 3;
    activationResponse?: string;
    reflectionNotes?: string[];
    bloomAnswered?: Record<number, boolean>;
    bloomLevelsCompleted?: BloomLevel[];
  }>) => {
    const headers = await withAuthHeaders();
    return apiClient.fetch('/api/user/progress', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...headers },
      body: JSON.stringify({ conceptId, ...progress }),
    });
  },

  /**
   * Get UserProgress for a specific concept
   */
  getUserProgress: async (conceptId: string) => {
    const headers = await withAuthHeaders();
    // URL-encode conceptId to handle special characters like "/"
    const encodedConceptId = encodeURIComponent(conceptId);
    return apiClient.fetch(`/api/user/progress/${encodedConceptId}`, {
      headers: { 'Content-Type': 'application/json', ...headers },
    });
  },

  /**
   * Get all UserProgress for the current user
   */
  getAllUserProgress: async () => {
    const headers = await withAuthHeaders();
    return apiClient.fetch('/api/user/progress', {
      headers: { 'Content-Type': 'application/json', ...headers },
    });
  },

  /**
   * Get count of concepts mastered
   */
  getConceptsMastered: async () => {
    const headers = await withAuthHeaders();
    return apiClient.fetch('/api/user/statistics/concepts-mastered', {
      headers: { 'Content-Type': 'application/json', ...headers },
    });
  },

  /**
   * Track concept access (updates lastStudied timestamp)
   * Call this when a user views a concept to update "last accessed" time
   */
  trackConceptAccess: async (conceptId: string, conceptName?: string, graphId?: string) => {
    const headers = await withAuthHeaders();
    // URL-encode conceptId to handle special characters like "/"
    const encodedConceptId = encodeURIComponent(conceptId);
    return apiClient.fetch(`/api/user/progress/${encodedConceptId}/track-access`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...headers },
      body: JSON.stringify({ conceptName, graphId }),
    });
  },
};

