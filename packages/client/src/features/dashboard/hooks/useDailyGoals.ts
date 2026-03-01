import { useState, useEffect, useCallback, useRef } from 'react';
import { getUserPreferences, updateUserPreferences, getDailyProgress, type UserPreferences, type DailyProgress } from '../preferencesApi';

export function useDailyGoals() {
  const [preferences, setPreferences] = useState<UserPreferences | null>(null);
  const [dailyProgress, setDailyProgress] = useState<DailyProgress | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  
  const hasFetchedRef = useRef(false);
  const isFetchingRef = useRef(false);

  const loadData = useCallback(async () => {
    // Prevent concurrent fetches
    if (isFetchingRef.current) {
      return;
    }

    isFetchingRef.current = true;
    setIsLoading(true);
    setError(null);

    try {
      const [prefs, progress] = await Promise.all([
        getUserPreferences(),
        getDailyProgress(),
      ]);

      setPreferences(prefs);
      setDailyProgress(progress);
      hasFetchedRef.current = true;
    } catch (err: any) {
      console.error('Failed to load daily goals data:', err);
      setError(err.message || 'Failed to load daily goals');
    } finally {
      setIsLoading(false);
      isFetchingRef.current = false;
    }
  }, []);

  useEffect(() => {
    if (!hasFetchedRef.current) {
      loadData();
    }
  }, [loadData]);

  const updateGoal = useCallback(async (newGoal: number) => {
    if (isUpdating) return;

    setIsUpdating(true);
    setError(null);

    try {
      const updated = await updateUserPreferences({ dailyLessonGoal: newGoal });
      setPreferences(updated);
      
      // Update daily progress with new goal
      if (dailyProgress) {
        setDailyProgress({
          ...dailyProgress,
          goal: newGoal,
          progressPercentage: newGoal > 0 ? Math.min(100, Math.round((dailyProgress.completed / newGoal) * 100)) : 0,
        });
      }
    } catch (err: any) {
      console.error('Failed to update daily goal:', err);
      setError(err.message || 'Failed to update daily goal');
      throw err;
    } finally {
      setIsUpdating(false);
    }
  }, [dailyProgress, isUpdating]);

  const refreshProgress = useCallback(async () => {
    try {
      const progress = await getDailyProgress();
      setDailyProgress(progress);
    } catch (err: any) {
      console.error('Failed to refresh daily progress:', err);
      setError(err.message || 'Failed to refresh progress');
    }
  }, []);

  return {
    preferences,
    dailyProgress,
    isLoading,
    error,
    isUpdating,
    updateGoal,
    refreshProgress,
  };
}

