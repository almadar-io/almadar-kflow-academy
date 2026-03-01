/**
 * CourseAnalyticsPage Component
 * 
 * Page component for displaying course analytics.
 * Uses CourseAnalyticsTemplate for layout.
 * Receives all data as props from container.
 */

import React from 'react';
import type { LucideIcon } from 'lucide-react';
import { CourseAnalyticsTemplate } from '../templates/CourseAnalyticsTemplate';
import type {
  LessonAnalytics,
  StudentAnalyticsData,
  LanguageUsageData,
} from '../templates/CourseAnalyticsTemplate';
import { Spinner } from '../atoms/Spinner';
import { Alert } from '../molecules/Alert';
import { EmptyState } from '../molecules/EmptyState';
import { BarChart3 } from 'lucide-react';

// Re-export types for container use
export type { LessonAnalytics, StudentAnalyticsData, LanguageUsageData };

export interface CourseAnalyticsPageProps {
  /**
   * Course ID
   */
  courseId?: string;

  /**
   * Graph ID (knowledge graph)
   */
  graphId?: string;

  /**
   * Course title
   */
  courseTitle: string;

  /**
   * Loading state
   */
  isLoading?: boolean;

  /**
   * Error message
   */
  error?: string | null;

  /**
   * Is refreshing data
   */
  isRefreshing?: boolean;

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

  // Analytics data
  totalEnrollments: number;
  enrollmentChange?: number;
  activeStudents: number;
  activeChange?: number;
  completionRate: number;
  completionChange?: number;
  averageRating?: number;
  ratingCount?: number;
  avgCompletionTime?: number;
  totalLessonsCompleted?: number;
  atRiskStudents?: number;
  lessonAnalytics?: LessonAnalytics[];
  studentAnalytics?: StudentAnalyticsData[];
  languageUsage?: LanguageUsageData[];

  // Time range
  timeRangeOptions?: Array<{ value: string; label: string }>;
  timeRange?: string;
  onTimeRangeChange?: (value: string) => void;

  // Callbacks
  onExport?: (format: 'csv' | 'pdf') => void;
  onRefresh?: () => void;
  onBack?: () => void;
  onViewStudent?: (studentId: string) => void;
  onMessageStudent?: (studentId: string) => void;
  onViewLesson?: (lessonId: string) => void;
  onLogoClick?: () => void;
  onLogout?: () => void;

  /**
   * Additional CSS classes
   */
  className?: string;
}

export const CourseAnalyticsPage: React.FC<CourseAnalyticsPageProps> = ({
  courseId,
  graphId,
  courseTitle,
  isLoading = false,
  error,
  isRefreshing = false,
  user,
  navigationItems,
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
  atRiskStudents,
  lessonAnalytics,
  studentAnalytics,
  languageUsage,
  timeRangeOptions,
  timeRange,
  onTimeRangeChange,
  onExport,
  onRefresh,
  onBack,
  onViewStudent,
  onMessageStudent,
  onViewLesson,
  onLogoClick,
  onLogout,
  className,
}) => {
  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <Spinner size="lg" />
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading analytics...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900 p-4">
        <Alert
          variant="error"
          title="Failed to load analytics"
        >
          {error}
        </Alert>
      </div>
    );
  }

  // No course selected
  if (!courseId && !graphId) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900 p-4">
        <EmptyState
          icon={BarChart3}
          title="No Course Selected"
          description="Please select a course to view its analytics."
          actionLabel="Go Back"
          onAction={onBack}
        />
      </div>
    );
  }

  return (
    <CourseAnalyticsTemplate
      courseId={courseId || graphId || ''}
      courseTitle={courseTitle}
      user={user}
      navigationItems={navigationItems}
      totalEnrollments={totalEnrollments}
      enrollmentChange={enrollmentChange}
      activeStudents={activeStudents}
      activeChange={activeChange}
      completionRate={completionRate}
      completionChange={completionChange}
      averageRating={averageRating}
      ratingCount={ratingCount}
      avgCompletionTime={avgCompletionTime}
      totalLessonsCompleted={totalLessonsCompleted}
      atRiskStudents={atRiskStudents}
      lessonAnalytics={lessonAnalytics}
      studentAnalytics={studentAnalytics}
      languageUsage={languageUsage}
      timeRangeOptions={timeRangeOptions}
      timeRange={timeRange}
      onTimeRangeChange={onTimeRangeChange}
      onExport={onExport}
      onRefresh={onRefresh}
      isRefreshing={isRefreshing}
      onBack={onBack}
      onViewStudent={onViewStudent}
      onMessageStudent={onMessageStudent}
      onViewLesson={onViewLesson}
      onLogoClick={onLogoClick}
      onLogout={onLogout}
      className={className}
    />
  );
};

CourseAnalyticsPage.displayName = 'CourseAnalyticsPage';

export default CourseAnalyticsPage;
