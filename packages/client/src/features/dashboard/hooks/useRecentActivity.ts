import { useState, useEffect, useCallback, useRef } from 'react';
import { statisticsApi, type RecentActivity } from '../statisticsApi';

export function useRecentActivity(limit: number = 10) {
  const [activity, setActivity] = useState<RecentActivity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const hasFetchedRef = useRef(false);
  const isFetchingRef = useRef(false);

  const loadActivity = useCallback(async () => {
    // Prevent concurrent fetches
    if (isFetchingRef.current) {
      return;
    }

    isFetchingRef.current = true;
    setIsLoading(true);
    setError(null);

    try {
      const activityList = await statisticsApi.getRecentActivity(limit);
      setActivity(activityList);
      hasFetchedRef.current = true;
    } catch (err: any) {
      console.error('Failed to load recent activity:', err);
      setError(err.message || 'Failed to load recent activity');
    } finally {
      setIsLoading(false);
      isFetchingRef.current = false;
    }
  }, [limit]);

  useEffect(() => {
    // Only fetch on initial mount, not on re-renders
    if (!hasFetchedRef.current) {
      loadActivity();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty deps - only run on mount

  /**
   * Format timestamp to human-readable string
   */
  const formatTimestamp = useCallback((timestamp: number): string => {
    const now = Date.now();
    const diff = now - timestamp;
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) {
      return days === 1 ? 'Yesterday' : `${days} days ago`;
    }
    if (hours > 0) {
      return hours === 1 ? '1 hour ago' : `${hours} hours ago`;
    }
    if (minutes > 0) {
      return minutes === 1 ? '1 minute ago' : `${minutes} minutes ago`;
    }
    return 'Just now';
  }, []);

  return {
    activity,
    isLoading,
    error,
    refresh: loadActivity,
    formatTimestamp,
  };
}

