import React, { useState, useEffect, useRef } from 'react';
import { 
  Flame, 
  Trophy, 
  BookOpen, 
  CheckCircle, 
  GraduationCap,
  ChevronDown,
  ChevronUp,
  Info,
  Loader2
} from 'lucide-react';
import { statisticsApi } from '../statisticsApi';
import { useDashboardStats } from '../hooks/useDashboardStats';

interface DetailedStatistics {
  totalStudyTime: number;
  lessonsCompleted: number;
  coursesCompleted: number;
  conceptsMastered: number;
  learningStreak: number;
  activeCourses: number;
}

export const EnhancedStatsCards: React.FC = () => {
  const { stats, isLoading: isLoadingStats, error: statsError } = useDashboardStats();
  const [detailedStats, setDetailedStats] = useState<DetailedStatistics | null>(null);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const hasFetchedDetailsRef = useRef(false);
  const isFetchingDetailsRef = useRef(false);

  // Load detailed stats when expanded
  useEffect(() => {
    if (isExpanded && !hasFetchedDetailsRef.current && !isFetchingDetailsRef.current) {
      isFetchingDetailsRef.current = true;
      setIsLoadingDetails(true);

      statisticsApi.getDetailedStatistics()
        .then((data) => {
          setDetailedStats(data);
          hasFetchedDetailsRef.current = true;
        })
        .catch((err: any) => {
          console.error('Failed to load detailed statistics:', err);
        })
        .finally(() => {
          setIsLoadingDetails(false);
          isFetchingDetailsRef.current = false;
        });
    }
  }, [isExpanded]);

  // Main stats cards (always visible)
  const mainStatsCards = [
    { 
      label: stats.learningStreak === 1 ? 'Day Streak' : 'Day Streak', 
      value: stats.learningStreak.toString(), 
      icon: Flame, 
      color: 'text-orange-500', 
      bg: 'bg-orange-100 dark:bg-orange-900/30',
      tooltip: 'Consecutive days you\'ve studied. Keep it going!'
    },
    { 
      label: stats.conceptsMastered === 1 ? 'Concept Mastered' : 'Concepts Mastered', 
      value: stats.conceptsMastered.toString(), 
      icon: Trophy, 
      color: 'text-yellow-500', 
      bg: 'bg-yellow-100 dark:bg-yellow-900/30',
      tooltip: 'Concepts you\'ve fully mastered by completing lessons, answering questions, and reflecting on your learning.'
    },
    { 
      label: stats.activeCourses === 1 ? 'Active Course' : 'Active Courses', 
      value: stats.activeCourses.toString(), 
      icon: BookOpen, 
      color: 'text-blue-500', 
      bg: 'bg-blue-100 dark:bg-blue-900/30',
      tooltip: 'Courses you\'re currently enrolled in and haven\'t completed yet.'
    },
  ];

  // Additional stats (shown when expanded)
  const additionalStats = detailedStats ? [
    { 
      label: 'Lessons Completed', 
      value: detailedStats.lessonsCompleted.toString(), 
      icon: CheckCircle, 
      color: 'text-green-500', 
      bg: 'bg-green-100 dark:bg-green-900/30',
      tooltip: 'Total number of lessons you\'ve completed across all courses.'
    },
    { 
      label: 'Courses Completed', 
      value: detailedStats.coursesCompleted.toString(), 
      icon: GraduationCap, 
      color: 'text-purple-500', 
      bg: 'bg-purple-100 dark:bg-purple-900/30',
      tooltip: 'Total number of courses you\'ve fully completed.'
    },
  ] : [];

  if (isLoadingStats) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={index} className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 flex items-center gap-4">
            <div className="p-3 rounded-lg bg-gray-100 dark:bg-gray-700 animate-pulse w-12 h-12" />
            <div className="flex-1">
              <div className="h-8 bg-gray-100 dark:bg-gray-700 rounded animate-pulse mb-2 w-16" />
              <div className="h-4 bg-gray-100 dark:bg-gray-700 rounded animate-pulse w-24" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (statsError) {
    return (
      <div className="col-span-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 text-red-600 dark:text-red-400 mb-8">
        Error loading statistics: {statsError}
      </div>
    );
  }

  return (
    <div className="mb-8">
      {/* Main Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        {mainStatsCards.map((stat, index) => (
          <div 
            key={index} 
            className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 flex items-center gap-4 group relative"
          >
            <div className={`p-3 rounded-lg ${stat.bg} ${stat.color}`}>
              <stat.icon size={24} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-baseline gap-2 flex-wrap">
                <div className="text-2xl font-bold text-gray-900 dark:text-white">{stat.value}</div>
                <div className="text-sm text-gray-500 dark:text-gray-400">{stat.label}</div>
              </div>
            </div>
            <div className="relative flex-shrink-0">
              <span title={stat.tooltip}>
                <Info 
                  size={16} 
                  className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 cursor-help transition-colors" 
                />
              </span>
              {/* Tooltip - shown on hover (desktop only) */}
              <div className="hidden md:block absolute right-0 top-6 w-64 p-3 bg-gray-900 dark:bg-gray-700 text-white text-xs rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 pointer-events-none">
                <div className="relative">
                  {stat.tooltip}
                  {/* Arrow pointing up */}
                  <div className="absolute -top-1 right-4 w-2 h-2 bg-gray-900 dark:bg-gray-700 rotate-45"></div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Show More Button - Always show to allow expansion */}
      <div className="flex justify-center mb-4">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-2 px-4 py-2 text-sm text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 font-medium transition-colors"
        >
          {isExpanded ? (
            <>
              <ChevronUp size={16} />
              Show Less
            </>
          ) : (
            <>
              <ChevronDown size={16} />
              Show More Stats
            </>
          )}
        </button>
      </div>

      {/* Expanded Additional Stats */}
      {isExpanded && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 transition-all duration-300">
          {isLoadingDetails ? (
            <div className="col-span-2 bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 flex items-center justify-center gap-3 text-gray-500 dark:text-gray-400">
              <Loader2 className="animate-spin" size={20} />
              <span>Loading additional stats...</span>
            </div>
          ) : additionalStats.length > 0 ? (
            additionalStats.map((stat, index) => (
              <div 
                key={index} 
                className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 flex items-center gap-4 group relative"
              >
                <div className={`p-3 rounded-lg ${stat.bg} ${stat.color}`}>
                  <stat.icon size={24} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2 flex-wrap">
                    <div className="text-2xl font-bold text-gray-900 dark:text-white">{stat.value}</div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">{stat.label}</div>
                  </div>
                </div>
                <div className="relative flex-shrink-0">
                  <span title={stat.tooltip}>
                    <Info 
                      size={16} 
                      className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 cursor-help transition-colors" 
                    />
                  </span>
                  {/* Tooltip - shown on hover (desktop only) */}
                  <div className="hidden md:block absolute right-0 top-6 w-64 p-3 bg-gray-900 dark:bg-gray-700 text-white text-xs rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 pointer-events-none">
                    <div className="relative">
                      {stat.tooltip}
                      {/* Arrow pointing up */}
                      <div className="absolute -top-1 right-4 w-2 h-2 bg-gray-900 dark:bg-gray-700 rotate-45"></div>
                    </div>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="col-span-2 bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 text-center text-gray-500 dark:text-gray-400">
              <p className="text-sm">No additional statistics available</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

