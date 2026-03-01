/**
 * QuickStatsWidget Organism Component
 * 
 * Displays quick statistics in an expandable card format.
 * Uses Card, Icon, Typography, Spinner atoms and Card molecule.
 */

import React, { useState } from 'react';
import { CheckCircle, GraduationCap, Trophy, Flame, BookOpen, ChevronDown, ChevronUp } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Card } from '../../molecules/Card';
import { Icon } from '../../atoms/Icon';
import { Typography } from '../../atoms/Typography';
import { Spinner } from '../../atoms/Spinner';
import { Button } from '../../atoms/Button';
import { Alert } from '../../molecules/Alert';
import { cn } from '../../../utils/theme';

export interface QuickStat {
  label: string;
  value: string | number;
  icon: LucideIcon;
  color: string;
}

export interface QuickStatsWidgetProps {
  /**
   * Statistics data
   */
  stats?: {
    lessonsCompleted: number;
    coursesCompleted: number;
    conceptsMastered: number;
    learningStreak: number;
    activeCourses: number;
  };
  
  /**
   * Is loading
   */
  isLoading?: boolean;
  
  /**
   * Error message
   */
  error?: string | null;
  
  /**
   * On load stats (if not provided, stats prop is used)
   */
  onLoadStats?: () => Promise<{
    lessonsCompleted: number;
    coursesCompleted: number;
    conceptsMastered: number;
    learningStreak: number;
    activeCourses: number;
  }>;
  
  /**
   * Additional CSS classes
   */
  className?: string;
}

export const QuickStatsWidget: React.FC<QuickStatsWidgetProps> = ({
  stats: providedStats,
  isLoading: providedIsLoading = false,
  error: providedError = null,
  onLoadStats,
  className,
}) => {
  const [stats, setStats] = React.useState(providedStats);
  const [isLoading, setIsLoading] = React.useState(providedIsLoading);
  const [error, setError] = React.useState<string | null>(providedError);
  const [isExpanded, setIsExpanded] = useState(false);

  React.useEffect(() => {
    if (providedStats) {
      setStats(providedStats);
      setIsLoading(false);
      return;
    }

    if (!onLoadStats) return;

    setIsLoading(true);
    setError(null);

    onLoadStats()
      .then((data) => {
        setStats(data);
      })
      .catch((err: any) => {
        console.error('Failed to load statistics:', err);
        setError(err.message || 'Failed to load statistics');
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [providedStats, onLoadStats]);

  if (isLoading) {
    return (
      <Card className={className} loading>
        <div className="flex items-center justify-center gap-3 py-8">
          <Spinner size="md" />
          <Typography variant="body" color="secondary">
            Loading statistics...
          </Typography>
        </div>
      </Card>
    );
  }

  if (error || !stats) {
    return null; // Don't show error, just hide widget
  }

  // Summary stats (shown when collapsed)
  const summaryStats: QuickStat[] = [
    { label: 'Lessons Completed', value: stats.lessonsCompleted, icon: CheckCircle, color: 'text-green-500' },
    { label: 'Courses Completed', value: stats.coursesCompleted, icon: GraduationCap, color: 'text-blue-500' },
    { label: 'Concepts Mastered', value: stats.conceptsMastered, icon: Trophy, color: 'text-yellow-500' },
  ];

  // All stats (shown when expanded)
  const allStats: QuickStat[] = [
    ...summaryStats,
    { label: 'Learning Streak', value: `${stats.learningStreak} days`, icon: Flame, color: 'text-orange-500' },
    { label: 'Active Courses', value: stats.activeCourses, icon: BookOpen, color: 'text-indigo-500' },
  ];

  const displayStats = isExpanded ? allStats : summaryStats;

  return (
    <Card
      className={className}
      header={
        <div className="flex items-center justify-between">
          <Typography variant="h6">Quick Stats</Typography>
          {allStats.length > summaryStats.length && (
            <Button
              variant="ghost"
              size="sm"
              icon={isExpanded ? ChevronUp : ChevronDown}
              onClick={() => setIsExpanded(!isExpanded)}
            >
              {isExpanded ? 'Show Less' : 'Show More'}
            </Button>
          )}
        </div>
      }
    >

      <div className={cn(
        'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 transition-all duration-300',
        isExpanded ? 'opacity-100' : 'opacity-100'
      )}>
        {displayStats.map((stat, index) => {
          return (
            <div
              key={index}
              className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600"
            >
              <div className={cn('p-2 rounded-lg bg-white dark:bg-gray-800', stat.color)}>
                <Icon icon={stat.icon} size="md" />
              </div>
              <div className="flex-1 min-w-0">
                <Typography variant="h4" className="text-2xl font-bold">
                  {stat.value}
                </Typography>
                <Typography variant="body" color="secondary" className="text-xs truncate">
                  {stat.label}
                </Typography>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
};

QuickStatsWidget.displayName = 'QuickStatsWidget';
