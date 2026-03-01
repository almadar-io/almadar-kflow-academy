/**
 * Analytics hooks exports
 */

export {
  // Query hooks
  useCourseAnalytics,
  useLessonAnalytics,
  useStudentAnalytics,
  useLanguageAnalytics,
  
  // Derived data hooks
  useAtRiskStudents,
  useCourseProgressSummary,
  useCourseAssessmentSummary,
  useEnrollmentTrend,
  useCompletionTrend,
  
  // Utility hooks
  useLessonProblemCheck,
  
  // Types
  type TimeRangeOptions,
  type CourseAnalytics,
  type LessonAnalytics,
  type StudentAnalytics,
  type LanguageAnalytics,
  type ProgressDistribution,
  type AssessmentOverview,
  type LessonDropOff,
  type LanguageUsageStat,
} from './useCourseAnalytics';
