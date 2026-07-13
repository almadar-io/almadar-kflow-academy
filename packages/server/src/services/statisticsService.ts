import { getStudentEnrollments } from './enrollmentService';
import { getConceptsMastered, getAllUserProgress } from './userProgressService';
import { createLogger } from '@almadar/logger';

const log = createLogger('kflow:server:services:statisticsService');
import { getUserPreferences } from './userPreferencesService';
import { cache, CACHE_TTL } from './cacheService';

export async function getLearningStreak(uid: string): Promise<number> {
  const cacheKey = `streak:${uid}`;
  const cached = cache.get<number>(cacheKey);
  if (cached !== null) return cached;

  try {
    const enrollments = await getStudentEnrollments(uid);
    if (enrollments.length === 0) return 0;

    const accessDates = enrollments
      .map(e => e.lastAccessedAt || e.enrolledAt)
      .filter(Boolean)
      .map(timestamp => {
        const date = new Date(timestamp);
        date.setHours(0, 0, 0, 0);
        return date.getTime();
      });

    const uniqueDates = Array.from(new Set(accessDates)).sort((a, b) => b - a);
    if (uniqueDates.length === 0) return 0;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const yesterdayTime = today.getTime() - 24 * 60 * 60 * 1000;
    const mostRecentDate = uniqueDates[0];

    if (mostRecentDate < yesterdayTime - 24 * 60 * 60 * 1000) return 0;

    let streak = 0;
    let expectedDate = mostRecentDate;
    let currentIndex = 0;

    while (currentIndex < uniqueDates.length) {
      const currentDate = uniqueDates[currentIndex];
      if (currentDate === expectedDate) {
        streak++;
        expectedDate -= 24 * 60 * 60 * 1000;
        currentIndex++;
      } else if (currentDate > expectedDate) {
        currentIndex++;
      } else {
        break;
      }
    }

    cache.set(cacheKey, streak, CACHE_TTL.STATISTICS);
    return streak;
  } catch (error) {
    log.error('Error calculating learning streak', { error: error instanceof Error ? error.message : String(error) });
    return 0;
  }
}

export async function getConceptsMasteredCount(uid: string): Promise<number> {
  const cacheKey = `concepts-mastered:${uid}`;
  const cached = cache.get<number>(cacheKey);
  if (cached !== null) return cached;

  try {
    const count = await getConceptsMastered(uid);
    cache.set(cacheKey, count, CACHE_TTL.STATISTICS);
    return count;
  } catch (error) {
    log.error('Error getting concepts mastered count', { error: error instanceof Error ? error.message : String(error) });
    return 0;
  }
}

export interface RecentActivity {
  id: string;
  type: 'course_accessed' | 'lesson_completed' | 'concept_studied' | 'course_enrolled';
  resourceId: string;
  resourceName: string;
  timestamp: number;
  metadata?: {
    courseId?: string;
    lessonId?: string;
    conceptId?: string;
    graphId?: string;
    progressPercentage?: number;
  };
}

export async function getRecentActivity(uid: string, limit: number = 10): Promise<RecentActivity[]> {
  try {
    const activities: RecentActivity[] = [];

    const enrollments = await getStudentEnrollments(uid);
    for (const enrollment of enrollments) {
      if (enrollment.lastAccessedAt) {
        activities.push({
          id: `enrollment-${enrollment.id}`,
          type: 'course_accessed',
          resourceId: enrollment.courseId,
          resourceName: `Course ${enrollment.courseId}`,
          timestamp: enrollment.lastAccessedAt,
          metadata: {
            courseId: enrollment.courseId,
            progressPercentage: enrollment.accessibleLessonIds.length > 0
              ? Math.round((enrollment.completedLessonIds.length / enrollment.accessibleLessonIds.length) * 100)
              : 0,
          },
        });
      }
      if (enrollment.enrolledAt) {
        activities.push({
          id: `enroll-${enrollment.id}`,
          type: 'course_enrolled',
          resourceId: enrollment.courseId,
          resourceName: `Course ${enrollment.courseId}`,
          timestamp: enrollment.enrolledAt,
          metadata: { courseId: enrollment.courseId },
        });
      }
    }

    const allProgress = await getAllUserProgress(uid);
    const sorted = [...allProgress]
      .filter(p => p.lastStudied)
      .sort((a, b) => b.lastStudied - a.lastStudied)
      .slice(0, limit);

    for (const progress of sorted) {
      activities.push({
        id: `progress-${progress.conceptId}`,
        type: 'concept_studied',
        resourceId: progress.conceptId,
        resourceName: progress.conceptName || progress.conceptId,
        timestamp: progress.lastStudied,
        metadata: {
          conceptId: progress.conceptId,
          graphId: progress.graphId,
          courseId: progress.courseId,
          lessonId: progress.lessonId,
        },
      });
    }

    activities.sort((a, b) => b.timestamp - a.timestamp);
    return activities.slice(0, limit);
  } catch (error) {
    log.error('Error getting recent activity', { error: error instanceof Error ? error.message : String(error) });
    return [];
  }
}

export interface DetailedStatistics {
  totalStudyTime: number;
  lessonsCompleted: number;
  coursesCompleted: number;
  conceptsMastered: number;
  learningStreak: number;
  activeCourses: number;
}

export async function getDetailedStatistics(uid: string): Promise<DetailedStatistics> {
  try {
    const [enrollments, conceptsMastered, streak] = await Promise.all([
      getStudentEnrollments(uid),
      getConceptsMasteredCount(uid),
      getLearningStreak(uid),
    ]);

    const coursesCompleted = enrollments.filter(e => {
      if (e.accessibleLessonIds.length === 0) return false;
      return (e.completedLessonIds.length / e.accessibleLessonIds.length) * 100 >= 100;
    }).length;

    const lessonsCompleted = enrollments.reduce((sum, e) => sum + e.completedLessonIds.length, 0);

    const activeCourses = enrollments.filter(e => {
      if (e.accessibleLessonIds.length === 0) return false;
      return (e.completedLessonIds.length / e.accessibleLessonIds.length) * 100 < 100;
    }).length;

    return { totalStudyTime: 0, lessonsCompleted, coursesCompleted, conceptsMastered, learningStreak: streak, activeCourses };
  } catch (error) {
    log.error('Error getting detailed statistics', { error: error instanceof Error ? error.message : String(error) });
    throw error;
  }
}

export interface StatisticsSummary {
  learningStreak: number;
  conceptsMastered: number;
  activeCourses: number;
  recentActivity: RecentActivity[];
}

export async function getStatisticsSummary(uid: string, activityLimit: number = 5): Promise<StatisticsSummary> {
  const cacheKey = `stats-summary:${uid}:${activityLimit}`;
  const cached = cache.get<StatisticsSummary>(cacheKey);
  if (cached !== null) return cached;

  try {
    const [streak, conceptsMastered, enrollments, recentActivity] = await Promise.all([
      getLearningStreak(uid),
      getConceptsMasteredCount(uid),
      getStudentEnrollments(uid),
      getRecentActivity(uid, activityLimit),
    ]);

    const activeCourses = enrollments.filter(e => {
      if (e.accessibleLessonIds.length === 0) return false;
      return (e.completedLessonIds.length / e.accessibleLessonIds.length) * 100 < 100;
    }).length;

    const summary = { learningStreak: streak, conceptsMastered, activeCourses, recentActivity };
    cache.set(cacheKey, summary, CACHE_TTL.STATISTICS);
    return summary;
  } catch (error) {
    log.error('Error getting statistics summary', { error: error instanceof Error ? error.message : String(error) });
    throw error;
  }
}

export interface DailyActivity {
  type: 'lesson_completed' | 'concept_studied';
  resourceId: string;
  resourceName: string;
  timestamp: number;
  metadata?: {
    courseId?: string;
    lessonId?: string;
    conceptId?: string;
  };
}

export interface DailyProgress {
  date: string;
  goal: number;
  completed: number;
  progressPercentage: number;
  activities: DailyActivity[];
}

export async function getDailyProgress(uid: string): Promise<DailyProgress> {
  try {
    const preferences = await getUserPreferences(uid);
    const goal = preferences.dailyLessonGoal;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStart = today.getTime();
    const todayEnd = todayStart + 24 * 60 * 60 * 1000 - 1;

    const activities: DailyActivity[] = [];

    const allProgress = await getAllUserProgress(uid);
    for (const progress of allProgress) {
      if (progress.lastStudied && progress.lastStudied >= todayStart && progress.lastStudied <= todayEnd) {
        activities.push({
          type: 'concept_studied',
          resourceId: progress.conceptId,
          resourceName: progress.conceptName || progress.conceptId,
          timestamp: progress.lastStudied,
          metadata: {
            conceptId: progress.conceptId,
            courseId: progress.courseId,
            lessonId: progress.lessonId,
          },
        });
      }
    }

    const uniqueActivities = activities.reduce((acc, activity) => {
      const key = `${activity.type}-${activity.resourceId}`;
      if (!acc.has(key)) acc.set(key, activity);
      return acc;
    }, new Map<string, DailyActivity>());

    const uniqueActivitiesList = Array.from(uniqueActivities.values()).sort(
      (a, b) => b.timestamp - a.timestamp
    );

    const completed = uniqueActivitiesList.length;
    const progressPercentage = goal > 0 ? Math.min(100, Math.round((completed / goal) * 100)) : 0;
    const dateStr = today.toISOString().split('T')[0];

    return { date: dateStr, goal, completed, progressPercentage, activities: uniqueActivitiesList };
  } catch (error) {
    log.error('Error getting daily progress', { error: error instanceof Error ? error.message : String(error) });
    throw error;
  }
}
