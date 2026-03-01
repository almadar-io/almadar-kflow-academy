/**
 * CourseDetailPage Library Component
 * 
 * Course detail page component using CourseDetailTemplate.
 * Receives data as props - containers handle data fetching and state management.
 */

import React from 'react';
import { CourseDetailTemplate, type CourseInstructor } from '../templates/CourseDetailTemplate';
import { Spinner } from '../atoms/Spinner';
import { Typography } from '../atoms/Typography';
import type { BreadcrumbItem } from '../molecules/Breadcrumb';
import type { Module } from '../organisms/CourseSidebar';
import type { LucideIcon } from 'lucide-react';

export interface CourseDetailPageProps {
  /**
   * Course ID
   */
  courseId: string;
  
  /**
   * Course data
   */
  course?: {
    id: string;
    title: string;
    description: string;
    image?: string;
    duration?: string;
    studentCount?: number;
    rating?: number;
    isPublic?: boolean;
  } | null;
  
  /**
   * Progress data
   */
  progress?: {
    value: number;
    totalLessons: number;
    completedLessons: number;
    currentLessonId?: string;
  };
  
  /**
   * Course modules
   */
  modules?: Module[];
  
  /**
   * Instructor information
   */
  instructor?: CourseInstructor;
  
  /**
   * Is enrolled
   */
  isEnrolled?: boolean;
  
  /**
   * Loading state
   */
  loading?: boolean;
  
  /**
   * Error state
   */
  error?: string | null;
  
  /**
   * Show back button
   */
  showBackButton?: boolean;
  
  /**
   * Back path
   */
  backPath?: string;
  
  /**
   * Back label
   */
  backLabel?: string;
  
  /**
   * Private link (if accessed via private link)
   */
  privateLink?: string;
  
  /**
   * Callbacks
   */
  onLessonClick?: (lessonId: string) => void;
  onEnroll?: () => void;
  onContinue?: () => void;
  onStartCourse?: () => void;
  onBack?: () => void;
  
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
  
  /**
   * Additional content
   */
  overviewContent?: React.ReactNode;
  discussionContent?: React.ReactNode;
}

export const CourseDetailPage: React.FC<CourseDetailPageProps> = ({
  courseId,
  course,
  progress,
  modules = [],
  instructor,
  isEnrolled = false,
  loading = false,
  error = null,
  showBackButton = true,
  backPath,
  backLabel = 'Back to Courses',
  privateLink,
  onLessonClick,
  onEnroll,
  onContinue,
  onStartCourse,
  onBack,
  user,
  navigationItems,
  logo,
  onLogoClick,
  overviewContent,
  discussionContent,
}) => {
  if (error || !course) {
    return (
      <CourseDetailTemplate
        id={courseId}
        title={error || 'Course not found'}
        description=""
        progress={0}
        totalLessons={0}
        completedLessons={0}
        modules={[]}
        user={user}
        logo={logo}
        onLogoClick={onLogoClick}
      />
    );
  }

  const breadcrumbs: BreadcrumbItem[] = [];
  if (showBackButton && backPath) {
    breadcrumbs.push({
      label: backLabel || 'Back',
      href: backPath,
      onClick: onBack,
    });
  }
  breadcrumbs.push({
    label: course.title,
    href: undefined,
  });

  const status: 'not-started' | 'in-progress' | 'completed' = 
    !isEnrolled ? 'not-started' :
    progress && progress.value === 100 ? 'completed' :
    'in-progress';

  return (
    <div className="relative">
      <CourseDetailTemplate
        id={course.id}
        title={course.title}
        description={course.description}
        image={course.image}
        progress={progress?.value || 0}
        totalLessons={progress?.totalLessons || 0}
        completedLessons={progress?.completedLessons || 0}
        duration={course.duration}
        studentCount={course.studentCount}
        rating={course.rating}
        status={status}
        modules={modules}
        currentLessonId={progress?.currentLessonId}
        instructor={instructor}
        breadcrumbs={breadcrumbs}
        onLessonClick={onLessonClick}
        onContinueClick={onContinue || onStartCourse}
        onEnrollClick={onEnroll}
        isEnrolled={isEnrolled}
        user={user}
        logo={logo}
        onLogoClick={onLogoClick}
        overviewContent={overviewContent}
        discussionContent={discussionContent}
        onBackToCourses={onBack}
      />
      {loading && (
        <div className="absolute inset-0 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="text-center">
            <Spinner size="lg" />
            <Typography variant="body" color="secondary" className="mt-4">
              Checking enrollment...
            </Typography>
          </div>
        </div>
      )}
    </div>
  );
};

CourseDetailPage.displayName = 'CourseDetailPage';
