/**
 * MentorDashboardTemplate Component
 * 
 * Enhanced mentor dashboard with course stats, publishing status,
 * student metrics, and quick actions.
 */

import React from 'react';
import type { LucideIcon } from 'lucide-react';
import {
  BookOpen,
  Users,
  TrendingUp,
  Plus,
  Eye,
  Settings,
  Globe,
  Star,
  Clock,
  GraduationCap,
} from 'lucide-react';
import { AppLayoutTemplate } from '../AppLayoutTemplate';
import { CourseStatsCard } from '../../organisms/CourseStatsCard';
import { StatCard } from '../../molecules/StatCard';
import { Card } from '../../molecules/Card';
import { Button } from '../../atoms/Button';
import { Typography } from '../../atoms/Typography';
import { Badge } from '../../atoms/Badge';
import { ProgressBar } from '../../atoms/ProgressBar';
import { Avatar } from '../../atoms/Avatar';
import { Icon } from '../../atoms/Icon';
import { Divider } from '../../atoms/Divider';
import { EmptyState } from '../../molecules/EmptyState';
import { cn } from '../../../utils/theme';

export interface MentorCourse {
  /**
   * Course ID
   */
  id: string;
  
  /**
   * Course title
   */
  title: string;
  
  /**
   * Course description
   */
  description?: string;
  
  /**
   * Thumbnail image
   */
  thumbnail?: string;
  
  /**
   * Is published
   */
  isPublished: boolean;
  
  /**
   * Enrolled student count
   */
  studentCount: number;
  
  /**
   * Completion rate (0-100)
   */
  completionRate: number;
  
  /**
   * Average rating (0-5)
   */
  rating?: number;
  
  /**
   * Publishing readiness (0-100)
   */
  readiness?: number;
  
  /**
   * Last updated date
   */
  updatedAt?: Date | string;
}

export interface MentorStat {
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

export interface RecentActivity {
  /**
   * Activity ID
   */
  id: string;
  
  /**
   * Activity type
   */
  type: 'enrollment' | 'completion' | 'rating' | 'comment';
  
  /**
   * Student name
   */
  studentName: string;
  
  /**
   * Student avatar
   */
  studentAvatar?: string;
  
  /**
   * Course title
   */
  courseName: string;
  
  /**
   * Timestamp
   */
  timestamp: Date | string;
  
  /**
   * Additional data (e.g., rating value)
   */
  data?: any;
}

export interface MentorDashboardTemplateProps {
  /**
   * Mentor name
   */
  mentorName?: string;
  
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
   * Dashboard statistics
   */
  stats?: MentorStat[];
  
  /**
   * Mentor courses
   */
  courses?: MentorCourse[];
  
  /**
   * Recent activity
   */
  recentActivity?: RecentActivity[];
  
  /**
   * On create new course
   */
  onCreateCourse?: () => void;
  
  /**
   * On view course
   */
  onViewCourse?: (courseId: string) => void;
  
  /**
   * On edit course
   */
  onEditCourse?: (courseId: string) => void;
  
  /**
   * On view analytics
   */
  onViewAnalytics?: (courseId: string) => void;
  
  /**
   * On preview course
   */
  onPreviewCourse?: (courseId: string) => void;
  
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
   * Footer content for sidebar
   */
  sidebarFooterContent?: React.ReactNode;
  
  /**
   * Additional CSS classes
   */
  className?: string;
  
  /**
   * Children for additional content
   */
  children?: React.ReactNode;
}

const formatDate = (date: Date | string | undefined): string => {
  if (!date) return '';
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
};

const formatRelativeTime = (date: Date | string): string => {
  const d = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return formatDate(d);
};

const getActivityIcon = (type: RecentActivity['type']): LucideIcon => {
  switch (type) {
    case 'enrollment': return Users;
    case 'completion': return GraduationCap;
    case 'rating': return Star;
    case 'comment': return BookOpen;
    default: return BookOpen;
  }
};

const getActivityMessage = (activity: RecentActivity): string => {
  switch (activity.type) {
    case 'enrollment':
      return `enrolled in ${activity.courseName}`;
    case 'completion':
      return `completed ${activity.courseName}`;
    case 'rating':
      return `rated ${activity.courseName} ${activity.data?.rating || 5} stars`;
    case 'comment':
      return `commented on ${activity.courseName}`;
    default:
      return `interacted with ${activity.courseName}`;
  }
};

const CourseCard: React.FC<{
  course: MentorCourse;
  onView?: () => void;
  onEdit?: () => void;
  onAnalytics?: () => void;
  onPreview?: () => void;
}> = ({ course, onView, onEdit, onAnalytics, onPreview }) => (
  <Card className="hover:shadow-md transition-shadow">
    <div className="flex gap-4">
      {/* Thumbnail */}
      <div className="w-20 h-20 flex-shrink-0 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
        {course.thumbnail ? (
          <img 
            src={course.thumbnail} 
            alt={course.title} 
            className="w-full h-full object-cover rounded-lg"
          />
        ) : (
          <Icon icon={BookOpen} size="lg" className="text-white" />
        )}
      </div>
      
      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2 mb-1">
          <Typography variant="h6" className="truncate">
            {course.title}
          </Typography>
          <Badge variant={course.isPublished ? 'success' : 'default'} size="sm">
            {course.isPublished ? 'Published' : 'Draft'}
          </Badge>
        </div>
        
        <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400 mb-2">
          <span className="flex items-center gap-1">
            <Icon icon={Users} size="xs" />
            {course.studentCount} students
          </span>
          <span className="flex items-center gap-1">
            <Icon icon={GraduationCap} size="xs" />
            {course.completionRate}% completion
          </span>
          {course.rating !== undefined && (
            <span className="flex items-center gap-1">
              <Icon icon={Star} size="xs" className="text-yellow-400 fill-yellow-400" />
              {course.rating.toFixed(1)}
            </span>
          )}
        </div>
        
        {/* Readiness progress for drafts */}
        {!course.isPublished && course.readiness !== undefined && (
          <div className="mb-2">
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-gray-500">Readiness</span>
              <span className="font-medium">{course.readiness}%</span>
            </div>
            <ProgressBar 
              value={course.readiness} 
              size="sm"
              color={course.readiness >= 100 ? 'success' : course.readiness >= 50 ? 'warning' : 'danger'}
            />
          </div>
        )}
        
        {/* Actions */}
        <div className="flex items-center gap-2">
          {onEdit && (
            <Button variant="secondary" size="sm" onClick={onEdit}>
              Edit
            </Button>
          )}
          {onAnalytics && course.isPublished && (
            <Button variant="ghost" size="sm" onClick={onAnalytics}>
              <Icon icon={TrendingUp} size="sm" className="mr-1" />
              Analytics
            </Button>
          )}
          {onPreview && (
            <Button variant="ghost" size="sm" onClick={onPreview}>
              <Icon icon={Eye} size="sm" className="mr-1" />
              Preview
            </Button>
          )}
        </div>
      </div>
    </div>
  </Card>
);

export const MentorDashboardTemplate: React.FC<MentorDashboardTemplateProps> = ({
  mentorName,
  user,
  navigationItems = [],
  stats = [],
  courses = [],
  recentActivity = [],
  onCreateCourse,
  onViewCourse,
  onEditCourse,
  onViewAnalytics,
  onPreviewCourse,
  logo,
  onLogoClick,
  onLogout,
  sidebarFooterContent,
  className,
  children,
}) => {
  // Default stats if none provided
  const defaultStats: MentorStat[] = stats.length > 0 ? stats : [
    { 
      label: 'Total Students', 
      value: courses.reduce((sum, c) => sum + c.studentCount, 0), 
      icon: Users 
    },
    { 
      label: 'Active Courses', 
      value: courses.filter(c => c.isPublished).length, 
      icon: BookOpen 
    },
    { 
      label: 'Avg Completion', 
      value: courses.length > 0 
        ? `${Math.round(courses.reduce((sum, c) => sum + c.completionRate, 0) / courses.length)}%`
        : '0%',
      icon: GraduationCap 
    },
    { 
      label: 'Avg Rating', 
      value: courses.filter(c => c.rating).length > 0
        ? courses.filter(c => c.rating).reduce((sum, c) => sum + (c.rating || 0), 0) / courses.filter(c => c.rating).length
        : '-',
      icon: Star 
    },
  ];

  return (
    <AppLayoutTemplate
      navigationItems={navigationItems}
      user={user}
      onLogout={onLogout}
      logo={logo}
      brandName="KFlow"
      onLogoClick={onLogoClick}
      sidebarFooterContent={sidebarFooterContent}
      className={className}
    >
      <div className="space-y-6">
        {/* Welcome Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <Typography variant="h3" className="mb-1">
              Welcome back{mentorName ? `, ${mentorName}` : ''}! 👋
            </Typography>
            <Typography variant="body" color="secondary">
              Here's what's happening with your courses today.
            </Typography>
          </div>
          {onCreateCourse && (
            <Button variant="primary" icon={Plus} onClick={onCreateCourse}>
              Create Course
            </Button>
          )}
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {defaultStats.map((stat, index) => (
            <StatCard
              key={index}
              label={stat.label}
              value={typeof stat.value === 'number' && stat.label.includes('Rating') 
                ? stat.value.toFixed(1) 
                : stat.value}
              icon={stat.icon}
              change={stat.change !== undefined 
                ? (stat.change > 0 ? `+${stat.change}` : `${stat.change}`) 
                : undefined}
              changeType={stat.changeType === 'increase' ? 'positive' : stat.changeType === 'decrease' ? 'negative' : undefined}
            />
          ))}
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Courses List - 2 columns */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between">
              <Typography variant="h5">Your Courses</Typography>
              {courses.length > 0 && (
                <Badge variant="default">{courses.length} total</Badge>
              )}
            </div>
            
            {courses.length > 0 ? (
              <div className="space-y-4">
                {courses.map((course) => (
                  <CourseCard
                    key={course.id}
                    course={course}
                    onView={onViewCourse ? () => onViewCourse(course.id) : undefined}
                    onEdit={onEditCourse ? () => onEditCourse(course.id) : undefined}
                    onAnalytics={onViewAnalytics ? () => onViewAnalytics(course.id) : undefined}
                    onPreview={onPreviewCourse ? () => onPreviewCourse(course.id) : undefined}
                  />
                ))}
              </div>
            ) : (
              <EmptyState
                title="No courses yet"
                description="Create your first course to start teaching"
                actionLabel="Create Course"
                onAction={onCreateCourse}
              />
            )}
          </div>

          {/* Activity Feed - 1 column */}
          <div>
            <Typography variant="h5" className="mb-4">Recent Activity</Typography>
            <Card>
              {recentActivity.length > 0 ? (
                <div className="space-y-4">
                  {recentActivity.slice(0, 10).map((activity) => {
                    const ActivityIcon = getActivityIcon(activity.type);
                    return (
                      <div key={activity.id} className="flex items-start gap-3">
                        <Avatar 
                          src={activity.studentAvatar} 
                          initials={activity.studentName.substring(0, 2)} 
                          size="sm" 
                        />
                        <div className="flex-1 min-w-0">
                          <Typography variant="small">
                            <span className="font-medium">{activity.studentName}</span>
                            {' '}
                            <span className="text-gray-500 dark:text-gray-400">
                              {getActivityMessage(activity)}
                            </span>
                          </Typography>
                          <Typography variant="small" color="muted">
                            {formatRelativeTime(activity.timestamp)}
                          </Typography>
                        </div>
                        <Icon 
                          icon={ActivityIcon} 
                          size="sm" 
                          className={cn(
                            activity.type === 'enrollment' && 'text-indigo-500',
                            activity.type === 'completion' && 'text-green-500',
                            activity.type === 'rating' && 'text-yellow-500',
                            activity.type === 'comment' && 'text-blue-500'
                          )}
                        />
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-6">
                  <Icon icon={Clock} size="lg" className="mx-auto text-gray-300 dark:text-gray-600 mb-2" />
                  <Typography variant="small" color="secondary">
                    No recent activity
                  </Typography>
                </div>
              )}
            </Card>
          </div>
        </div>

        {/* Additional content */}
        {children}
      </div>
    </AppLayoutTemplate>
  );
};

MentorDashboardTemplate.displayName = 'MentorDashboardTemplate';
