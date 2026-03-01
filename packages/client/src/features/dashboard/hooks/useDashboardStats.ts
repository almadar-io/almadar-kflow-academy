import { useState, useEffect, useCallback, useRef } from 'react';
import { statisticsApi } from '../statisticsApi';
import { useEnrolledCourses } from '../../student/hooks/useEnrolledCourses';

export interface DashboardStats {
  learningStreak: number;
  conceptsMastered: number;
  activeCourses: number;
}

export function useDashboardStats() {
  const [stats, setStats] = useState<DashboardStats>({
    learningStreak: 0,
    conceptsMastered: 0,
    activeCourses: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const hasFetchedRef = useRef(false);
  const isFetchingRef = useRef(false);

  // Get enrolled courses to calculate active courses
  const { enrolledCourses, isLoading: isLoadingCourses } = useEnrolledCourses();

  const loadStats = useCallback(async () => {
    // Prevent concurrent fetches
    if (isFetchingRef.current) {
      return;
    }

    isFetchingRef.current = true;
    setIsLoading(true);
    setError(null);

    try {
      // Fetch streak and concepts mastered in parallel
      const [streak, conceptsMastered] = await Promise.all([
        statisticsApi.getLearningStreak(),
        statisticsApi.getConceptsMastered(),
      ]);

      // Calculate active courses from enrolled courses
      const activeCourses = enrolledCourses.filter(course => {
        if (!course.progress) return false;
        return course.progress.progressPercentage < 100;
      }).length;

      setStats({
        learningStreak: streak,
        conceptsMastered,
        activeCourses,
      });
      hasFetchedRef.current = true;
    } catch (err: any) {
      console.error('Failed to load dashboard stats:', err);
      setError(err.message || 'Failed to load dashboard stats');
    } finally {
      setIsLoading(false);
      isFetchingRef.current = false;
    }
  }, [enrolledCourses]);

  useEffect(() => {
    // Only fetch after enrolled courses are loaded
    if (!isLoadingCourses && !hasFetchedRef.current) {
      loadStats();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoadingCourses]); // Re-fetch when enrolled courses change

  return {
    stats,
    isLoading,
    error,
    refresh: loadStats,
  };
}

