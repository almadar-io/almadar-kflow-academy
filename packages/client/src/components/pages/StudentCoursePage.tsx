/**
 * StudentCoursePage Library Component
 * 
 * Student course page component for viewing and taking courses.
 * Handles both preview mode (not enrolled) and course player mode (enrolled).
 * Uses LessonViewTemplate when enrolled and lesson is selected.
 * 
 * Receives data as props - containers handle data fetching and state management.
 */

import React from 'react';
import { LessonViewTemplate } from '../templates/LessonViewTemplate';
import { CourseDetailTemplate } from '../templates/CourseDetailTemplate';
import { Spinner } from '../atoms/Spinner';
import { Alert } from '../molecules/Alert';
import { Button } from '../atoms/Button';
import { Typography } from '../atoms/Typography';
import { EnrollButton } from '../../features/student/components';
import { CourseSidebar } from '../organisms/CourseSidebar';
import type { CoursePreview as CoursePreviewType, PublishedModule } from '../../features/student/hooks/useCoursePreview';
import type { LessonPreview } from '../../features/student/types';
import type { LucideIcon } from 'lucide-react';
import type { Module } from '../organisms/CourseSidebar';
import type { BreadcrumbItem } from '../molecules/Breadcrumb';

// Re-export for backward compatibility
type PublishedCourse = CoursePreviewType;

export interface StudentCoursePageProps {
  /**
   * Course ID
   */
  courseId?: string;
  
  /**
   * Course data
   */
  course?: PublishedCourse | null;
  
  /**
   * Course modules
   */
  modules?: PublishedModule[];
  
  /**
   * Course lessons
   */
  lessons?: LessonPreview[];
  
  /**
   * Is course loading
   */
  isCourseLoading?: boolean;
  
  /**
   * Course error
   */
  courseError?: string | null;
  
  /**
   * Enrollment state
   */
  enrollment?: any;
  enrollmentId?: string | null;
  isEnrolled?: boolean;
  isChecking?: boolean;
  isEnrolling?: boolean;
  
  /**
   * Progress data
   */
  progress?: any;
  isProgressLoading?: boolean;
  progressError?: string | null;
  
  /**
   * Selected lesson ID
   */
  selectedLessonId?: string | null;
  
  /**
   * Is sidebar open
   */
  isSidebarOpen?: boolean;
  
  /**
   * Callbacks
   */
  onEnroll?: () => Promise<void>;
  onUnenroll?: () => Promise<void>;
  onLessonSelect?: (lessonId: string) => void;
  onToggleSidebar?: () => void;
  onNavigateBack?: () => void;
  onLessonChange?: (lessonId: string | null) => void;
  onNavigateToLogin?: (returnUrl: string) => void;
  onLessonComplete?: (lessonId: string) => Promise<void>;
  onPreviousLesson?: () => void;
  onNextLesson?: () => void;
  onBackToCourses?: () => void;
  
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
  onLogout?: () => void;
}

export const StudentCoursePage: React.FC<StudentCoursePageProps> = ({
  courseId,
  course,
  modules = [],
  lessons = [],
  isCourseLoading = false,
  courseError = null,
  enrollment,
  enrollmentId,
  isEnrolled = false,
  isChecking = false,
  isEnrolling = false,
  progress,
  isProgressLoading = false,
  progressError = null,
  selectedLessonId,
  isSidebarOpen = true,
  onEnroll,
  onUnenroll,
  onLessonSelect,
  onToggleSidebar,
  onNavigateBack,
  onLessonChange,
  onNavigateToLogin,
  onLessonComplete,
  onPreviousLesson,
  onNextLesson,
  onBackToCourses,
  user,
  navigationItems,
  logo,
  onLogoClick,
  onLogout,
}) => {
  // Loading state - show loader while course is loading (before we have course data)
  if (isCourseLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <Spinner size="lg" />
          <Typography variant="body" color="secondary" className="mt-4">
            Loading course...
          </Typography>
        </div>
      </div>
    );
  }

  // Error state
  if (!course && courseId) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <Alert variant="error" className="mb-4">
            Course not found
          </Alert>
          {onNavigateBack && (
            <Button variant="ghost" onClick={onNavigateBack}>
              Go back
            </Button>
          )}
        </div>
      </div>
    );
  }

  // Transform modules to CourseDetailTemplate format
  // Check both old and new enrollment systems for completed lessons
  const completedConcepts = progress?.enrollment?.progress?.completedConcepts || [];
  const completedLessonIds = progress?.enrollment?.completedLessonIds || [];
  const allCompletedLessonIds = new Set([...completedConcepts, ...completedLessonIds]);
  const accessibleLessonIds = progress?.enrollment?.accessibleLessonIds || [];
  
  const templateModules: Module[] = modules.map((module) => ({
    id: module.id,
    title: module.title || module.name || 'Module',
    lessons: lessons
      .filter(lesson => lesson.moduleId === module.id)
      .map((lesson) => {
        // Determine lesson status
        const isCompleted = allCompletedLessonIds.has(lesson.id);
        const isCurrent = lesson.id === selectedLessonId;
        const isAccessible = accessibleLessonIds.includes(lesson.id) || isCompleted || isCurrent;
        
        let status: 'completed' | 'current' | 'upcoming' | 'locked';
        if (isCompleted) {
          status = 'completed';
        } else if (isCurrent) {
          status = 'current';
        } else if (isAccessible) {
          status = 'upcoming';
        } else {
          status = 'locked';
        }
        
        return {
          id: lesson.id,
          title: lesson.title,
          status,
          duration: undefined,
        };
      }),
    expanded: false,
  }));

  // Build breadcrumbs
  const breadcrumbs: BreadcrumbItem[] = [
    { label: 'My Courses', href: '/my-courses', onClick: onBackToCourses },
    { label: course?.title || 'Course', href: `/course/${courseId}` },
  ];

  // Not enrolled - use CourseDetailTemplate
  if (!isEnrolled) {
    const status: 'not-started' | 'in-progress' | 'completed' = 'not-started';
    
    return (
      <div className="relative">
        <CourseDetailTemplate
          id={courseId || ''}
          title={course?.title || 'Course'}
          description={course?.description || ''}
          progress={0}
          totalLessons={lessons.length}
          completedLessons={0}
          status={status}
          modules={templateModules}
          breadcrumbs={breadcrumbs}
          onEnrollClick={onEnroll}
          isEnrolled={false}
          user={user}
          logo={logo}
          onLogoClick={onLogoClick}
          onBackToCourses={onBackToCourses}
        />
        {isChecking && (
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
  }

  // Enrolled - Course Player Layout
  const selectedLesson = selectedLessonId ? lessons.find(l => l.id === selectedLessonId) : null;
  const selectedLessonIndex = selectedLessonId ? lessons.findIndex(l => l.id === selectedLessonId) : -1;

  // Calculate course progress
  const courseProgress = progress?.progressPercentage || 0;

  // Calculate navigation
  const hasPreviousLesson = selectedLessonIndex > 0;
  const hasNextLesson = selectedLessonIndex >= 0 && selectedLessonIndex < lessons.length - 1;

  // Build breadcrumbs for lesson view
  const lessonBreadcrumbs: BreadcrumbItem[] = [
    { label: 'My Courses', href: '/my-courses', onClick: onBackToCourses },
    { label: course?.title || 'Course', href: `/course/${courseId}` },
    ...(selectedLesson ? [{ label: selectedLesson.title }] : []),
  ];

  // Transform flashcards to template format
  // FlashCard type has front/back, template expects question/answer
  const flashcards = selectedLesson?.flashCards?.map((card, index) => {
    const flashcardId = `flashcard-${selectedLesson.id}-${index}`;
    return {
      id: flashcardId,
      question: card.front,
      answer: card.back,
    };
  }) || [];

  // If lesson is selected, use LessonViewTemplate
  if (selectedLesson && selectedLessonId) {
    return (
      <div className="relative">
        <LessonViewTemplate
          id={selectedLesson.id}
          title={selectedLesson.title}
          content={selectedLesson.lessonContent || ''}
          courseTitle={course?.title || 'Course'}
          courseProgress={courseProgress}
          modules={templateModules}
          currentLessonId={selectedLessonId}
          flashcards={flashcards}
          breadcrumbs={lessonBreadcrumbs}
          hasPreviousLesson={hasPreviousLesson}
          hasNextLesson={hasNextLesson}
          onPreviousLesson={onPreviousLesson}
          onNextLesson={onNextLesson}
          onComplete={onLessonComplete ? () => onLessonComplete(selectedLessonId) : undefined}
          isCompleted={
            (progress?.enrollment?.progress?.completedConcepts?.includes(selectedLessonId)) ||
            (progress?.enrollment?.completedLessonIds?.includes(selectedLessonId)) ||
            false
          }
          onLessonClick={onLessonSelect}
          user={user}
          logo={logo}
          onLogoClick={onLogoClick}
          onLogout={onLogout}
          onBackToCourses={onBackToCourses}
        />
        {isChecking && (
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
  }

  // Enrolled but no lesson selected - use CourseDetailTemplate
  const status: 'not-started' | 'in-progress' | 'completed' = 
    progress && progress.progressPercentage === 100 ? 'completed' : 'in-progress';
  
  return (
    <div className="relative">
      <CourseDetailTemplate
        id={courseId || ''}
        title={course?.title || 'Course'}
        description={course?.description || ''}
        progress={courseProgress}
        totalLessons={progress?.totalLessons || lessons.length}
        completedLessons={progress?.completedLessons || 0}
        status={status}
        modules={templateModules}
        currentLessonId={progress?.currentLessonId}
        breadcrumbs={breadcrumbs}
        onLessonClick={onLessonSelect}
        onContinueClick={onNextLesson}
        isEnrolled={true}
        user={user}
        logo={logo}
        onLogoClick={onLogoClick}
        onBackToCourses={onBackToCourses}
      />
      {isChecking && (
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

StudentCoursePage.displayName = 'StudentCoursePage';
