/**
 * Enrollment services
 */

export { EnrollmentService } from './EnrollmentService';

// Re-export types
export type {
  CourseEnrollment,
  StudentProgress,
  StudentEnrollmentSettings,
  EnrollOptions,
  EnrollmentQueryOptions,
  ProgressUpdate,
  AssessmentAttempt,
  EnrolledStudent,
  CourseStudentsQueryOptions,
  EnrollmentStatus,
  AssessmentResult,
  AssessmentAnswerRecord,
} from '../../types/enrollment';

export {
  createDefaultProgress,
  createDefaultSettings,
} from '../../types/enrollment';
