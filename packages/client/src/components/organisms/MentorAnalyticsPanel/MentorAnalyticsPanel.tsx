/**
 * MentorAnalyticsPanel Organism Component
 * 
 * A comprehensive analytics dashboard panel for mentors.
 * Displays key metrics, charts, and insights.
 */

import React from 'react';
import { 
  Users, 
  TrendingUp, 
  TrendingDown,
  BookOpen,
  Clock,
  Star,
  GraduationCap,
  BarChart3,
  Calendar,
  Globe,
  Target,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Card } from '../../molecules/Card';
import { Typography } from '../../atoms/Typography';
import { Badge } from '../../atoms/Badge';
import { Icon } from '../../atoms/Icon';
import { ProgressBar } from '../../atoms/ProgressBar';
import { Divider } from '../../atoms/Divider';
import { cn } from '../../../utils/theme';

export interface AnalyticsMetric {
  /**
   * Metric label
   */
  label: string;
  
  /**
   * Current value
   */
  value: number | string;
  
  /**
   * Previous value for comparison
   */
  previousValue?: number;
  
  /**
   * Change percentage
   */
  change?: number;
  
  /**
   * Metric icon
   */
  icon?: LucideIcon;
  
  /**
   * Icon color class
   */
  iconColor?: string;
}

export interface LanguageStats {
  /**
   * Language code
   */
  language: string;
  
  /**
   * Language name
   */
  name: string;
  
  /**
   * Number of students using this language
   */
  studentCount: number;
  
  /**
   * Percentage of total students
   */
  percentage: number;
}

export interface ActivityData {
  /**
   * Date label
   */
  date: string;
  
  /**
   * Enrollments on this date
   */
  enrollments: number;
  
  /**
   * Completions on this date
   */
  completions: number;
}

export interface MentorAnalyticsPanelProps {
  /**
   * Course title
   */
  courseTitle?: string;
  
  /**
   * Total enrollments
   */
  totalEnrollments: number;
  
  /**
   * Enrollment change (percentage)
   */
  enrollmentChange?: number;
  
  /**
   * Active students (last 7 days)
   */
  activeStudents: number;
  
  /**
   * Active students change
   */
  activeChange?: number;
  
  /**
   * Completion rate (0-100)
   */
  completionRate: number;
  
  /**
   * Completion rate change
   */
  completionChange?: number;
  
  /**
   * Average rating (0-5)
   */
  averageRating?: number;
  
  /**
   * Total ratings count
   */
  ratingCount?: number;
  
  /**
   * Average time to complete (hours)
   */
  avgCompletionTime?: number;
  
  /**
   * Total lessons completed by all students
   */
  totalLessonsCompleted?: number;
  
  /**
   * Language usage statistics
   */
  languageStats?: LanguageStats[];
  
  /**
   * Recent activity data
   */
  activityData?: ActivityData[];
  
  /**
   * Custom metrics
   */
  customMetrics?: AnalyticsMetric[];
  
  /**
   * Period label (e.g., "Last 30 days")
   */
  periodLabel?: string;
  
  /**
   * Additional CSS classes
   */
  className?: string;
}

const formatNumber = (num: number): string => {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toString();
};

const ChangeIndicator: React.FC<{ change?: number }> = ({ change }) => {
  if (change === undefined) return null;
  
  const isPositive = change >= 0;
  const TrendIcon = isPositive ? TrendingUp : TrendingDown;
  
  return (
    <span className={cn(
      'inline-flex items-center gap-1 text-sm font-medium',
      isPositive ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
    )}>
      <Icon icon={TrendIcon} size="sm" />
      {isPositive ? '+' : ''}{change}%
    </span>
  );
};

const MetricCard: React.FC<{
  label: string;
  value: string | number;
  change?: number;
  icon: LucideIcon;
  iconColor?: string;
}> = ({ label, value, change, icon, iconColor = 'text-indigo-500' }) => (
  <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
    <div className="flex items-start justify-between mb-2">
      <Icon icon={icon} size="md" className={iconColor} />
      <ChangeIndicator change={change} />
    </div>
    <Typography variant="h3" className="mb-1">
      {typeof value === 'number' ? formatNumber(value) : value}
    </Typography>
    <Typography variant="small" color="secondary">
      {label}
    </Typography>
  </div>
);

export const MentorAnalyticsPanel: React.FC<MentorAnalyticsPanelProps> = ({
  courseTitle,
  totalEnrollments,
  enrollmentChange,
  activeStudents,
  activeChange,
  completionRate,
  completionChange,
  averageRating,
  ratingCount,
  avgCompletionTime,
  totalLessonsCompleted,
  languageStats = [],
  activityData = [],
  customMetrics = [],
  periodLabel = 'Last 30 days',
  className,
}) => {
  // Render stars
  const renderStars = (rating: number) => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <Icon 
          key={i}
          icon={Star} 
          size="sm" 
          className={cn(
            i <= Math.floor(rating) 
              ? 'text-yellow-400 fill-yellow-400' 
              : 'text-gray-300 dark:text-gray-600'
          )}
        />
      );
    }
    return stars;
  };
  
  return (
    <Card className={cn('', className)}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          {courseTitle && (
            <Typography variant="h5" className="mb-1">
              {courseTitle}
            </Typography>
          )}
          <div className="flex items-center gap-2">
            <Icon icon={Calendar} size="sm" className="text-gray-400" />
            <Typography variant="small" color="secondary">
              {periodLabel}
            </Typography>
          </div>
        </div>
        <Badge variant="info" size="md">
          <Icon icon={BarChart3} size="sm" className="mr-1" />
          Analytics
        </Badge>
      </div>
      
      {/* Key Metrics Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <MetricCard
          label="Total Enrollments"
          value={totalEnrollments}
          change={enrollmentChange}
          icon={Users}
          iconColor="text-indigo-500"
        />
        <MetricCard
          label="Active Students"
          value={activeStudents}
          change={activeChange}
          icon={Target}
          iconColor="text-blue-500"
        />
        <MetricCard
          label="Completion Rate"
          value={`${completionRate}%`}
          change={completionChange}
          icon={GraduationCap}
          iconColor="text-green-500"
        />
        {averageRating !== undefined && (
          <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <div className="flex items-start justify-between mb-2">
              <Icon icon={Star} size="md" className="text-yellow-500" />
            </div>
            <div className="flex items-center gap-1 mb-1">
              {renderStars(averageRating)}
              <Typography variant="h4" className="ml-1">
                {averageRating.toFixed(1)}
              </Typography>
            </div>
            <Typography variant="small" color="secondary">
              {ratingCount ? `${formatNumber(ratingCount)} reviews` : 'Average Rating'}
            </Typography>
          </div>
        )}
      </div>
      
      {/* Secondary Metrics */}
      {(avgCompletionTime !== undefined || totalLessonsCompleted !== undefined) && (
        <>
          <Divider className="my-4" />
          <div className="grid grid-cols-2 gap-4 mb-6">
            {avgCompletionTime !== undefined && (
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                  <Icon icon={Clock} size="md" className="text-purple-500" />
                </div>
                <div>
                  <Typography variant="h5">{avgCompletionTime}h</Typography>
                  <Typography variant="small" color="secondary">
                    Avg. Completion Time
                  </Typography>
                </div>
              </div>
            )}
            {totalLessonsCompleted !== undefined && (
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                  <Icon icon={BookOpen} size="md" className="text-blue-500" />
                </div>
                <div>
                  <Typography variant="h5">{formatNumber(totalLessonsCompleted)}</Typography>
                  <Typography variant="small" color="secondary">
                    Lessons Completed
                  </Typography>
                </div>
              </div>
            )}
          </div>
        </>
      )}
      
      {/* Language Distribution */}
      {languageStats.length > 0 && (
        <>
          <Divider className="my-4" />
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-4">
              <Icon icon={Globe} size="sm" className="text-gray-400" />
              <Typography variant="h6">Language Distribution</Typography>
            </div>
            <div className="space-y-3">
              {languageStats.slice(0, 5).map((lang) => (
                <div key={lang.language}>
                  <div className="flex items-center justify-between mb-1">
                    <Typography variant="small">{lang.name}</Typography>
                    <Typography variant="small" color="secondary">
                      {formatNumber(lang.studentCount)} ({lang.percentage}%)
                    </Typography>
                  </div>
                  <ProgressBar 
                    value={lang.percentage} 
                    size="sm"
                    color="primary"
                  />
                </div>
              ))}
            </div>
          </div>
        </>
      )}
      
      {/* Custom Metrics */}
      {customMetrics.length > 0 && (
        <>
          <Divider className="my-4" />
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
            {customMetrics.map((metric, index) => (
              <MetricCard
                key={index}
                label={metric.label}
                value={metric.value}
                change={metric.change}
                icon={metric.icon || BarChart3}
                iconColor={metric.iconColor}
              />
            ))}
          </div>
        </>
      )}
    </Card>
  );
};

MentorAnalyticsPanel.displayName = 'MentorAnalyticsPanel';





