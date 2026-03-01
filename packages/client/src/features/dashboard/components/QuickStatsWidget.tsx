import React, { useState, useEffect, useRef } from 'react';
import { 
  BookOpen, 
  CheckCircle, 
  Trophy, 
  Flame, 
  Clock, 
  GraduationCap,
  ChevronDown,
  ChevronUp,
  Loader2
} from 'lucide-react';
import { statisticsApi } from '../statisticsApi';

interface DetailedStatistics {
  totalStudyTime: number;
  lessonsCompleted: number;
  coursesCompleted: number;
  conceptsMastered: number;
  learningStreak: number;
  activeCourses: number;
}

export const QuickStatsWidget: React.FC = () => {
  const [stats, setStats] = useState<DetailedStatistics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const hasFetchedRef = useRef(false);
  const isFetchingRef = useRef(false);

  useEffect(() => {
    if (hasFetchedRef.current || isFetchingRef.current) return;

    isFetchingRef.current = true;
    setIsLoading(true);
    setError(null);

    statisticsApi.getDetailedStatistics()
      .then((data) => {
        setStats(data);
        hasFetchedRef.current = true;
      })
      .catch((err: any) => {
        console.error('Failed to load detailed statistics:', err);
        setError(err.message || 'Failed to load statistics');
      })
      .finally(() => {
        setIsLoading(false);
        isFetchingRef.current = false;
      });
  }, []);

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
        <div className="flex items-center justify-center gap-3 text-gray-500 dark:text-gray-400">
          <Loader2 className="animate-spin" size={20} />
          <span>Loading statistics...</span>
        </div>
      </div>
    );
  }

  if (error || !stats) {
    return null; // Don't show error, just hide widget
  }

  // Summary stats (shown when collapsed)
  const summaryStats = [
    { label: 'Lessons Completed', value: stats.lessonsCompleted, icon: CheckCircle, color: 'text-green-500' },
    { label: 'Courses Completed', value: stats.coursesCompleted, icon: GraduationCap, color: 'text-blue-500' },
    { label: 'Concepts Mastered', value: stats.conceptsMastered, icon: Trophy, color: 'text-yellow-500' },
  ];

  // All stats (shown when expanded)
  const allStats = [
    ...summaryStats,
    { label: 'Learning Streak', value: `${stats.learningStreak} days`, icon: Flame, color: 'text-orange-500' },
    { label: 'Active Courses', value: stats.activeCourses, icon: BookOpen, color: 'text-indigo-500' },
    // { label: 'Total Study Time', value: formatTime(stats.totalStudyTime), icon: Clock, color: 'text-purple-500' },
  ];

  const displayStats = isExpanded ? allStats : summaryStats;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white">Quick Stats</h3>
        {allStats.length > summaryStats.length && (
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-sm text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 font-medium flex items-center gap-1"
          >
            {isExpanded ? (
              <>
                <ChevronUp size={16} />
                Show Less
              </>
            ) : (
              <>
                <ChevronDown size={16} />
                Show More
              </>
            )}
          </button>
        )}
      </div>

      <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 transition-all duration-300 ${isExpanded ? 'opacity-100' : 'opacity-100'}`}>
        {displayStats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <div
              key={index}
              className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600"
            >
              <div className={`p-2 rounded-lg bg-white dark:bg-gray-800 ${stat.color}`}>
                <Icon size={20} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-2xl font-bold text-gray-900 dark:text-white">
                  {stat.value}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                  {stat.label}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// Helper function to format time (for future use)
function formatTime(minutes: number): string {
  if (minutes < 60) {
    return `${minutes}m`;
  }
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
}

