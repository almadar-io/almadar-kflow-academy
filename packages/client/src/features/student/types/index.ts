import type { FlashCard } from '../../concepts/types';

/**
 * Enrollment type - matches the backend type
 */
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
  assessmentStatus: Map<string, any>;
  canSkipAhead: boolean;
  notificationEnabled: boolean;
  nextNotificationAt?: number;
}

/**
 * Lesson preview data structure
 */
export interface LessonPreview {
  id: string;
  title: string;
  description: string;
  lessonContent?: string;
  flashCards?: FlashCard[];
  moduleTitle: string;
  moduleId: string;
  sequence: number;
}

/**
 * Progress data structure
 */
export interface ProgressData {
  enrollment: any;
  totalLessons: number;
  completedLessons: number;
  totalModules: number;
  completedModules: number;
  progressPercentage: number;
  currentModule: any | null;
  currentLesson: any | null;
  nextLesson: any | null;
}

