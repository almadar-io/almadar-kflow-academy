/**
 * Progress Service
 * 
 * @deprecated Old Firestore-based progress tracking service.
 * TODO: Migrate to graph-based progress tracking when ready.
 * 
 * Note: This service previously depended on courseService, moduleService, and lessonService
 * which have been removed as part of the graph-based publishing migration.
 * 
 * Functions that depended on those services will throw errors indicating migration is needed.
 */

import type { Enrollment } from '../types/publishing';

/**
 * Track lesson completion within course
 * @deprecated Requires migration to graph-based data
 */
export async function trackLessonCompletion(
  uid: string,
  enrollmentId: string,
  lessonId: string
): Promise<Enrollment> {
  throw new Error(
    'trackLessonCompletion requires migration to graph-based publishing. ' +
    'Old Firestore course/module/lesson services have been removed.'
  );
}

/**
 * Check if student can advance to next lesson
 * @deprecated Requires migration to graph-based data
 */
export async function canAdvanceToNext(
  uid: string,
  enrollmentId: string,
  lessonId: string
): Promise<{ canAdvance: boolean; reason?: string; nextLessonId?: string }> {
  throw new Error(
    'canAdvanceToNext requires migration to graph-based publishing. ' +
    'Old Firestore course/module/lesson services have been removed.'
  );
}

/**
 * Get overall progress through course
 * @deprecated Requires migration to graph-based data
 */
export async function getProgress(
  uid: string,
  enrollmentId: string
): Promise<{
  enrollment: Enrollment;
  totalLessons: number;
  completedLessons: number;
  totalModules: number;
  completedModules: number;
  progressPercentage: number;
  currentModule: any | null;
  currentLesson: any | null;
  nextLesson: any | null;
}> {
  throw new Error(
    'getProgress requires migration to graph-based publishing. ' +
    'Old Firestore course/module/lesson services have been removed.'
  );
}

/**
 * Get list of lessons student can access in course
 * @deprecated Requires migration to graph-based data
 */
export async function getAccessibleLessons(
  uid: string,
  enrollmentId: string
): Promise<any[]> {
  throw new Error(
    'getAccessibleLessons requires migration to graph-based publishing. ' +
    'Old Firestore course/module/lesson services have been removed.'
  );
}
