/**
 * Enrollment hooks exports
 */

export {
  // Query hooks
  useMyEnrollments,
  useMyEnrollmentsWithDetails,
  useEnrollment,
  useEnrollmentStatus,
  useEnrollmentProgress,
  useAccessibleLessons,
  useCanAdvanceToNext,
  
  // Mutation hooks
  useEnrollInCourse,
  useUnenrollFromCourse,
  useUpdateProgress,
  useCompleteLessonProgress,
  
  // Types
  type EnrollmentWithDetails,
  type EnrollmentQueryOptions,
  type CourseStudentsQueryOptions,
  type EnrolledStudent,
  type ProgressUpdate,
} from './useEnrollment';
