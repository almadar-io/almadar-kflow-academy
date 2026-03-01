/**
 * AnalyticsTemplate Component
 * 
 * Learning analytics and insights dashboard.
 * Uses AppLayoutTemplate for consistent layout structure.
 */

import React, { useState } from 'react';
import type { LucideIcon } from 'lucide-react';
import { 
  BarChart3, 
  TrendingUp, 
  Clock, 
  Target, 
  BookOpen, 
  Award,
  Calendar,
  Download
} from 'lucide-react';
import { AppLayoutTemplate } from '../AppLayoutTemplate';
import { StatCard } from '../../molecules/StatCard';
import { Card } from '../../molecules/Card';
import { Tabs, TabItem } from '../../molecules/Tabs';
import { SelectDropdown } from '../../molecules/SelectDropdown';
import { Button } from '../../atoms/Button';
import { Typography } from '../../atoms/Typography';
import { ProgressBar } from '../../atoms/ProgressBar';
import { Badge } from '../../atoms/Badge';
import { cn } from '../../../utils/theme';

export interface AnalyticsStat {
  /**
   * Stat label
   */
  label: string;
  
  /**
   * Stat value
   */
  value: string | number;
  
  /**
   * Stat icon
   */
  icon?: LucideIcon;
  
  /**
   * Change value
   */
  change?: number;
  
  /**
   * Change type
   */
  changeType?: 'increase' | 'decrease';
}

export interface ProgressItem {
  /**
   * Item ID
   */
  id: string;
  
  /**
   * Item name
   */
  name: string;
  
  /**
   * Progress value (0-100)
   */
  progress: number;
  
  /**
   * Status
   */
  status?: 'completed' | 'in-progress' | 'not-started';
}

export interface ActivityItem {
  /**
   * Activity date
   */
  date: string;
  
  /**
   * Minutes spent
   */
  minutes: number;
  
  /**
   * Lessons completed
   */
  lessonsCompleted: number;
}

export interface AnalyticsTemplateProps {
  /**
   * Page title
   */
  title?: string;
  
  /**
   * Time range options
   */
  timeRangeOptions?: Array<{ value: string; label: string }>;
  
  /**
   * Current time range
   */
  timeRange?: string;
  
  /**
   * On time range change
   */
  onTimeRangeChange?: (value: string) => void;
  
  /**
   * Overview statistics
   */
  stats?: AnalyticsStat[];
  
  /**
   * Course progress data
   */
  courseProgress?: ProgressItem[];
  
  /**
   * Daily activity data
   */
  dailyActivity?: ActivityItem[];
  
  /**
   * Achievement data
   */
  achievements?: Array<{
    id: string;
    title: string;
    description: string;
    icon?: string;
    earnedAt?: string;
  }>;
  
  /**
   * On export
   */
  onExport?: (format: 'pdf' | 'csv') => void;
  
  /**
   * User information for header
   */
  user?: {
    name: string;
    email?: string;
    avatar?: string;
  };
  
  /**
   * Navigation items for sidebar
   */
  navigationItems?: Array<{
    id: string;
    label: string;
    icon?: LucideIcon;
    href?: string;
    onClick?: () => void;
    badge?: string | number;
    active?: boolean;
  }>;
  
  /**
   * Logo element
   */
  logo?: React.ReactNode;
  
  /**
   * On logo click
   */
  onLogoClick?: () => void;
  
  /**
   * On logout handler
   */
  onLogout?: () => void;
  
  /**
   * Additional CSS classes
   */
  className?: string;
}

export const AnalyticsTemplate: React.FC<AnalyticsTemplateProps> = ({
  title = 'Analytics',
  timeRangeOptions = [
    { value: '7d', label: 'Last 7 days' },
    { value: '30d', label: 'Last 30 days' },
    { value: '90d', label: 'Last 90 days' },
    { value: 'all', label: 'All time' },
  ],
  timeRange = '30d',
  onTimeRangeChange,
  stats = [],
  courseProgress = [],
  dailyActivity = [],
  achievements = [],
  onExport,
  user,
  navigationItems = [],
  logo,
  onLogoClick,
  onLogout,
  className,
}) => {
  const [activeTab, setActiveTab] = useState('overview');

  const tabs: TabItem[] = [
    { id: 'overview', label: 'Overview', content: null },
    { id: 'progress', label: 'Progress', content: null },
    { id: 'activity', label: 'Activity', content: null },
    { id: 'achievements', label: 'Achievements', content: null },
  ];

  // Simple bar chart visualization
  const maxMinutes = Math.max(...dailyActivity.map(a => a.minutes), 1);

  return (
    <AppLayoutTemplate
      navigationItems={navigationItems}
      user={user}
      onLogout={onLogout}
      logo={logo}
      brandName="KFlow"
      onLogoClick={onLogoClick}
      className={className}
    >
          {/* Page header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <Typography variant="h3" className="text-2xl sm:text-3xl">{title}</Typography>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
              <SelectDropdown
                options={timeRangeOptions}
                value={timeRange}
                onChange={(value) => onTimeRangeChange?.(value as string)}
                className="w-full sm:w-40"
              />
              {onExport && (
                <Button
                  variant="secondary"
                  icon={Download}
                  onClick={() => onExport('pdf')}
                  className="w-full sm:w-auto"
                >
                  <span className="hidden sm:inline">Export</span>
                  <span className="sm:hidden">Export</span>
                </Button>
              )}
            </div>
          </div>

          {/* Tabs */}
          <Tabs
            items={tabs}
            activeTab={activeTab}
            onTabChange={setActiveTab}
            className="mb-6"
          />

          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Stats grid */}
              {stats.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {stats.map((stat, index) => (
                    <StatCard
                      key={index}
                      label={stat.label}
                      value={stat.value}
                      icon={stat.icon}
                      change={stat.change !== undefined ? (stat.change > 0 ? `+${stat.change}` : `${stat.change}`) : undefined}
                      changeType={stat.changeType === 'increase' ? 'positive' : stat.changeType === 'decrease' ? 'negative' : undefined}
                    />
                  ))}
                </div>
              )}

              {/* Charts row */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                {/* Activity chart */}
                {dailyActivity.length > 0 && (
                  <Card>
                    <Typography variant="h6" className="mb-4">Daily Activity</Typography>
                    <div className="flex items-end gap-1 h-40">
                      {dailyActivity.slice(-14).map((day, index) => (
                        <div
                          key={index}
                          className="flex-1 flex flex-col items-center gap-1"
                        >
                          <div
                            className="w-full bg-indigo-600 rounded-t"
                            style={{ height: `${(day.minutes / maxMinutes) * 100}%` }}
                          />
                          <Typography variant="small" color="muted" className="text-[10px]">
                            {day.date.slice(-2)}
                          </Typography>
                        </div>
                      ))}
                    </div>
                    <div className="flex justify-between mt-4 text-sm text-gray-500">
                      <span>Minutes per day</span>
                      <span>Last 14 days</span>
                    </div>
                  </Card>
                )}

                {/* Progress summary */}
                {courseProgress.length > 0 && (
                  <Card>
                    <Typography variant="h6" className="mb-4">Course Progress</Typography>
                    <div className="space-y-4">
                      {courseProgress.slice(0, 5).map((course) => (
                        <div key={course.id}>
                          <div className="flex items-center justify-between mb-1">
                            <Typography variant="small" className="truncate">
                              {course.name}
                            </Typography>
                            <Typography variant="small" color="muted">
                              {course.progress}%
                            </Typography>
                          </div>
                          <ProgressBar
                            value={course.progress}
                            color={course.progress === 100 ? 'success' : 'primary'}
                            size="sm"
                          />
                        </div>
                      ))}
                    </div>
                  </Card>
                )}
              </div>
            </div>
          )}

          {/* Progress Tab */}
          {activeTab === 'progress' && (
            <div className="space-y-4">
              {courseProgress.map((course) => (
                <Card key={course.id}>
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0 mr-4">
                      <Typography variant="h6" className="truncate">
                        {course.name}
                      </Typography>
                      <div className="flex items-center gap-2 mt-2">
                        <ProgressBar
                          value={course.progress}
                          color={course.progress === 100 ? 'success' : 'primary'}
                          className="flex-1"
                        />
                        <Typography variant="small" color="muted" className="w-12 text-right">
                          {course.progress}%
                        </Typography>
                      </div>
                    </div>
                    <Badge
                      variant={
                        course.status === 'completed' ? 'success' :
                        course.status === 'in-progress' ? 'primary' : 'default'
                      }
                    >
                      {course.status === 'completed' ? 'Completed' :
                       course.status === 'in-progress' ? 'In Progress' : 'Not Started'}
                    </Badge>
                  </div>
                </Card>
              ))}
            </div>
          )}

          {/* Activity Tab */}
          {activeTab === 'activity' && (
            <Card>
              <Typography variant="h6" className="mb-4">Learning Activity</Typography>
              <div className="overflow-x-auto -mx-4 sm:mx-0">
                  <table className="w-full min-w-[600px]">
                    <thead>
                      <tr className="border-b border-gray-200 dark:border-gray-700">
                        <th className="text-left py-3 px-2 sm:px-4">
                          <Typography variant="small" weight="semibold">Date</Typography>
                        </th>
                        <th className="text-left py-3 px-2 sm:px-4">
                          <Typography variant="small" weight="semibold">Time Spent</Typography>
                        </th>
                        <th className="text-left py-3 px-2 sm:px-4">
                          <Typography variant="small" weight="semibold">Lessons</Typography>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                    {dailyActivity.map((day, index) => (
                      <tr key={index} className="border-b border-gray-100 dark:border-gray-700">
                        <td className="py-3 px-2 sm:px-4">
                          <Typography variant="body" className="text-sm sm:text-base">{day.date}</Typography>
                        </td>
                        <td className="py-3 px-2 sm:px-4">
                          <Typography variant="body" className="text-sm sm:text-base">{day.minutes} min</Typography>
                        </td>
                        <td className="py-3 px-2 sm:px-4">
                          <Typography variant="body" className="text-sm sm:text-base">{day.lessonsCompleted}</Typography>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}

          {/* Achievements Tab */}
          {activeTab === 'achievements' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
              {achievements.map((achievement) => (
                <Card key={achievement.id}>
                  <div className="flex items-start gap-4">
                    <div className="text-4xl">{achievement.icon || '🏆'}</div>
                    <div>
                      <Typography variant="h6">{achievement.title}</Typography>
                      <Typography variant="small" color="secondary">
                        {achievement.description}
                      </Typography>
                      {achievement.earnedAt && (
                        <Typography variant="small" color="muted" className="mt-2">
                          Earned: {achievement.earnedAt}
                        </Typography>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
    </AppLayoutTemplate>
  );
};

AnalyticsTemplate.displayName = 'AnalyticsTemplate';

