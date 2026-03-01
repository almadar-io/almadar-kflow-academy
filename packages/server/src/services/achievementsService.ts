import { getFirestore } from '../config/firebaseAdmin';
import { getStudentEnrollments } from './enrollmentService';
import { getConceptsMastered } from './userProgressService';
import { getLearningStreak } from './statisticsService';

/**
 * Achievement types
 */
export type AchievementType =
  | 'first_lesson_completed'
  | 'first_course_completed'
  | 'streak_7_days'
  | 'streak_30_days'
  | 'concepts_mastered_10'
  | 'concepts_mastered_50'
  | 'courses_completed_5';

/**
 * Achievement data structure
 */
export interface Achievement {
  id: string;
  type: AchievementType;
  name: string;
  description: string;
  icon: string; // Icon name or emoji
  unlockedAt: number; // timestamp
  progress?: number; // Current progress (0-100) if not yet unlocked
}

/**
 * Achievement definitions
 */
const ACHIEVEMENT_DEFINITIONS: Record<AchievementType, Omit<Achievement, 'id' | 'unlockedAt' | 'progress'>> = {
  first_lesson_completed: {
    type: 'first_lesson_completed',
    name: 'First Steps',
    description: 'Complete your first lesson',
    icon: '🎯',
  },
  first_course_completed: {
    type: 'first_course_completed',
    name: 'Course Master',
    description: 'Complete your first course',
    icon: '🏆',
  },
  streak_7_days: {
    type: 'streak_7_days',
    name: 'Week Warrior',
    description: 'Maintain a 7-day learning streak',
    icon: '🔥',
  },
  streak_30_days: {
    type: 'streak_30_days',
    name: 'Monthly Master',
    description: 'Maintain a 30-day learning streak',
    icon: '💪',
  },
  concepts_mastered_10: {
    type: 'concepts_mastered_10',
    name: 'Knowledge Seeker',
    description: 'Master 10 concepts',
    icon: '📚',
  },
  concepts_mastered_50: {
    type: 'concepts_mastered_50',
    name: 'Wisdom Keeper',
    description: 'Master 50 concepts',
    icon: '🌟',
  },
  courses_completed_5: {
    type: 'courses_completed_5',
    name: 'Scholar',
    description: 'Complete 5 courses',
    icon: '🎓',
  },
};

/**
 * Achievement event types
 */
export type AchievementEvent =
  | { type: 'lesson_completed' }
  | { type: 'course_completed'; courseId: string }
  | { type: 'streak_updated'; streak: number }
  | { type: 'concept_mastered' };

/**
 * Check and award achievements based on an event
 */
export async function checkAndAwardAchievements(
  uid: string,
  event: AchievementEvent
): Promise<Achievement[]> {
  const db = getFirestore();
  const achievementsRef = db.collection('users').doc(uid).collection('achievements');
  
  const newlyAwarded: Achievement[] = [];

  try {
    // Get current user stats
    const [enrollments, conceptsMastered, streak] = await Promise.all([
      getStudentEnrollments(uid),
      getConceptsMastered(uid),
      getLearningStreak(uid),
    ]);

    // Count completed courses
    const completedCourses = enrollments.filter(e => {
      if (e.accessibleLessonIds.length === 0) return false;
      const progressPercentage = (e.completedLessonIds.length / e.accessibleLessonIds.length) * 100;
      return progressPercentage >= 100;
    }).length;

    // Count completed lessons (across all enrollments)
    const totalLessonsCompleted = enrollments.reduce(
      (sum, e) => sum + e.completedLessonIds.length,
      0
    );

    // Check each achievement
    const checks: Array<{ type: AchievementType; condition: boolean }> = [
      {
        type: 'first_lesson_completed',
        condition: totalLessonsCompleted >= 1,
      },
      {
        type: 'first_course_completed',
        condition: completedCourses >= 1,
      },
      {
        type: 'streak_7_days',
        condition: streak >= 7,
      },
      {
        type: 'streak_30_days',
        condition: streak >= 30,
      },
      {
        type: 'concepts_mastered_10',
        condition: conceptsMastered >= 10,
      },
      {
        type: 'concepts_mastered_50',
        condition: conceptsMastered >= 50,
      },
      {
        type: 'courses_completed_5',
        condition: completedCourses >= 5,
      },
    ];

    // Check and award achievements
    for (const check of checks) {
      if (check.condition) {
        // Check if already unlocked
        const existingDoc = await achievementsRef.doc(check.type).get();
        
        if (!existingDoc.exists) {
          // Award new achievement
          const definition = ACHIEVEMENT_DEFINITIONS[check.type];
          const achievement: Achievement = {
            id: check.type,
            ...definition,
            unlockedAt: Date.now(),
          };

          await achievementsRef.doc(check.type).set(achievement);
          newlyAwarded.push(achievement);
        }
      }
    }

    return newlyAwarded;
  } catch (error) {
    console.error('Error checking achievements:', error);
    return [];
  }
}

/**
 * Get all user achievements
 */
export async function getUserAchievements(uid: string): Promise<Achievement[]> {
  const db = getFirestore();
  const achievementsRef = db.collection('users').doc(uid).collection('achievements');
  
  const snapshot = await achievementsRef.get();
  return snapshot.docs.map(doc => doc.data() as Achievement);
}

/**
 * Get achievement progress for achievements not yet unlocked
 */
export async function getAchievementProgress(uid: string): Promise<Record<AchievementType, number>> {
  try {
    const [enrollments, conceptsMastered, streak] = await Promise.all([
      getStudentEnrollments(uid),
      getConceptsMastered(uid),
      getLearningStreak(uid),
    ]);

    const completedCourses = enrollments.filter(e => {
      if (e.accessibleLessonIds.length === 0) return false;
      const progressPercentage = (e.completedLessonIds.length / e.accessibleLessonIds.length) * 100;
      return progressPercentage >= 100;
    }).length;

    const totalLessonsCompleted = enrollments.reduce(
      (sum, e) => sum + e.completedLessonIds.length,
      0
    );

    return {
      first_lesson_completed: Math.min(100, (totalLessonsCompleted / 1) * 100),
      first_course_completed: Math.min(100, (completedCourses / 1) * 100),
      streak_7_days: Math.min(100, (streak / 7) * 100),
      streak_30_days: Math.min(100, (streak / 30) * 100),
      concepts_mastered_10: Math.min(100, (conceptsMastered / 10) * 100),
      concepts_mastered_50: Math.min(100, (conceptsMastered / 50) * 100),
      courses_completed_5: Math.min(100, (completedCourses / 5) * 100),
    };
  } catch (error) {
    console.error('Error getting achievement progress:', error);
    return {} as Record<AchievementType, number>;
  }
}

/**
 * Get all achievements with progress (for display)
 */
export async function getAllAchievementsWithProgress(uid: string): Promise<Achievement[]> {
  const [unlocked, progress] = await Promise.all([
    getUserAchievements(uid),
    getAchievementProgress(uid),
  ]);

  const unlockedTypes = new Set(unlocked.map(a => a.type));
  const allAchievements: Achievement[] = [];

  // Add unlocked achievements
  allAchievements.push(...unlocked);

  // Add locked achievements with progress
  for (const [type, definition] of Object.entries(ACHIEVEMENT_DEFINITIONS)) {
    if (!unlockedTypes.has(type as AchievementType)) {
      allAchievements.push({
        id: type,
        ...definition,
        unlockedAt: 0,
        progress: progress[type as AchievementType] || 0,
      });
    }
  }

  return allAchievements;
}

