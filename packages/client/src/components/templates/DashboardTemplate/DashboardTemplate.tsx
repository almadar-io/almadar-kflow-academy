/**
 * DashboardTemplate Component
 * 
 * Main dashboard layout for both mentor and student views.
 * Uses AppLayoutTemplate for consistent layout structure.
 */

import React from 'react';
import type { LucideIcon } from 'lucide-react';
import { AppLayoutTemplate } from '../AppLayoutTemplate';
import { ProgressTracker, Lesson as ProgressTrackerLesson } from '../../organisms/ProgressTracker';
import { StatCard } from '../../molecules/StatCard';
import { Card } from '../../molecules/Card';
import { Button } from '../../atoms/Button';
import { Typography } from '../../atoms/Typography';
import { cn } from '../../../utils/theme';

export interface DashboardStat {
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
   * Change value (positive or negative)
   */
  change?: number;
  
  /**
   * Change type
   */
  changeType?: 'increase' | 'decrease';
}

export interface DashboardActivity {
  /**
   * Activity ID
   */
  id: string;
  
  /**
   * Activity title
   */
  title: string;
  
  /**
   * Activity description
   */
  description?: string;
  
  /**
   * Activity timestamp
   */
  timestamp: string;
  
  /**
   * Activity icon
   */
  icon?: LucideIcon;
}

export interface DashboardTemplateProps {
  /**
   * Dashboard variant
   */
  variant?: 'student' | 'mentor';
  
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
   * Statistics to display
   */
  stats?: DashboardStat[];
  
  /**
   * Progress data
   */
  progress?: {
    value: number;
    totalLessons: number;
    completedLessons: number;
    currentLesson?: ProgressTrackerLesson;
    nextLesson?: ProgressTrackerLesson;
  };
  
  /**
   * Recent activity items
   */
  activities?: DashboardActivity[];
  
  /**
   * Main content area
   */
  children?: React.ReactNode;
  
  /**
   * Quick action buttons
   */
  quickActions?: Array<{
    label: string;
    icon?: LucideIcon;
    onClick?: () => void;
    variant?: 'primary' | 'secondary' | 'success';
  }>;
  
  /**
   * Logo element for header/sidebar
   */
  logo?: React.ReactNode;
  
  /**
   * Logo image source
   */
  logoSrc?: string;
  
  /**
   * Brand name
   */
  brandName?: string;
  
  /**
   * On logo click
   */
  onLogoClick?: () => void;
  
  /**
   * Footer content for sidebar (e.g., theme toggle)
   */
  sidebarFooterContent?: React.ReactNode;
  
  /**
   * User section for sidebar footer
   */
  sidebarUserSection?: React.ReactNode;
  
  /**
   * On user click in header
   */
  onUserClick?: () => void;
  
  /**
   * On logout handler
   */
  onLogout?: () => void;
  
  /**
   * Additional CSS classes
   */
  className?: string;
}

export const DashboardTemplate: React.FC<DashboardTemplateProps> = ({
  variant = 'student',
  user,
  navigationItems = [],
  stats = [],
  progress,
  activities = [],
  children,
  quickActions = [],
  logo,
  logoSrc,
  brandName = 'KFlow',
  onLogoClick,
  sidebarFooterContent,
  sidebarUserSection,
  onUserClick,
  onLogout,
  className,
}) => {
  return (
    <AppLayoutTemplate
      navigationItems={navigationItems}
      user={user}
      onLogout={onLogout}
      logo={logo}
      logoSrc={logoSrc}
      brandName={brandName}
      onLogoClick={onLogoClick}
      sidebarFooterContent={sidebarFooterContent}
      sidebarUserSection={sidebarUserSection}
      className={className}
    >
      <div>
        {/* Stats row */}
        {stats.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-4 sm:mb-6">
            {stats.map((stat, index) => (
              <StatCard
                key={index}
                label={stat.label}
                value={stat.value}
                icon={stat.icon}
                change={stat.change !== undefined ? (stat.change > 0 ? `+${stat.change}` : `${stat.change}`) : undefined}
                changeType={stat.changeType === 'increase' ? 'positive' : stat.changeType === 'decrease' ? 'negative' : 'neutral'}
              />
            ))}
          </div>
        )}

        {/* Main content grid */}
        <div className={cn(
          quickActions.length > 0 || activities.length > 0 
            ? 'grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6' 
            : ''
        )}>
          {/* Left column - Main content */}
          <div className={cn(
            quickActions.length > 0 || activities.length > 0 
              ? 'lg:col-span-2' 
              : 'w-full',
            'space-y-4 sm:space-y-6'
          )}>
            {/* Progress tracker */}
            {progress && (
              <ProgressTracker
                progress={progress.value}
                totalLessons={progress.totalLessons}
                completedLessons={progress.completedLessons}
                currentLesson={progress.currentLesson}
                nextLesson={progress.nextLesson}
                showCelebration={progress.value === 100}
              />
            )}

            {/* Custom content */}
            {children}
          </div>

          {/* Right column - Activity & Quick Actions */}
          {(quickActions.length > 0 || activities.length > 0) && (
            <div className="space-y-4 sm:space-y-6 order-first lg:order-last">
              {/* Quick Actions */}
              {quickActions.length > 0 && (
                <Card>
                  <Typography variant="h6" className="mb-4">
                    Quick Actions
                  </Typography>
                  <div className="space-y-2">
                    {quickActions.map((action, index) => (
                      <Button
                        key={index}
                        variant={action.variant || 'secondary'}
                        icon={action.icon}
                        onClick={action.onClick}
                        fullWidth
                      >
                        {action.label}
                      </Button>
                    ))}
                  </div>
                </Card>
              )}

              {/* Recent Activity */}
              {activities.length > 0 && (
                <Card>
                  <Typography variant="h6" className="mb-4">
                    Recent Activity
                  </Typography>
                  <div className="space-y-4">
                    {activities.map((activity) => (
                      <div
                        key={activity.id}
                        className="flex items-start gap-3 pb-3 border-b border-gray-100 dark:border-gray-700 last:border-0 last:pb-0"
                      >
                        <div className="flex-1 min-w-0">
                          <Typography variant="body" weight="medium" className="truncate">
                            {activity.title}
                          </Typography>
                          {activity.description && (
                            <Typography variant="small" color="secondary" className="truncate">
                              {activity.description}
                            </Typography>
                          )}
                          <Typography variant="small" color="muted">
                            {activity.timestamp}
                          </Typography>
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              )}
            </div>
          )}
        </div>
      </div>
    </AppLayoutTemplate>
  );
};

DashboardTemplate.displayName = 'DashboardTemplate';
