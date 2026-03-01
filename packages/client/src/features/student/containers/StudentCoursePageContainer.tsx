import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useCourseEnrollment, useCoursePreview, useProgress } from '../hooks';
import { StudentCoursePage } from '../../../components/pages/StudentCoursePage';
import type { LessonPreview } from '../types';
import { useAuthContext } from '../../auth/AuthContext';
import { getNavigationItems, getUserForTemplate, mainNavItems } from '../../../config/navigation';
import { publicApi } from '../../public/publicApi';

/**
 * Container component for StudentCoursePage
 * Handles data fetching, state management, and business logic
 * Uses DashboardTemplate for layout (Option 1 - templates include Header/Sidebar)
 * 
 * Follows the container pattern documented in docs/KFLOW_V2_ARCHITECTURE_FRONTEND.md
 */
export const StudentCoursePageContainer: React.FC = () => {
  const { courseId, lessonId } = useParams<{ courseId: string; lessonId?: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, signOut } = useAuthContext();
  
  // Navigation configuration for template
  const navigationItems = getNavigationItems(location.pathname, mainNavItems).map(item => ({
    ...item,
    onClick: () => navigate(item.href),
  }));
  const templateUser = getUserForTemplate(user);
  
  // UI State
  const [selectedLessonId, setSelectedLessonId] = useState<string | null>(lessonId || null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  // Update selectedLessonId when lessonId param changes
  useEffect(() => {
    if (lessonId) {
      setSelectedLessonId(lessonId);
    }
  }, [lessonId]);

  // Data fetching hooks
  const {
    enrollment,
    enrollmentId,
    isEnrolled,
    isChecking,
    isEnrolling,
    checkEnrollment,
    enroll,
    unenroll,
  } = useCourseEnrollment({
    courseId: courseId || '',
  });

  const { 
    course, 
    modules, 
    lessons, 
    isLoading: isCourseLoading, 
    error: courseError 
  } = useCoursePreview(courseId || '');

  const {
    progress,
    isLoading: isProgressLoading,
    error: progressError,
    trackLessonCompletion,
    reload: reloadProgress,
  } = useProgress(enrollmentId || '');

  // Fetch lesson content when a lesson is selected
  const { data: lessonContentData } = useQuery({
    queryKey: ['lessonContent', courseId, selectedLessonId],
    queryFn: async () => {
      if (!courseId || !selectedLessonId) return null;
      try {
        return await publicApi.getLessonContent(courseId, selectedLessonId);
      } catch (error) {
        console.error('Failed to fetch lesson content:', error);
        return null;
      }
    },
    enabled: !!courseId && !!selectedLessonId && isEnrolled,
  });

  // Update lessons with content when lesson content is fetched
  const lessonsWithContent = lessons.map(lesson => {
    if (lesson.id === selectedLessonId && lessonContentData) {
      return {
        ...lesson,
        lessonContent: lessonContentData.content || lesson.lessonContent || '',
        flashCards: lessonContentData.flashCards?.map((fc: any) => ({
          front: fc.front,
          back: fc.back,
        })) || lesson.flashCards || [],
      };
    }
    return lesson;
  });

  // Keep sidebar open when no lesson is selected
  useEffect(() => {
    if (!selectedLessonId) {
      setIsSidebarOpen(true);
    }
  }, [selectedLessonId]);

  // Auto-select next lesson from progress on load
  useEffect(() => {
    if (isEnrolled && progress && lessons.length > 0 && !selectedLessonId) {
      let lessonToSelect: string | null = null;
      
      // First, check if currentLesson exists and is not completed
      if (progress.currentLesson?.id) {
        const currentLessonExists = lessons.find(l => l.id === progress.currentLesson.id);
        const isCurrentLessonCompleted = 
          progress.enrollment?.progress?.completedConcepts?.includes(progress.currentLesson.id) ||
          progress.enrollment?.completedLessonIds?.includes(progress.currentLesson.id);
        
        if (currentLessonExists && !isCurrentLessonCompleted) {
          lessonToSelect = progress.currentLesson.id;
        }
      }
      
      // If current lesson is completed (or doesn't exist), use nextLesson
      if (!lessonToSelect && progress.nextLesson?.id) {
        const nextLessonExists = lessons.find(l => l.id === progress.nextLesson.id);
        if (nextLessonExists) {
          lessonToSelect = progress.nextLesson.id;
        }
      }
      
      // If no current or next lesson, check accessible lessons
      if (!lessonToSelect && progress.enrollment?.accessibleLessonIds?.length > 0) {
        const completedConcepts = progress.enrollment?.progress?.completedConcepts || [];
        const completedLessonIds = progress.enrollment?.completedLessonIds || [];
        const allCompleted = new Set([...completedConcepts, ...completedLessonIds]);
        
        const firstAccessible = lessons.find(l => 
          progress.enrollment.accessibleLessonIds.includes(l.id) &&
          !allCompleted.has(l.id)
        );
        if (firstAccessible) {
          lessonToSelect = firstAccessible.id;
        }
      }
      
      // Fallback to first lesson
      if (!lessonToSelect && lessons.length > 0) {
        lessonToSelect = lessons[0].id;
      }
      
      if (lessonToSelect) {
        setSelectedLessonId(lessonToSelect);
        // Close sidebar on mobile after auto-selecting lesson from progress
        if (window.innerWidth < 1024) {
          setIsSidebarOpen(false);
        }
      }
    }
  }, [isEnrolled, progress, lessons, selectedLessonId]);

  // Event handlers
  const handleEnroll = async () => {
    try {
      await enroll();
      await checkEnrollment();
    } catch (error: any) {
      throw error;
    }
  };

  const handleUnenroll = async () => {
    try {
      await unenroll();
    } catch (error: any) {
      throw error;
    }
  };

  const handleLessonSelect = (lessonId: string) => {
    setSelectedLessonId(lessonId);
    // Close sidebar on mobile after selection
    if (window.innerWidth < 1024) {
      setIsSidebarOpen(false);
    }
  };

  const handleToggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  const handleNavigateBack = () => {
    navigate(-1);
  };

  const handleBackToCourses = () => {
    navigate('/my-courses');
  };

  const handleNavigateToLogin = (returnUrl: string) => {
    navigate(`/login?returnUrl=${encodeURIComponent(returnUrl)}`);
  };

  const handleLessonComplete = async (lessonId: string) => {
    if (!enrollmentId) {
      console.error('Cannot complete lesson: no enrollment ID');
      return;
    }
    
    try {
      // Track lesson completion via API
      await trackLessonCompletion(lessonId);
      
      // Reload progress to get updated completion status
      await reloadProgress();
      
      // Optionally navigate to next lesson if available
      const currentIndex = lessons.findIndex(l => l.id === lessonId);
      if (currentIndex >= 0 && currentIndex < lessons.length - 1) {
        const nextLesson = lessons[currentIndex + 1];
        // Auto-advance to next lesson after a short delay
        setTimeout(() => {
          handleLessonSelect(nextLesson.id);
        }, 1000);
      }
    } catch (error: any) {
      console.error('Failed to complete lesson:', error);
      // You might want to show an error toast here
      throw error;
    }
  };

  const handlePreviousLesson = () => {
    if (!selectedLessonId || lessons.length === 0) return;
    const currentIndex = lessons.findIndex(l => l.id === selectedLessonId);
    if (currentIndex > 0) {
      const previousLesson = lessons[currentIndex - 1];
      setSelectedLessonId(previousLesson.id);
      if (window.innerWidth < 1024) {
        setIsSidebarOpen(false);
      }
    }
  };

  const handleNextLesson = () => {
    if (!selectedLessonId || lessons.length === 0) return;
    const currentIndex = lessons.findIndex(l => l.id === selectedLessonId);
    if (currentIndex >= 0 && currentIndex < lessons.length - 1) {
      const nextLesson = lessons[currentIndex + 1];
      setSelectedLessonId(nextLesson.id);
      if (window.innerWidth < 1024) {
        setIsSidebarOpen(false);
      }
    }
  };

  // Logout handler
  const handleLogout = useCallback(async () => {
    await signOut();
  }, [signOut]);

  return (
    <StudentCoursePage
      // Course data
      courseId={courseId}
      course={course}
      modules={modules}
      lessons={lessonsWithContent}
      isCourseLoading={isCourseLoading}
      courseError={courseError}
      // Enrollment state
      enrollment={enrollment}
      enrollmentId={enrollmentId}
      isEnrolled={isEnrolled}
      isChecking={isChecking}
      isEnrolling={isEnrolling}
      // Progress
      progress={progress}
      isProgressLoading={isProgressLoading}
      progressError={progressError}
      // UI state
      selectedLessonId={selectedLessonId}
      isSidebarOpen={isSidebarOpen}
      // Event handlers
      onEnroll={handleEnroll}
      onUnenroll={handleUnenroll}
      onLessonSelect={handleLessonSelect}
      onToggleSidebar={handleToggleSidebar}
      onNavigateBack={handleNavigateBack}
      onLessonChange={setSelectedLessonId}
      onNavigateToLogin={handleNavigateToLogin}
      onLessonComplete={handleLessonComplete}
      onPreviousLesson={handlePreviousLesson}
      onNextLesson={handleNextLesson}
      onBackToCourses={handleBackToCourses}
      // Template props
      user={templateUser}
      navigationItems={navigationItems}
      onLogoClick={() => navigate('/home')}
      onLogout={handleLogout}
    />
  );
};

export default StudentCoursePageContainer;
