/**
 * Analytics API client
 * 
 * Provides methods to interact with the analytics service endpoints.
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

export interface TimeRangeOptions {
  startDate?: number;
  endDate?: number;
  period?: '7d' | '30d' | '90d' | 'all';
}

export interface ProgressDistribution {
  notStarted: number;
  inProgress: number;
  nearComplete: number;
  completed: number;
}

export interface AssessmentOverview {
  totalAttempts: number;
  passRate: number;
  averageScore: number;
  averageAttemptsToPass: number;
}

export interface CourseAnalytics {
  graphId: string;
  courseTitle: string;
  totalEnrollments: number;
  activeStudents: number;
  completedStudents: number;
  droppedStudents: number;
  averageCompletionRate: number;
  averageRating?: number;
  progressDistribution: ProgressDistribution;
  assessmentOverview: AssessmentOverview;
  enrollmentTrend: Array<{
    date: string;
    count: number;
  }>;
  completionTrend: Array<{
    date: string;
    count: number;
  }>;
  atRiskStudents: number;
  lastUpdated: number;
}

export interface LessonDropOff {
  lessonId: string;
  lessonTitle: string;
  dropOffCount: number;
  dropOffRate: number;
}

export interface LessonAnalytics {
  graphId: string;
  conceptId: string;
  lessonTitle: string;
  totalViews: number;
  uniqueViews: number;
  averageTimeSpentSeconds: number;
  completionRate: number;
  dropOffRate: number;
  difficultyScore: number;
  assessmentStats?: {
    totalAttempts: number;
    passRate: number;
    averageScore: number;
  };
  flashcardStats?: {
    totalReviews: number;
    averageRetention: number;
  };
  previousLessonDropOff?: LessonDropOff;
  lastUpdated: number;
}

export interface StudentAnalytics {
  graphId: string;
  studentId: string;
  studentName: string;
  studentEmail?: string;
  enrollmentId: string;
  enrolledAt: number;
  lastActiveAt?: number;
  percentComplete: number;
  lessonsCompleted: number;
  totalLessons: number;
  totalTimeSpentSeconds: number;
  averageSessionDurationSeconds: number;
  assessmentAttempts: number;
  assessmentPassRate: number;
  averageAssessmentScore: number;
  flashcardsReviewed: number;
  engagementScore: number;
  isAtRisk: boolean;
  atRiskReasons?: string[];
  lastCompletedLessonId?: string;
  currentLessonId?: string;
}

export interface LanguageUsageStat {
  language: string;
  languageName: string;
  userCount: number;
  percentage: number;
}

export interface LanguageAnalytics {
  graphId: string;
  primaryLanguage: string;
  availableLanguages: string[];
  languageUsage: LanguageUsageStat[];
  bilingualModeUsage: {
    enabled: number;
    disabled: number;
    percentage: number;
  };
  translationCoverage: {
    lessons: number;
    flashcards: number;
    assessments: number;
  };
  lastUpdated: number;
}

// ============================================================================
// API Functions
// ============================================================================

export const analyticsApi = {
  /**
   * Get course-level analytics
   */
  getCourseAnalytics: async (
    graphId: string,
    options?: TimeRangeOptions
  ): Promise<{ analytics: CourseAnalytics }> => {
    const headers = await withAuthHeaders();
    const params = new URLSearchParams();
    if (options?.startDate) params.append('startDate', options.startDate.toString());
    if (options?.endDate) params.append('endDate', options.endDate.toString());
    if (options?.period) params.append('period', options.period);
    
    const query = params.toString() ? `?${params.toString()}` : '';
    return apiClient.fetch(`/api/analytics/graphs/${graphId}/course${query}`, {
      headers: { 'Content-Type': 'application/json', ...headers },
    });
  },

  /**
   * Get lesson-level analytics
   */
  getLessonAnalytics: async (
    graphId: string,
    conceptId: string,
    options?: TimeRangeOptions
  ): Promise<{ analytics: LessonAnalytics }> => {
    const headers = await withAuthHeaders();
    const params = new URLSearchParams();
    if (options?.startDate) params.append('startDate', options.startDate.toString());
    if (options?.endDate) params.append('endDate', options.endDate.toString());
    if (options?.period) params.append('period', options.period);
    
    const query = params.toString() ? `?${params.toString()}` : '';
    return apiClient.fetch(`/api/analytics/graphs/${graphId}/lessons/${conceptId}${query}`, {
      headers: { 'Content-Type': 'application/json', ...headers },
    });
  },

  /**
   * Get student-level analytics
   */
  getStudentAnalytics: async (
    graphId: string,
    studentId: string
  ): Promise<{ analytics: StudentAnalytics }> => {
    const headers = await withAuthHeaders();
    return apiClient.fetch(`/api/analytics/graphs/${graphId}/students/${studentId}`, {
      headers: { 'Content-Type': 'application/json', ...headers },
    });
  },

  /**
   * Get language usage analytics
   */
  getLanguageAnalytics: async (
    graphId: string
  ): Promise<{ analytics: LanguageAnalytics }> => {
    const headers = await withAuthHeaders();
    return apiClient.fetch(`/api/analytics/graphs/${graphId}/languages`, {
      headers: { 'Content-Type': 'application/json', ...headers },
    });
  },
};
