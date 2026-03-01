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

export interface RecentActivity {
  id: string;
  type: 'course_accessed' | 'lesson_completed' | 'concept_studied' | 'course_enrolled';
  resourceId: string;
  resourceName: string;
  timestamp: number;
  metadata?: {
    courseId?: string;
    lessonId?: string;
    conceptId?: string;
    graphId?: string; // Added for concept navigation
    progressPercentage?: number;
  };
}

export interface StatisticsSummary {
  learningStreak: number;
  conceptsMastered: number;
  activeCourses: number;
  recentActivity: RecentActivity[];
}

// Statistics API
export const statisticsApi = {
  /**
   * Get learning streak
   */
  getLearningStreak: async (): Promise<number> => {
    const headers = await withAuthHeaders();
    const result = await apiClient.fetch('/api/user/statistics/streak', {
      headers: { 'Content-Type': 'application/json', ...headers },
    });
    return result.streak || 0;
  },

  /**
   * Get concepts mastered count
   */
  getConceptsMastered: async (): Promise<number> => {
    const headers = await withAuthHeaders();
    const result = await apiClient.fetch('/api/user/statistics/concepts-mastered', {
      headers: { 'Content-Type': 'application/json', ...headers },
    });
    return result.count || 0;
  },

  /**
   * Get recent activity
   */
  getRecentActivity: async (limit: number = 10): Promise<RecentActivity[]> => {
    const headers = await withAuthHeaders();
    const result = await apiClient.fetch(`/api/user/statistics/recent-activity?limit=${limit}`, {
      headers: { 'Content-Type': 'application/json', ...headers },
    });
    return result.activity || [];
  },

  /**
   * Get statistics summary (all stats in one call)
   */
  getStatisticsSummary: async (activityLimit: number = 5): Promise<StatisticsSummary> => {
    const headers = await withAuthHeaders();
    const result = await apiClient.fetch(`/api/user/statistics/summary?activityLimit=${activityLimit}`, {
      headers: { 'Content-Type': 'application/json', ...headers },
    });
    return result.statistics;
  },

  /**
   * Get detailed statistics
   */
  getDetailedStatistics: async (): Promise<any> => {
    const headers = await withAuthHeaders();
    const result = await apiClient.fetch('/api/user/statistics/detailed', {
      headers: { 'Content-Type': 'application/json', ...headers },
    });
    return result.statistics;
  },
};

