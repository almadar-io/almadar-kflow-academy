/**
 * EnhancedStatsCards Organism Component
 * 
 * Displays enhanced statistics with expandable detailed view.
 * Uses Card, Icon, Typography, ProgressBar, Spinner, Tooltip atoms and Card, StatCard molecules.
 */

import React, { useState, useEffect, useRef } from 'react';
import { Flame, Trophy, BookOpen, CheckCircle, GraduationCap, Info, ChevronDown, ChevronUp } from 'lucide-react';
import { Card } from '../../molecules/Card';
import { StatCard } from '../../molecules/StatCard';
import { Icon } from '../../atoms/Icon';
import { Typography } from '../../atoms/Typography';
import { Spinner } from '../../atoms/Spinner';
import { Button } from '../../atoms/Button';
import { Tooltip } from '../../molecules/Tooltip';
import { Alert } from '../../molecules/Alert';
import { cn } from '../../../utils/theme';

export interface DetailedStatistics {
  totalStudyTime: number;
  lessonsCompleted: number;
  coursesCompleted: number;
  conceptsMastered: number;
  learningStreak: number;
  activeCourses: number;
}

export interface EnhancedStatsCardsProps {
  /**
   * Main stats (always visible)
   */
  mainStats?: {
    learningStreak: number;
    conceptsMastered: number;
    activeCourses: number;
  };
  
  /**
   * Detailed statistics (loaded when expanded)
   */
  detailedStats?: DetailedStatistics;
  
  /**
   * Is loading main stats
   */
  isLoading?: boolean;
  
  /**
   * Is loading detailed stats
   */
  isLoadingDetails?: boolean;
  
  /**
   * Error message
   */
  error?: string | null;
  
  /**
   * On load detailed stats (called when expanded)
   */
  onLoadDetailedStats?: () => Promise<DetailedStatistics>;
  
  /**
   * Additional CSS classes
   */
  className?: string;
}

export const EnhancedStatsCards: React.FC<EnhancedStatsCardsProps> = ({
  mainStats: providedMainStats,
  detailedStats: providedDetailedStats,
  isLoading: providedIsLoading = false,
  isLoadingDetails: providedIsLoadingDetails = false,
  error: providedError = null,
  onLoadDetailedStats,
  className,
}) => {
  const [mainStats, setMainStats] = useState(providedMainStats);
  const [detailedStats, setDetailedStats] = useState<DetailedStatistics | null>(providedDetailedStats || null);
  const [isLoading, setIsLoading] = useState(providedIsLoading);
  const [isLoadingDetails, setIsLoadingDetails] = useState(providedIsLoadingDetails);
  const [error, setError] = useState<string | null>(providedError);
  const [isExpanded, setIsExpanded] = useState(false);
  const hasFetchedDetailsRef = useRef(false);
  const isFetchingDetailsRef = useRef(false);

  useEffect(() => {
    if (providedMainStats) {
      setMainStats(providedMainStats);
      setIsLoading(false);
    }
  }, [providedMainStats]);

  // Load detailed stats when expanded
  useEffect(() => {
    if (isExpanded && !hasFetchedDetailsRef.current && !isFetchingDetailsRef.current && onLoadDetailedStats) {
      isFetchingDetailsRef.current = true;
      setIsLoadingDetails(true);

      onLoadDetailedStats()
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
    } else if (providedDetailedStats) {
      setDetailedStats(providedDetailedStats);
    }
  }, [isExpanded, onLoadDetailedStats, providedDetailedStats]);

  // Main stats cards (always visible)
  const mainStatsCards = mainStats ? [
    {
      label: mainStats.learningStreak === 1 ? 'Day Streak' : 'Day Streak',
      value: mainStats.learningStreak.toString(),
      icon: Flame,
      color: 'text-orange-500',
      bg: 'bg-orange-100 dark:bg-orange-900/30',
      tooltip: 'Consecutive days you\'ve studied. Keep it going!',
    },
    {
      label: mainStats.conceptsMastered === 1 ? 'Concept Mastered' : 'Concepts Mastered',
      value: mainStats.conceptsMastered.toString(),
      icon: Trophy,
      color: 'text-yellow-500',
      bg: 'bg-yellow-100 dark:bg-yellow-900/30',
      tooltip: 'Concepts you\'ve fully mastered by completing lessons, answering questions, and reflecting on your learning.',
    },
    {
      label: mainStats.activeCourses === 1 ? 'Active Course' : 'Active Courses',
      value: mainStats.activeCourses.toString(),
      icon: BookOpen,
      color: 'text-blue-500',
      bg: 'bg-blue-100 dark:bg-blue-900/30',
      tooltip: 'Courses you\'re currently enrolled in and haven\'t completed yet.',
    },
  ] : [];

  // Additional stats (shown when expanded)
  const additionalStats = detailedStats ? [
    {
      label: 'Lessons Completed',
      value: detailedStats.lessonsCompleted.toString(),
      icon: CheckCircle,
      color: 'text-green-500',
      bg: 'bg-green-100 dark:bg-green-900/30',
      tooltip: 'Total number of lessons you\'ve completed across all courses.',
    },
    {
      label: 'Courses Completed',
      value: detailedStats.coursesCompleted.toString(),
      icon: GraduationCap,
      color: 'text-purple-500',
      bg: 'bg-purple-100 dark:bg-purple-900/30',
      tooltip: 'Total number of courses you\'ve fully completed.',
    },
  ] : [];

  if (isLoading) {
    return (
      <div className={cn('grid grid-cols-1 md:grid-cols-3 gap-4 mb-8', className)}>
        {Array.from({ length: 3 }).map((_, index) => (
          <Card key={index} loading>
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-gray-100 dark:bg-gray-700 animate-pulse w-12 h-12" />
              <div className="flex-1">
                <div className="h-8 bg-gray-100 dark:bg-gray-700 rounded animate-pulse mb-2 w-16" />
                <div className="h-4 bg-gray-100 dark:bg-gray-700 rounded animate-pulse w-24" />
              </div>
            </div>
          </Card>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className={cn('col-span-3 mb-8', className)}>
        <Alert variant="error" title="Error loading statistics">
          {error}
        </Alert>
      </div>
    );
  }

  if (!mainStats) {
    return null;
  }

  return (
    <div className={cn('mb-8', className)}>
      {/* Main Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        {mainStatsCards.map((stat, index) => (
          <div key={index} className="group relative">
            <StatCard
              label={stat.label}
              value={stat.value}
              icon={stat.icon}
              iconVariant="primary"
            />
            <Tooltip content={stat.tooltip} position="top">
              <div className="absolute right-4 top-4 z-10">
                <Icon icon={Info} size="sm" className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 cursor-help transition-colors" />
              </div>
            </Tooltip>
          </div>
        ))}
      </div>

      {/* Show More Button - Always show to allow expansion */}
      {additionalStats.length > 0 && (
        <div className="flex justify-center mb-4">
          <Button
            variant="ghost"
            size="sm"
            icon={isExpanded ? ChevronUp : ChevronDown}
            onClick={() => setIsExpanded(!isExpanded)}
          >
            {isExpanded ? 'Show Less' : 'Show More Stats'}
          </Button>
        </div>
      )}

      {/* Expanded Additional Stats */}
      {isExpanded && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 transition-all duration-300">
          {isLoadingDetails ? (
            <div className="col-span-2">
              <Card loading>
                <div className="flex items-center justify-center gap-3 py-8">
                  <Spinner size="md" />
                  <Typography variant="body" color="secondary">
                    Loading additional stats...
                  </Typography>
                </div>
              </Card>
            </div>
          ) : additionalStats.length > 0 ? (
            additionalStats.map((stat, index) => (
              <div key={index} className="group relative">
                <StatCard
                  label={stat.label}
                  value={stat.value}
                  icon={stat.icon}
                  iconVariant="primary"
                />
                <Tooltip content={stat.tooltip} position="top">
                  <div className="absolute right-4 top-4 z-10">
                    <Icon icon={Info} size="sm" className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 cursor-help transition-colors" />
                  </div>
                </Tooltip>
              </div>
            ))
          ) : (
            <div className="col-span-2">
              <Card>
                <Typography variant="body" color="secondary" className="text-center py-4">
                  No additional statistics available
                </Typography>
              </Card>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

EnhancedStatsCards.displayName = 'EnhancedStatsCards';
