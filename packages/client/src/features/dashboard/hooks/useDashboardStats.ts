import { useState, useEffect, useCallback, useRef } from 'react';
import { statisticsApi } from '../statisticsApi';
import { useAuthContext } from '../../auth/AuthContext';

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
  const { user, loading: authLoading } = useAuthContext();

  const loadStats = useCallback(async () => {
    // Prevent concurrent fetches
    if (isFetchingRef.current) {
      return;
    }

    isFetchingRef.current = true;
    setIsLoading(true);
    setError(null);

    try {
      // Fetch stats from API
      const [streak, conceptsMastered] = await Promise.all([
        statisticsApi.getLearningStreak(),
        statisticsApi.getConceptsMastered(),
      ]);

      setStats({
        learningStreak: streak,
        conceptsMastered,
        activeCourses: 0, // Simplified - no courses feature
      });
      hasFetchedRef.current = true;
    } catch (err: any) {
      console.error('Failed to load dashboard stats:', err);
      setError(err.message || 'Failed to load dashboard stats');
    } finally {
      setIsLoading(false);
      isFetchingRef.current = false;
    }
  }, []);

  useEffect(() => {
    // Wait for auth to be ready and user is logged in
    if (!authLoading && user && !hasFetchedRef.current) {
      loadStats();
    }
  }, [authLoading, user, loadStats]);

  return {
    stats,
    isLoading,
    error,
    refresh: loadStats,
  };
}
