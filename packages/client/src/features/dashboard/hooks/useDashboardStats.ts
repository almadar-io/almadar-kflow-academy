import { useQuery } from '@tanstack/react-query';
import { statisticsApi } from '../statisticsApi';

export interface DashboardStats {
  learningStreak: number;
  conceptsMastered: number;
  activeCourses: number;
}

const DASHBOARD_STATS_QUERY_KEY = ['dashboardStats'] as const;

async function fetchDashboardStats(): Promise<DashboardStats> {
  const [streak, conceptsMastered] = await Promise.all([
    statisticsApi.getLearningStreak(),
    statisticsApi.getConceptsMastered(),
  ]);

  return {
    learningStreak: streak,
    conceptsMastered,
    activeCourses: 0, // Simplified - no courses feature
  };
}

export function useDashboardStats() {
  const query = useQuery<DashboardStats>({
    queryKey: DASHBOARD_STATS_QUERY_KEY,
    queryFn: fetchDashboardStats,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  return {
    stats: query.data ?? {
      learningStreak: 0,
      conceptsMastered: 0,
      activeCourses: 0,
    },
    isLoading: query.isLoading,
    error: query.error ? (query.error as Error).message : null,
    refresh: async () => {
      await query.refetch();
    },
  };
}
