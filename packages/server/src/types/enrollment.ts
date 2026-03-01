/**
 * Enrollment types for the new user-centric enrollment system
 * 
 * Enrollments are stored under users/{studentId}/courseEnrollments/{enrollmentId}
 * This allows efficient querying of a student's enrollments without needing
 * a collectionGroup query.
 */

/**
 * Course enrollment stored under user profile
 * Path: users/{studentId}/courseEnrollments/{enrollmentId}
 */
export interface CourseEnrollment {
  id: string;
  
  // Course reference (points to mentor's graph)
  mentorId: string;         // Who owns the course graph
  graphId: string;          // The graph ID (course)
  
  // Enrollment metadata
  enrolledAt: number;
  enrolledVia: 'public' | 'private_link' | 'invite' | 'direct';
  
  // Progress tracking
  progress: StudentProgress;
  
  // Settings
  settings: StudentEnrollmentSettings;
  
  // Status
  status: EnrollmentStatus;
  
  // Timestamps
  createdAt: number;
  updatedAt: number;
}

/**
 * Enrollment status
 */
export type EnrollmentStatus = 'active' | 'paused' | 'completed' | 'dropped' | 'expired';

/**
 * Student progress within a course
 */
export interface StudentProgress {
  // Current position (using graph node IDs)
  currentLayerId?: string;    // Current layer (module)
  currentConceptId?: string;  // Current concept (lesson)
  
  // Completion tracking (node IDs)
  completedLayers: string[];
  completedConcepts: string[];
  
  // Assessment results keyed by conceptId
  assessmentResults: Record<string, AssessmentResult>;
  
  // Time tracking
  totalTimeSpent: number;     // minutes
  lastAccessedAt: number;
  
  // Overall percentage
  overallProgress: number;    // 0-100
}

/**
 * Assessment result for a student
 */
export interface AssessmentResult {
  assessmentId: string;
  conceptId: string;
  
  // Results
  score: number;
  maxScore: number;
  percentage: number;
  passed: boolean;
  
  // Attempts
  attempts: number;
  lastAttemptAt: number;
  bestScore?: number;
  
  // Answers (for review)
  answers?: AssessmentAnswerRecord[];
}

/**
 * Assessment answer record
 */
export interface AssessmentAnswerRecord {
  questionId: string;
  answer: string | string[];
  isCorrect?: boolean;
  pointsEarned?: number;
}

/**
 * Student's enrollment settings
 */
export interface StudentEnrollmentSettings {
  // Language
  preferredLanguage: string;
  showBilingualMode: boolean;
  
  // Notifications
  notificationsEnabled: boolean;
  notificationFrequency: 'daily' | 'weekly' | 'never' | 'custom';
  customNotificationDays?: number;
  nextNotificationAt?: number;
  
  // Learning preferences
  autoAdvance: boolean;       // Auto-advance to next lesson
  showHints: boolean;
}

/**
 * Options for enrolling a student
 */
export interface EnrollOptions {
  enrolledVia?: CourseEnrollment['enrolledVia'];
  preferredLanguage?: string;
  notificationsEnabled?: boolean;
}

/**
 * Options for querying enrollments
 */
export interface EnrollmentQueryOptions {
  status?: EnrollmentStatus | EnrollmentStatus[];
  limit?: number;
  offset?: number;
  orderBy?: 'enrolledAt' | 'lastAccessedAt' | 'overallProgress';
  orderDirection?: 'asc' | 'desc';
}

/**
 * Progress update input
 */
export interface ProgressUpdate {
  currentLayerId?: string;
  currentConceptId?: string;
  completedConceptId?: string;
  completedLayerId?: string;
  timeSpent?: number;  // minutes to add
}

/**
 * Assessment attempt input
 */
export interface AssessmentAttempt {
  assessmentId: string;
  conceptId: string;
  score: number;
  maxScore: number;
  answers?: AssessmentAnswerRecord[];
}

/**
 * Enrolled student view (for mentors)
 */
export interface EnrolledStudent {
  enrollmentId: string;
  studentId: string;
  studentName?: string;
  studentEmail?: string;
  
  // Enrollment info
  enrolledAt: number;
  status: EnrollmentStatus;
  
  // Progress summary
  overallProgress: number;
  completedLessons: number;
  totalLessons: number;
  lastAccessedAt: number;
  
  // Assessment summary
  assessmentsPassed: number;
  assessmentsFailed: number;
  averageScore?: number;
}

/**
 * Course students query options
 */
export interface CourseStudentsQueryOptions {
  status?: EnrollmentStatus | EnrollmentStatus[];
  limit?: number;
  offset?: number;
  orderBy?: 'enrolledAt' | 'lastAccessedAt' | 'overallProgress' | 'studentName';
  orderDirection?: 'asc' | 'desc';
}

/**
 * Create default progress object
 */
export function createDefaultProgress(): StudentProgress {
  return {
    currentLayerId: undefined,
    currentConceptId: undefined,
    completedLayers: [],
    completedConcepts: [],
    assessmentResults: {},
    totalTimeSpent: 0,
    lastAccessedAt: Date.now(),
    overallProgress: 0,
  };
}

/**
 * Create default enrollment settings
 */
export function createDefaultSettings(options?: Partial<StudentEnrollmentSettings>): StudentEnrollmentSettings {
  return {
    preferredLanguage: options?.preferredLanguage || 'en',
    showBilingualMode: options?.showBilingualMode ?? false,
    notificationsEnabled: options?.notificationsEnabled ?? true,
    notificationFrequency: options?.notificationFrequency || 'weekly',
    customNotificationDays: options?.customNotificationDays,
    nextNotificationAt: options?.nextNotificationAt,
    autoAdvance: options?.autoAdvance ?? true,
    showHints: options?.showHints ?? true,
  };
}
