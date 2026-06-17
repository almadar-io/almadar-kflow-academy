/**
 * Enrollment domain types
 *
 * Shared between client and server. Firestore stores `assessmentStatus` as a
 * plain object; the canonical runtime shape is a `Map`.
 */

export interface AssessmentStatus {
  lessonId: string;
  status: 'not_started' | 'in_progress' | 'passed' | 'failed' | 'skipped';
  score?: number;
  maxScore?: number;
  attempts: number;
  lastAttemptAt?: number;
  canAdvance: boolean;
}

export interface Enrollment {
  id: string;
  studentId: string;
  courseId: string;
  enrolledAt: number;

  currentModuleId: string;
  currentLessonId: string;
  completedModuleIds: string[];
  completedLessonIds: string[];
  startedAt: number;
  lastAccessedAt: number;

  accessibleModuleIds: string[];
  accessibleLessonIds: string[];
  lockedModuleIds: string[];
  lockedLessonIds: string[];

  assessmentStatus: Map<string, AssessmentStatus>;
  canSkipAhead: boolean;

  notificationEnabled: boolean;
  nextNotificationAt?: number;
}

/** Firestore-serializable enrollment before `assessmentStatus` is converted to a Map. */
export type RawEnrollment = Omit<Enrollment, 'assessmentStatus'> & {
  assessmentStatus?: Record<string, AssessmentStatus>;
};
