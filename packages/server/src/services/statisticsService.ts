import { getFirestore } from '../config/firebaseAdmin';
import { getStudentEnrollments } from './enrollmentService';
import { getConceptsMastered, getAllUserProgress } from './userProgressService';
import { getUserPreferences } from './userPreferencesService';
import { cache, CACHE_TTL } from './cacheService';

/**
 * Calculate learning streak based on enrollment lastAccessedAt timestamps
 * Streak = consecutive days with at least one activity
 */
export async function getLearningStreak(uid: string): Promise<number> {
  // Check cache first
  const cacheKey = `streak:${uid}`;
  const cached = cache.get<number>(cacheKey);
  if (cached !== null) {
    return cached;
  }

  try {
    const enrollments = await getStudentEnrollments(uid);
    
    if (enrollments.length === 0) {
      return 0;
    }

    // Get all lastAccessedAt timestamps
    const accessDates = enrollments
      .map(e => e.lastAccessedAt || e.enrolledAt)
      .filter(Boolean)
      .map(timestamp => {
        // Convert to date and set to midnight for day comparison
        const date = new Date(timestamp);
        date.setHours(0, 0, 0, 0);
        return date.getTime();
      });

    // Remove duplicates and sort (most recent first)
    const uniqueDates = Array.from(new Set(accessDates)).sort((a, b) => b - a);

    if (uniqueDates.length === 0) {
      return 0;
    }

    // Calculate streak
    let streak = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayTime = today.getTime();

    // Check if there's activity today or yesterday (allows for timezone differences)
    const yesterdayTime = todayTime - 24 * 60 * 60 * 1000;
    const mostRecentDate = uniqueDates[0];
    
    // If most recent activity is more than 2 days ago, streak is broken
    if (mostRecentDate < yesterdayTime - 24 * 60 * 60 * 1000) {
      return 0;
    }

    // Start counting from most recent date
    let expectedDate = mostRecentDate;
    let currentIndex = 0;

    while (currentIndex < uniqueDates.length) {
      const currentDate = uniqueDates[currentIndex];
      
      // Check if this date matches expected date (within same day)
      if (currentDate === expectedDate) {
        streak++;
        expectedDate -= 24 * 60 * 60 * 1000; // Move to previous day
        currentIndex++;
      } else if (currentDate > expectedDate) {
        // Skip ahead if we have a more recent date
        currentIndex++;
      } else {
        // Gap found - streak is broken
        break;
      }
    }

    // Cache the result
    cache.set(cacheKey, streak, CACHE_TTL.STATISTICS);
    return streak;
  } catch (error) {
    console.error('Error calculating learning streak:', error);
    return 0;
  }
}

/**
 * Get count of concepts mastered (delegates to userProgressService)
 */
export async function getConceptsMasteredCount(uid: string): Promise<number> {
  // Check cache first
  const cacheKey = `concepts-mastered:${uid}`;
  const cached = cache.get<number>(cacheKey);
  if (cached !== null) {
    return cached;
  }

  try {
    const count = await getConceptsMastered(uid);
    // Cache the result
    cache.set(cacheKey, count, CACHE_TTL.STATISTICS);
    return count;
  } catch (error) {
    console.error('Error getting concepts mastered count:', error);
    return 0;
  }
}

/**
 * Get recent activity feed
 * Combines enrollment activity and userProgress activity
 */
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
    graphId?: string; // Added for concept navigation
    progressPercentage?: number;
  };
}

export async function getRecentActivity(
  uid: string,
  limit: number = 10
): Promise<RecentActivity[]> {
  try {
    const activities: RecentActivity[] = [];

    // Get enrollment activities
    const enrollments = await getStudentEnrollments(uid);
    for (const enrollment of enrollments) {
      // Course accessed activity
      if (enrollment.lastAccessedAt) {
        activities.push({
          id: `enrollment-${enrollment.id}`,
          type: 'course_accessed',
          resourceId: enrollment.courseId,
          resourceName: `Course ${enrollment.courseId}`, // Could fetch course name if needed
          timestamp: enrollment.lastAccessedAt,
          metadata: {
            courseId: enrollment.courseId,
            progressPercentage: enrollment.accessibleLessonIds.length > 0
              ? Math.round((enrollment.completedLessonIds.length / enrollment.accessibleLessonIds.length) * 100)
              : 0,
          },
        });
      }

      // Course enrolled activity
      if (enrollment.enrolledAt) {
        activities.push({
          id: `enroll-${enrollment.id}`,
          type: 'course_enrolled',
          resourceId: enrollment.courseId,
          resourceName: `Course ${enrollment.courseId}`,
          timestamp: enrollment.enrolledAt,
          metadata: {
            courseId: enrollment.courseId,
          },
        });
      }
    }

    // Get userProgress activities (concept studied)
    const db = getFirestore();
    const userProgressSnapshot = await db
      .collection('users')
      .doc(uid)
      .collection('userProgress')
      .orderBy('lastStudied', 'desc')
      .limit(limit)
      .get();

    for (const doc of userProgressSnapshot.docs) {
      const progress = doc.data();
      if (progress.lastStudied) {
        activities.push({
          id: `progress-${doc.id}`,
          type: 'concept_studied',
          resourceId: doc.id,
          resourceName: progress.conceptName || doc.id,
          timestamp: progress.lastStudied,
          metadata: {
            conceptId: doc.id,
            graphId: progress.graphId, // Include graphId for navigation
            courseId: progress.courseId,
            lessonId: progress.lessonId,
          },
        });
      }
    }

    // Sort by timestamp (most recent first) and limit
    activities.sort((a, b) => b.timestamp - a.timestamp);
    return activities.slice(0, limit);
  } catch (error) {
    console.error('Error getting recent activity:', error);
    return [];
  }
}

/**
 * Detailed statistics interface
 */
export interface DetailedStatistics {
  totalStudyTime: number; // minutes (if tracked) - placeholder for future
  lessonsCompleted: number; // all time
  coursesCompleted: number;
  conceptsMastered: number; // masteryLevel === 3
  learningStreak: number;
  activeCourses: number;
}

/**
 * Get detailed statistics for user
 */
export async function getDetailedStatistics(uid: string): Promise<DetailedStatistics> {
  try {
    const [enrollments, conceptsMastered, streak] = await Promise.all([
      getStudentEnrollments(uid),
      getConceptsMasteredCount(uid),
      getLearningStreak(uid),
    ]);

    // Count completed courses
    const coursesCompleted = enrollments.filter(e => {
      if (e.accessibleLessonIds.length === 0) return false;
      const progressPercentage = (e.completedLessonIds.length / e.accessibleLessonIds.length) * 100;
      return progressPercentage >= 100;
    }).length;

    // Count total lessons completed (across all enrollments)
    const lessonsCompleted = enrollments.reduce(
      (sum, e) => sum + e.completedLessonIds.length,
      0
    );

    // Count active courses (not completed)
    const activeCourses = enrollments.filter(e => {
      if (e.accessibleLessonIds.length === 0) return false;
      const progressPercentage = (e.completedLessonIds.length / e.accessibleLessonIds.length) * 100;
      return progressPercentage < 100;
    }).length;

    return {
      totalStudyTime: 0, // Placeholder - not tracked yet
      lessonsCompleted,
      coursesCompleted,
      conceptsMastered,
      learningStreak: streak,
      activeCourses,
    };
  } catch (error) {
    console.error('Error getting detailed statistics:', error);
    throw error;
  }
}

/**
 * Get statistics summary (all stats in one call)
 */
export interface StatisticsSummary {
  learningStreak: number;
  conceptsMastered: number;
  activeCourses: number;
  recentActivity: RecentActivity[];
}

export async function getStatisticsSummary(
  uid: string,
  activityLimit: number = 5
): Promise<StatisticsSummary> {
  // Check cache first
  const cacheKey = `stats-summary:${uid}:${activityLimit}`;
  const cached = cache.get<StatisticsSummary>(cacheKey);
  if (cached !== null) {
    return cached;
  }

  try {
    const [streak, conceptsMastered, enrollments, recentActivity] = await Promise.all([
      getLearningStreak(uid),
      getConceptsMasteredCount(uid),
      getStudentEnrollments(uid),
      getRecentActivity(uid, activityLimit),
    ]);

    // Count active courses (not 100% complete)
    const activeCourses = enrollments.filter(e => {
      if (e.accessibleLessonIds.length === 0) return false;
      const progressPercentage = (e.completedLessonIds.length / e.accessibleLessonIds.length) * 100;
      return progressPercentage < 100;
    }).length;

    const summary = {
      learningStreak: streak,
      conceptsMastered,
      activeCourses,
      recentActivity,
    };

    // Cache the result
    cache.set(cacheKey, summary, CACHE_TTL.STATISTICS);
    return summary;
  } catch (error) {
    console.error('Error getting statistics summary:', error);
    throw error;
  }
}

/**
 * Daily progress activity
 */
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

/**
 * Daily progress data
 */
export interface DailyProgress {
  date: string; // YYYY-MM-DD
  goal: number;
  completed: number;
  progressPercentage: number;
  activities: DailyActivity[];
}

/**
 * Get today's progress toward daily goal
 */
export async function getDailyProgress(uid: string): Promise<DailyProgress> {
  try {
    // Get user preferences for daily goal
    const preferences = await getUserPreferences(uid);
    const goal = preferences.dailyLessonGoal;

    // Get today's date range (start and end of day in UTC)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStart = today.getTime();
    const todayEnd = todayStart + 24 * 60 * 60 * 1000 - 1;

    const activities: DailyActivity[] = [];

    // Get today's lesson completions from enrollments
    const enrollments = await getStudentEnrollments(uid);
    const db = getFirestore();

    for (const enrollment of enrollments) {
      // Check if any lessons were completed today
      // We need to check lesson completion timestamps
      // For now, we'll use lastAccessedAt as a proxy if it's today
      if (enrollment.lastAccessedAt && enrollment.lastAccessedAt >= todayStart && enrollment.lastAccessedAt <= todayEnd) {
        // Count completed lessons that might have been completed today
        // Note: This is approximate - ideally we'd track lesson completion timestamps
        for (const lessonId of enrollment.completedLessonIds) {
            // Check if lesson exists and get its name
            try {
              const lessonDoc = await db
                .collection('courses')
                .doc(enrollment.courseId)
                .collection('lessons')
                .doc(lessonId)
                .get();
              
              if (lessonDoc.exists) {
                const lessonData = lessonDoc.data();
                activities.push({
                  type: 'lesson_completed',
                  resourceId: lessonId,
                  resourceName: lessonData?.conceptName || lessonData?.title || `Lesson ${lessonId}`,
                  timestamp: enrollment.lastAccessedAt, // Approximate
                  metadata: {
                    courseId: enrollment.courseId,
                    lessonId: lessonId,
                  },
                });
              }
            } catch (error) {
              // Skip if lesson not found
              console.warn(`Lesson ${lessonId} not found:`, error);
            }
          }
      }
    }

    // Get today's concept studies from userProgress
    const allUserProgress = await getAllUserProgress(uid);
    for (const progress of allUserProgress) {
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

    // Remove duplicates (same resource completed multiple times today)
    const uniqueActivities = activities.reduce((acc, activity) => {
      const key = `${activity.type}-${activity.resourceId}`;
      if (!acc.has(key)) {
        acc.set(key, activity);
      }
      return acc;
    }, new Map<string, DailyActivity>());

    const uniqueActivitiesList = Array.from(uniqueActivities.values());
    
    // Sort by timestamp (most recent first)
    uniqueActivitiesList.sort((a, b) => b.timestamp - a.timestamp);

    const completed = uniqueActivitiesList.length;
    const progressPercentage = goal > 0 ? Math.min(100, Math.round((completed / goal) * 100)) : 0;

    // Format date as YYYY-MM-DD
    const dateStr = today.toISOString().split('T')[0];

    return {
      date: dateStr,
      goal,
      completed,
      progressPercentage,
      activities: uniqueActivitiesList,
    };
  } catch (error) {
    console.error('Error getting daily progress:', error);
    throw error;
  }
}

