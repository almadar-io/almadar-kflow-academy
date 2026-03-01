/**
 * CourseStatsCard Organism Component
 * 
 * A card displaying course metrics and statistics for mentors.
 * Shows enrollment, completion rate, average rating, and revenue.
 */

import React from 'react';
import { 
  Users, 
  GraduationCap, 
  Star, 
  TrendingUp,
  TrendingDown,
  Clock,
  BookOpen,
  Award,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Card } from '../../molecules/Card';
import { Typography } from '../../atoms/Typography';
import { Badge } from '../../atoms/Badge';
import { Icon } from '../../atoms/Icon';
import { Divider } from '../../atoms/Divider';
import { cn } from '../../../utils/theme';

export interface CourseStat {
  /**
   * Stat label
   */
  label: string;
  
  /**
   * Stat value
   */
  value: string | number;
  
  /**
   * Icon to display
   */
  icon: LucideIcon;
  
  /**
   * Icon color
   */
  iconColor?: string;
  
  /**
   * Change from previous period
   */
  change?: number;
  
  /**
   * Change period label
   */
  changePeriod?: string;
}

export interface CourseStatsCardProps {
  /**
   * Course title
   */
  title: string;
  
  /**
   * Number of enrolled students
   */
  enrollmentCount: number;
  
  /**
   * Enrollment change from last period
   */
  enrollmentChange?: number;
  
  /**
   * Completion rate (0-100)
   */
  completionRate: number;
  
  /**
   * Completion rate change from last period
   */
  completionChange?: number;
  
  /**
   * Average rating (0-5)
   */
  averageRating?: number;
  
  /**
   * Number of ratings
   */
  ratingCount?: number;
  
  /**
   * Total lessons completed by all students
   */
  lessonsCompleted?: number;
  
  /**
   * Average time to complete (in hours)
   */
  avgCompletionTime?: number;
  
  /**
   * Certificates issued
   */
  certificatesIssued?: number;
  
  /**
   * Custom stats to display
   */
  customStats?: CourseStat[];
  
  /**
   * Layout variant
   * @default 'compact'
   */
  variant?: 'compact' | 'detailed';
  
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

const ChangeIndicator: React.FC<{ change: number; period?: string }> = ({ change, period }) => {
  const isPositive = change >= 0;
  const TrendIcon = isPositive ? TrendingUp : TrendingDown;
  
  return (
    <span className={cn(
      'inline-flex items-center gap-1 text-xs font-medium',
      isPositive ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
    )}>
      <Icon icon={TrendIcon} size="xs" />
      {isPositive ? '+' : ''}{change}%
      {period && <span className="text-gray-500 dark:text-gray-400 font-normal">vs {period}</span>}
    </span>
  );
};

const StatItem: React.FC<{
  icon: LucideIcon;
  iconColor?: string;
  label: string;
  value: string | number;
  change?: number;
  changePeriod?: string;
}> = ({ icon, iconColor = 'text-indigo-500', label, value, change, changePeriod }) => (
  <div className="flex items-center gap-3">
    <div className={cn(
      'w-10 h-10 rounded-lg flex items-center justify-center',
      'bg-gray-100 dark:bg-gray-800'
    )}>
      <Icon icon={icon} size="md" className={iconColor} />
    </div>
    <div className="flex-1">
      <Typography variant="small" color="secondary">
        {label}
      </Typography>
      <div className="flex items-center gap-2">
        <Typography variant="h5">
          {typeof value === 'number' ? formatNumber(value) : value}
        </Typography>
        {change !== undefined && (
          <ChangeIndicator change={change} period={changePeriod} />
        )}
      </div>
    </div>
  </div>
);

export const CourseStatsCard: React.FC<CourseStatsCardProps> = ({
  title,
  enrollmentCount,
  enrollmentChange,
  completionRate,
  completionChange,
  averageRating,
  ratingCount,
  lessonsCompleted,
  avgCompletionTime,
  certificatesIssued,
  customStats = [],
  variant = 'compact',
  className,
}) => {
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
  
  if (variant === 'compact') {
    return (
      <Card className={cn('', className)}>
        <Typography variant="h6" className="mb-4">{title}</Typography>
        
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <Icon icon={Users} size="md" className="mx-auto text-indigo-500 mb-1" />
            <Typography variant="h4">{formatNumber(enrollmentCount)}</Typography>
            <Typography variant="small" color="secondary">Students</Typography>
            {enrollmentChange !== undefined && (
              <ChangeIndicator change={enrollmentChange} />
            )}
          </div>
          
          <div className="text-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <Icon icon={GraduationCap} size="md" className="mx-auto text-green-500 mb-1" />
            <Typography variant="h4">{completionRate}%</Typography>
            <Typography variant="small" color="secondary">Completion</Typography>
            {completionChange !== undefined && (
              <ChangeIndicator change={completionChange} />
            )}
          </div>
          
          {averageRating !== undefined && (
            <div className="col-span-2 text-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <div className="flex items-center justify-center gap-1 mb-1">
                {renderStars(averageRating)}
              </div>
              <Typography variant="h5">{averageRating.toFixed(1)}</Typography>
              {ratingCount !== undefined && (
                <Typography variant="small" color="secondary">
                  ({formatNumber(ratingCount)} ratings)
                </Typography>
              )}
            </div>
          )}
        </div>
      </Card>
    );
  }
  
  // Detailed variant
  return (
    <Card className={cn('', className)}>
      <Typography variant="h5" className="mb-4">{title}</Typography>
      
      <div className="space-y-4">
        <StatItem
          icon={Users}
          iconColor="text-indigo-500"
          label="Enrolled Students"
          value={enrollmentCount}
          change={enrollmentChange}
          changePeriod="last month"
        />
        
        <StatItem
          icon={GraduationCap}
          iconColor="text-green-500"
          label="Completion Rate"
          value={`${completionRate}%`}
          change={completionChange}
          changePeriod="last month"
        />
        
        {averageRating !== undefined && (
          <div className="flex items-center gap-3">
            <div className={cn(
              'w-10 h-10 rounded-lg flex items-center justify-center',
              'bg-gray-100 dark:bg-gray-800'
            )}>
              <Icon icon={Star} size="md" className="text-yellow-500" />
            </div>
            <div className="flex-1">
              <Typography variant="small" color="secondary">
                Average Rating
              </Typography>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-0.5">
                  {renderStars(averageRating)}
                </div>
                <Typography variant="body" weight="semibold">
                  {averageRating.toFixed(1)}
                </Typography>
                {ratingCount !== undefined && (
                  <Typography variant="small" color="secondary">
                    ({formatNumber(ratingCount)})
                  </Typography>
                )}
              </div>
            </div>
          </div>
        )}
        
        <Divider />
        
        <div className="grid grid-cols-3 gap-4 text-center">
          {lessonsCompleted !== undefined && (
            <div>
              <Icon icon={BookOpen} size="sm" className="mx-auto text-blue-500 mb-1" />
              <Typography variant="h6">{formatNumber(lessonsCompleted)}</Typography>
              <Typography variant="small" color="secondary">Lessons Done</Typography>
            </div>
          )}
          
          {avgCompletionTime !== undefined && (
            <div>
              <Icon icon={Clock} size="sm" className="mx-auto text-purple-500 mb-1" />
              <Typography variant="h6">{avgCompletionTime}h</Typography>
              <Typography variant="small" color="secondary">Avg Time</Typography>
            </div>
          )}
          
          {certificatesIssued !== undefined && (
            <div>
              <Icon icon={Award} size="sm" className="mx-auto text-orange-500 mb-1" />
              <Typography variant="h6">{formatNumber(certificatesIssued)}</Typography>
              <Typography variant="small" color="secondary">Certificates</Typography>
            </div>
          )}
        </div>
        
        {customStats.length > 0 && (
          <>
            <Divider />
            <div className="space-y-3">
              {customStats.map((stat, index) => (
                <StatItem
                  key={index}
                  icon={stat.icon}
                  iconColor={stat.iconColor}
                  label={stat.label}
                  value={stat.value}
                  change={stat.change}
                  changePeriod={stat.changePeriod}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </Card>
  );
};

CourseStatsCard.displayName = 'CourseStatsCard';





