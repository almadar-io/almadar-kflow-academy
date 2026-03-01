/**
 * CourseAnalyticsPageContainer
 * 
 * Container component for CourseAnalyticsPage.
 * Handles data fetching using React Query hooks and passes data to page component.
 * 
 * Follows the container pattern documented in docs/KFLOW_V2_ARCHITECTURE_FRONTEND.md
 */

import React, { useState, useCallback, useMemo } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { CourseAnalyticsPage } from '../../../components/pages/CourseAnalyticsPage';
import type {
  LessonAnalytics,
  StudentAnalyticsData,
  LanguageUsageData,
} from '../../../components/pages/CourseAnalyticsPage';
import {
  useCourseAnalytics,
  useLanguageAnalytics,
  type CourseAnalytics,
} from '../hooks/useCourseAnalytics';
import { analyticsKeys } from '../../knowledge-graph/hooks/queryKeys';
import { useAuthContext } from '../../auth/AuthContext';
import { getNavigationItems, getUserForTemplate, mainNavItems } from '../../../config/navigation';

// Default time range options
const TIME_RANGE_OPTIONS = [
  { value: '7d', label: 'Last 7 days' },
  { value: '30d', label: 'Last 30 days' },
  { value: '90d', label: 'Last 90 days' },
  { value: 'all', label: 'All time' },
];

/**
 * Transform course analytics data to page format
 */
const transformCourseAnalytics = (
  analytics: CourseAnalytics | undefined
): {
  totalEnrollments: number;
  activeStudents: number;
  completionRate: number;
  averageRating?: number;
  atRiskStudents: number;
  totalLessonsCompleted: number;
} => {
  if (!analytics) {
    return {
      totalEnrollments: 0,
      activeStudents: 0,
      completionRate: 0,
      atRiskStudents: 0,
      totalLessonsCompleted: 0,
    };
  }

  return {
    totalEnrollments: analytics.totalEnrollments,
    activeStudents: analytics.activeStudents,
    completionRate: analytics.averageCompletionRate,
    averageRating: analytics.averageRating,
    atRiskStudents: analytics.atRiskStudents,
    totalLessonsCompleted: analytics.completedStudents * 10, // Estimate
  };
};

/**
 * Transform progress distribution to student analytics format
 */
const transformToStudentAnalytics = (
  analytics: CourseAnalytics | undefined
): StudentAnalyticsData[] => {
  // In a real implementation, this would come from a separate query
  // For now, return empty array - the template handles empty state
  if (!analytics) return [];
  
  // Placeholder - would be populated from actual student data
  return [];
};

/**
 * Transform language analytics to page format
 */
const transformLanguageAnalytics = (
  languageData: ReturnType<typeof useLanguageAnalytics>['data']
): LanguageUsageData[] => {
  if (!languageData?.languageUsage) return [];

  return languageData.languageUsage.map(lang => ({
    language: lang.language,
    name: lang.languageName,
    studentCount: lang.userCount,
    percentage: lang.percentage,
  }));
};

export const CourseAnalyticsPageContainer: React.FC = () => {
  const { graphId } = useParams<{ graphId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const { user, signOut } = useAuthContext();

  // UI State
  const [timeRange, setTimeRange] = useState<string>('30d');
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Navigation configuration
  const navigationItems = getNavigationItems(location.pathname, mainNavItems).map(item => ({
    ...item,
    onClick: () => navigate(item.href),
  }));
  const templateUser = getUserForTemplate(user);

  // Data fetching hooks
  const {
    data: courseAnalytics,
    isLoading: isLoadingCourse,
    error: courseError,
  } = useCourseAnalytics(graphId, { period: timeRange as '7d' | '30d' | '90d' | 'all' });

  const {
    data: languageAnalytics,
    isLoading: isLoadingLanguage,
  } = useLanguageAnalytics(graphId);

  // Transform data for page component
  const analyticsData = useMemo(() => 
    transformCourseAnalytics(courseAnalytics),
    [courseAnalytics]
  );

  const studentData = useMemo(() => 
    transformToStudentAnalytics(courseAnalytics),
    [courseAnalytics]
  );

  const languageData = useMemo(() => 
    transformLanguageAnalytics(languageAnalytics),
    [languageAnalytics]
  );

  // Event handlers
  const handleTimeRangeChange = useCallback((value: string) => {
    setTimeRange(value);
  }, []);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await queryClient.invalidateQueries({
        queryKey: analyticsKeys.course(graphId!),
      });
      await queryClient.invalidateQueries({
        queryKey: analyticsKeys.language(graphId!),
      });
    } finally {
      setIsRefreshing(false);
    }
  }, [queryClient, graphId]);

  const handleExport = useCallback((format: 'csv' | 'pdf') => {
    // TODO: Implement export functionality
    console.log(`Exporting analytics as ${format}`);
  }, []);

  const handleBack = useCallback(() => {
    navigate(-1);
  }, [navigate]);

  const handleViewStudent = useCallback((studentId: string) => {
    // Navigate to student detail view
    navigate(`/mentor/${graphId}/students/${studentId}`);
  }, [navigate, graphId]);

  const handleMessageStudent = useCallback((studentId: string) => {
    // TODO: Open messaging modal
    console.log(`Message student ${studentId}`);
  }, []);

  const handleViewLesson = useCallback((lessonId: string) => {
    navigate(`/mentor/${graphId}/concept/${lessonId}`);
  }, [navigate, graphId]);

  const handleLogoClick = useCallback(() => {
    navigate('/home');
  }, [navigate]);

  const handleLogout = useCallback(async () => {
    await signOut();
  }, [signOut]);

  // Derive course title from URL or analytics
  const courseTitle = courseAnalytics?.courseTitle || 'Course Analytics';

  // Combined loading state
  const isLoading = isLoadingCourse || isLoadingLanguage;
  
  // Error handling
  const error = courseError?.message || null;

  return (
    <CourseAnalyticsPage
      graphId={graphId}
      courseTitle={courseTitle}
      isLoading={isLoading}
      error={error}
      isRefreshing={isRefreshing}
      user={templateUser}
      navigationItems={navigationItems}
      totalEnrollments={analyticsData.totalEnrollments}
      activeStudents={analyticsData.activeStudents}
      completionRate={analyticsData.completionRate}
      averageRating={analyticsData.averageRating}
      atRiskStudents={analyticsData.atRiskStudents}
      totalLessonsCompleted={analyticsData.totalLessonsCompleted}
      studentAnalytics={studentData}
      languageUsage={languageData}
      timeRangeOptions={TIME_RANGE_OPTIONS}
      timeRange={timeRange}
      onTimeRangeChange={handleTimeRangeChange}
      onExport={handleExport}
      onRefresh={handleRefresh}
      onBack={handleBack}
      onViewStudent={handleViewStudent}
      onMessageStudent={handleMessageStudent}
      onViewLesson={handleViewLesson}
      onLogoClick={handleLogoClick}
      onLogout={handleLogout}
    />
  );
};

CourseAnalyticsPageContainer.displayName = 'CourseAnalyticsPageContainer';

export default CourseAnalyticsPageContainer;
