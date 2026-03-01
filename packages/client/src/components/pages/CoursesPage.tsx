/**
 * CoursesPage Library Component
 * 
 * Courses list page component using CourseListTemplate.
 * Receives data as props - containers handle data fetching and state management.
 */

import React from 'react';
import { CourseListTemplate } from '../templates/CourseListTemplate';
import type { CourseCardProps } from '../organisms/CourseCard';
import type { LucideIcon } from 'lucide-react';

export interface CoursesPageProps {
  /**
   * Enrolled courses
   */
  enrolledCourses?: CourseCardProps[];
  
  /**
   * Available/public courses
   */
  availableCourses?: CourseCardProps[];
  
  /**
   * Loading states
   */
  isLoadingEnrolled?: boolean;
  isLoadingAvailable?: boolean;
  
  /**
   * Error state
   */
  error?: string | null;
  
  /**
   * Callbacks
   */
  onCourseClick?: (courseId: string) => void;
  onEnrollClick?: (courseId: string) => void;
  
  /**
   * Template props
   */
  user?: { name: string; email?: string; avatar?: string };
  navigationItems?: Array<{
    id: string;
    label: string;
    icon?: LucideIcon;
    href?: string;
    onClick?: () => void;
    badge?: string | number;
    active?: boolean;
  }>;
  logo?: React.ReactNode;
  onLogoClick?: () => void;
}

export const CoursesPage: React.FC<CoursesPageProps> = ({
  enrolledCourses = [],
  availableCourses = [],
  isLoadingEnrolled = false,
  isLoadingAvailable = false,
  error = null,
  onCourseClick,
  onEnrollClick,
  user,
  navigationItems,
  logo,
  onLogoClick,
}) => {
  // Combine enrolled and available courses for display
  // The template will handle grouping if needed
  const allCourses: CourseCardProps[] = [
    ...enrolledCourses.map(course => ({
      ...course,
      onClick: () => onCourseClick?.(course.id),
    })),
    ...availableCourses.map(course => ({
      ...course,
      onClick: () => onEnrollClick?.(course.id),
    })),
  ];

  const loading = isLoadingEnrolled || isLoadingAvailable;

  return (
    <CourseListTemplate
      title="Courses"
      subtitle="Browse and enroll in courses created by mentors"
      courses={allCourses}
      loading={loading}
      user={user}
      navigationItems={navigationItems}
      logo={logo}
      onLogoClick={onLogoClick}
      showCreateButton={false}
    />
  );
};

CoursesPage.displayName = 'CoursesPage';
