import { useQuery } from '@tanstack/react-query';
import { statisticsApi, type RecentActivity } from '../statisticsApi';

const RECENT_ACTIVITY_QUERY_KEY = ['recentActivity'] as const;

export function useRecentActivity(limit: number = 10) {
  const query = useQuery<RecentActivity[]>({
    queryKey: [...RECENT_ACTIVITY_QUERY_KEY, limit],
    queryFn: () => statisticsApi.getRecentActivity(limit),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  /**
   * Format timestamp to human-readable string
   */
  const formatTimestamp = (timestamp: number): string => {
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
  };

  return {
    activity: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error ? (query.error as Error).message : null,
    refresh: async () => {
      await query.refetch();
    },
    formatTimestamp,
  };
}
