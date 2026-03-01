/**
 * React Query hooks for course analytics
 * 
 * These hooks provide type-safe, cached access to analytics data with
 * automatic cache invalidation and refresh support.
 */

import { useQuery } from '@tanstack/react-query';
import { analyticsKeys } from '../../knowledge-graph/hooks/queryKeys';
import {
  analyticsApi,
  type TimeRangeOptions,
  type CourseAnalytics,
  type LessonAnalytics,
  type StudentAnalytics,
  type LanguageAnalytics,
  type ProgressDistribution,
  type AssessmentOverview,
  type LessonDropOff,
  type LanguageUsageStat,
} from '../analyticsApi';

// ============================================================================
// Re-export types
// ============================================================================

export type {
  TimeRangeOptions,
  CourseAnalytics,
  LessonAnalytics,
  StudentAnalytics,
  LanguageAnalytics,
  ProgressDistribution,
  AssessmentOverview,
  LessonDropOff,
  LanguageUsageStat,
};

// ============================================================================
// Query Hooks
// ============================================================================

/**
 * Get course-level analytics
 * 
 * Provides overall course metrics including enrollment stats, completion rates,
 * progress distribution, and assessment overview.
 */
export function useCourseAnalytics(
  graphId: string | undefined,
  options?: TimeRangeOptions & { enabled?: boolean }
) {
  const { enabled = true, ...timeRangeOptions } = options ?? {};
  
  return useQuery({
    queryKey: graphId 
      ? analyticsKeys.course(graphId, { timeRange: timeRangeOptions.period })
      : ['disabled'],
    queryFn: async () => {
      const response = await analyticsApi.getCourseAnalytics(graphId!, timeRangeOptions);
      return response.analytics;
    },
    enabled: enabled && !!graphId,
    staleTime: 5 * 60 * 1000, // Analytics are relatively stable, cache for 5 minutes
    refetchOnWindowFocus: true, // Refresh when user returns to tab
  });
}

/**
 * Get lesson-level analytics
 * 
 * Provides detailed metrics for a specific lesson including views,
 * completion rate, time spent, and difficulty scoring.
 */
export function useLessonAnalytics(
  graphId: string | undefined,
  conceptId: string | undefined,
  options?: TimeRangeOptions & { enabled?: boolean }
) {
  const { enabled = true, ...timeRangeOptions } = options ?? {};
  
  return useQuery({
    queryKey: graphId && conceptId
      ? analyticsKeys.lesson(graphId, conceptId, { timeRange: timeRangeOptions.period })
      : ['disabled'],
    queryFn: async () => {
      const response = await analyticsApi.getLessonAnalytics(graphId!, conceptId!, timeRangeOptions);
      return response.analytics;
    },
    enabled: enabled && !!graphId && !!conceptId,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Get student-level analytics
 * 
 * Provides detailed metrics for a specific student including progress,
 * time spent, assessment performance, and at-risk indicators.
 */
export function useStudentAnalytics(
  graphId: string | undefined,
  studentId: string | undefined,
  options?: { enabled?: boolean }
) {
  const { enabled = true } = options ?? {};
  
  return useQuery({
    queryKey: graphId && studentId
      ? analyticsKeys.student(graphId, studentId)
      : ['disabled'],
    queryFn: async () => {
      const response = await analyticsApi.getStudentAnalytics(graphId!, studentId!);
      return response.analytics;
    },
    enabled: enabled && !!graphId && !!studentId,
    staleTime: 2 * 60 * 1000, // Student data changes more frequently
  });
}

/**
 * Get language usage analytics
 * 
 * Provides language usage statistics for a course including
 * language distribution, bilingual mode usage, and translation coverage.
 */
export function useLanguageAnalytics(
  graphId: string | undefined,
  options?: { enabled?: boolean }
) {
  const { enabled = true } = options ?? {};
  
  return useQuery({
    queryKey: graphId
      ? analyticsKeys.language(graphId)
      : ['disabled'],
    queryFn: async () => {
      const response = await analyticsApi.getLanguageAnalytics(graphId!);
      return response.analytics;
    },
    enabled: enabled && !!graphId,
    staleTime: 10 * 60 * 1000, // Language stats are very stable
  });
}

// ============================================================================
// Derived Data Hooks
// ============================================================================

/**
 * Get at-risk students for a course
 * 
 * Returns students identified as at-risk based on engagement metrics.
 */
export function useAtRiskStudents(
  graphId: string | undefined,
  options?: { enabled?: boolean }
) {
  const courseAnalytics = useCourseAnalytics(graphId, options);
  
  return {
    ...courseAnalytics,
    data: courseAnalytics.data
      ? {
          count: courseAnalytics.data.atRiskStudents,
          totalActive: courseAnalytics.data.activeStudents,
          percentage: courseAnalytics.data.activeStudents > 0
            ? (courseAnalytics.data.atRiskStudents / courseAnalytics.data.activeStudents) * 100
            : 0,
        }
      : undefined,
  };
}

/**
 * Get course progress summary
 * 
 * Returns a summary of progress distribution across all students.
 */
export function useCourseProgressSummary(
  graphId: string | undefined,
  options?: { enabled?: boolean }
) {
  const courseAnalytics = useCourseAnalytics(graphId, options);
  
  return {
    ...courseAnalytics,
    data: courseAnalytics.data
      ? {
          distribution: courseAnalytics.data.progressDistribution,
          averageCompletion: courseAnalytics.data.averageCompletionRate,
          totalEnrollments: courseAnalytics.data.totalEnrollments,
          completedCount: courseAnalytics.data.completedStudents,
        }
      : undefined,
  };
}

/**
 * Get course assessment summary
 * 
 * Returns a summary of assessment performance across all students.
 */
export function useCourseAssessmentSummary(
  graphId: string | undefined,
  options?: { enabled?: boolean }
) {
  const courseAnalytics = useCourseAnalytics(graphId, options);
  
  return {
    ...courseAnalytics,
    data: courseAnalytics.data?.assessmentOverview,
  };
}

/**
 * Get enrollment trend data
 * 
 * Returns enrollment trend data for charting.
 */
export function useEnrollmentTrend(
  graphId: string | undefined,
  options?: TimeRangeOptions & { enabled?: boolean }
) {
  const courseAnalytics = useCourseAnalytics(graphId, options);
  
  return {
    ...courseAnalytics,
    data: courseAnalytics.data?.enrollmentTrend,
  };
}

/**
 * Get completion trend data
 * 
 * Returns completion trend data for charting.
 */
export function useCompletionTrend(
  graphId: string | undefined,
  options?: TimeRangeOptions & { enabled?: boolean }
) {
  const courseAnalytics = useCourseAnalytics(graphId, options);
  
  return {
    ...courseAnalytics,
    data: courseAnalytics.data?.completionTrend,
  };
}

// ============================================================================
// Utility Hooks
// ============================================================================

/**
 * Check if lesson is a problem area
 * 
 * Returns true if the lesson has high drop-off or low completion rates.
 */
export function useLessonProblemCheck(
  graphId: string | undefined,
  conceptId: string | undefined,
  thresholds?: {
    dropOffThreshold?: number;
    completionThreshold?: number;
  }
) {
  const lessonAnalytics = useLessonAnalytics(graphId, conceptId);
  const dropOffThreshold = thresholds?.dropOffThreshold ?? 30;
  const completionThreshold = thresholds?.completionThreshold ?? 50;
  
  return {
    ...lessonAnalytics,
    data: lessonAnalytics.data
      ? {
          isProblem: 
            lessonAnalytics.data.dropOffRate > dropOffThreshold ||
            lessonAnalytics.data.completionRate < completionThreshold,
          reasons: [
            lessonAnalytics.data.dropOffRate > dropOffThreshold
              ? `High drop-off rate (${lessonAnalytics.data.dropOffRate.toFixed(1)}%)`
              : null,
            lessonAnalytics.data.completionRate < completionThreshold
              ? `Low completion rate (${lessonAnalytics.data.completionRate.toFixed(1)}%)`
              : null,
          ].filter(Boolean) as string[],
          difficulty: lessonAnalytics.data.difficultyScore,
        }
      : undefined,
  };
}
