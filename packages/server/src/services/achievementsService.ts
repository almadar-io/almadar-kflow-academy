import type { AchievementNodeProperties } from '@almadar-io/knowledge';
import { studentData } from './studentDataAccess';
import { getStudentEnrollments } from './enrollmentService';
import { getConceptsMastered } from './userProgressService';
import { getLearningStreak } from './statisticsService';

export type AchievementType =
  | 'first_lesson_completed'
  | 'first_course_completed'
  | 'streak_7_days'
  | 'streak_30_days'
  | 'concepts_mastered_10'
  | 'concepts_mastered_50'
  | 'courses_completed_5';

export interface Achievement {
  id: string;
  type: AchievementType;
  name: string;
  description: string;
  icon: string;
  unlockedAt: number;
  progress?: number;
}

const ACHIEVEMENT_DEFINITIONS: Record<AchievementType, Omit<Achievement, 'id' | 'unlockedAt' | 'progress'>> = {
  first_lesson_completed: { type: 'first_lesson_completed', name: 'First Steps', description: 'Complete your first lesson', icon: '🎯' },
  first_course_completed: { type: 'first_course_completed', name: 'Course Master', description: 'Complete your first course', icon: '🏆' },
  streak_7_days: { type: 'streak_7_days', name: 'Week Warrior', description: 'Maintain a 7-day learning streak', icon: '🔥' },
  streak_30_days: { type: 'streak_30_days', name: 'Monthly Master', description: 'Maintain a 30-day learning streak', icon: '💪' },
  concepts_mastered_10: { type: 'concepts_mastered_10', name: 'Knowledge Seeker', description: 'Master 10 concepts', icon: '📚' },
  concepts_mastered_50: { type: 'concepts_mastered_50', name: 'Wisdom Keeper', description: 'Master 50 concepts', icon: '🌟' },
  courses_completed_5: { type: 'courses_completed_5', name: 'Scholar', description: 'Complete 5 courses', icon: '🎓' },
};

export type AchievementEvent =
  | { type: 'lesson_completed' }
  | { type: 'course_completed'; courseId: string }
  | { type: 'streak_updated'; streak: number }
  | { type: 'concept_mastered' };

function nodeToAchievement(node: AchievementNodeProperties): Achievement {
  return {
    id: node.id,
    type: node.achievementType as AchievementType,
    name: node.name,
    description: node.description,
    icon: node.icon ?? '',
    unlockedAt: node.unlockedAt,
    progress: node.progress,
  };
}

export async function checkAndAwardAchievements(uid: string, event: AchievementEvent): Promise<Achievement[]> {
  const newlyAwarded: Achievement[] = [];

  try {
    const [enrollments, conceptsMastered, streak] = await Promise.all([
      getStudentEnrollments(uid),
      getConceptsMastered(uid),
      getLearningStreak(uid),
    ]);

    const completedCourses = enrollments.filter(e => {
      if (e.accessibleLessonIds.length === 0) return false;
      return (e.completedLessonIds.length / e.accessibleLessonIds.length) * 100 >= 100;
    }).length;

    const totalLessonsCompleted = enrollments.reduce((sum, e) => sum + e.completedLessonIds.length, 0);

    const checks: Array<{ type: AchievementType; condition: boolean }> = [
      { type: 'first_lesson_completed', condition: totalLessonsCompleted >= 1 },
      { type: 'first_course_completed', condition: completedCourses >= 1 },
      { type: 'streak_7_days', condition: streak >= 7 },
      { type: 'streak_30_days', condition: streak >= 30 },
      { type: 'concepts_mastered_10', condition: conceptsMastered >= 10 },
      { type: 'concepts_mastered_50', condition: conceptsMastered >= 50 },
      { type: 'courses_completed_5', condition: completedCourses >= 5 },
    ];

    const existing = await studentData.listAchievements(uid);
    const unlockedTypes = new Set(existing.map(a => a.achievementType as AchievementType));

    for (const check of checks) {
      if (check.condition && !unlockedTypes.has(check.type)) {
        const definition = ACHIEVEMENT_DEFINITIONS[check.type];
        const achievement: Achievement = {
          id: check.type,
          ...definition,
          unlockedAt: Date.now(),
        };
        await studentData.awardAchievement(uid, {
          achievementType: check.type,
          name: achievement.name,
          description: achievement.description,
          icon: achievement.icon,
          unlockedAt: achievement.unlockedAt,
          progress: 100,
        });
        newlyAwarded.push(achievement);
      }
    }

    return newlyAwarded;
  } catch (error) {
    console.error('Error checking achievements:', error);
    return [];
  }
}

export async function getUserAchievements(uid: string): Promise<Achievement[]> {
  const nodes = await studentData.listAchievements(uid);
  return nodes.map(nodeToAchievement);
}

export async function getAchievementProgress(uid: string): Promise<Record<AchievementType, number>> {
  try {
    const [enrollments, conceptsMastered, streak] = await Promise.all([
      getStudentEnrollments(uid),
      getConceptsMastered(uid),
      getLearningStreak(uid),
    ]);

    const completedCourses = enrollments.filter(e => {
      if (e.accessibleLessonIds.length === 0) return false;
      return (e.completedLessonIds.length / e.accessibleLessonIds.length) * 100 >= 100;
    }).length;

    const totalLessonsCompleted = enrollments.reduce((sum, e) => sum + e.completedLessonIds.length, 0);

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

export async function getAllAchievementsWithProgress(uid: string): Promise<Achievement[]> {
  const [unlocked, progress] = await Promise.all([
    getUserAchievements(uid),
    getAchievementProgress(uid),
  ]);

  const unlockedTypes = new Set(unlocked.map(a => a.type));
  const allAchievements: Achievement[] = [...unlocked];

  for (const [type, definition] of Object.entries(ACHIEVEMENT_DEFINITIONS)) {
    if (!unlockedTypes.has(type as AchievementType)) {
      allAchievements.push({
        id: type,
        ...definition,
        unlockedAt: 0,
        progress: progress[type as AchievementType] ?? 0,
      });
    }
  }

  return allAchievements;
}
