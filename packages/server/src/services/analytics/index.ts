/**
 * Analytics services
 */

export { CourseAnalyticsService } from './CourseAnalyticsService';

// Re-export types
export type {
  CourseAnalytics,
  LessonAnalytics,
  StudentAnalytics,
  LanguageAnalytics,
  ProgressDistribution,
  AssessmentOverview,
  LessonAssessmentStats,
  LanguageUsageStats,
  TranslationStats,
  AnalyticsQueryOptions,
} from '../../types/analytics';

export {
  createEmptyProgressDistribution,
  categorizeProgress,
} from '../../types/analytics';
