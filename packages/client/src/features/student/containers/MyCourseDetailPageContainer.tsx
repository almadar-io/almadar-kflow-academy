/**
 * Container component for MyCourseDetailPage
 * Handles data fetching, state management, and passes data to library CourseDetailPage
 */

import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useSearchParams, useNavigate, useLocation } from 'react-router';
import { useAuthContext } from '../../auth/AuthContext';
import { CourseDetailPage } from '../../../components/pages/CourseDetailPage';
import { getNavigationItems, getUserForTemplate, mainNavItems } from '../../../config/navigation';
import { publicApi } from '../../public/publicApi';
import { useCourseEnrollment } from '../hooks';
import { useCoursePreview } from '../hooks/useCoursePreview';
import type { Module } from '../../../components/organisms/CourseSidebar';
import type { CourseInstructor } from '../../../components/templates/CourseDetailTemplate';

const MyCourseDetailPageContainer: React.FC = () => {
  const { courseId } = useParams<{ courseId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuthContext();
  const [course, setCourse] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const privateLink = searchParams.get('link');

  // Navigation configuration
  const navigationItems = getNavigationItems(location.pathname, mainNavItems).map(item => ({
    ...item,
    onClick: () => navigate(item.href),
  }));
  const templateUser = getUserForTemplate(user);

  // Load course
  useEffect(() => {
    if (courseId || privateLink) {
      loadCourse();
    }
  }, [courseId, privateLink]);

  const loadCourse = async () => {
    setIsLoading(true);
    setError(null);
    try {
      let result;
      if (privateLink) {
        result = await publicApi.getCourseByLink(privateLink);
      } else if (courseId) {
        result = await publicApi.getPublicCourse(courseId);
      } else {
        setError('Course ID or private link is required');
        setIsLoading(false);
        return;
      }

      if (result.course) {
        setCourse(result.course);
      } else {
        setError('Course not found');
      }
    } catch (error: any) {
      console.error('Failed to load course:', error);
      setError(error.message || 'Failed to load course');
    } finally {
      setIsLoading(false);
    }
  };

  // Get effective course ID
  const effectiveCourseId = course?.id || courseId || '';

  // Enrollment hooks
  const {
    enrollment,
    enrollmentId,
    isEnrolled,
    isChecking,
    isEnrolling,
    enroll,
  } = useCourseEnrollment({
    courseId: effectiveCourseId,
  });

  // Course preview hooks
  const { course: previewCourse, modules: previewModules, lessons: previewLessons, isLoading: isPreviewLoading } = useCoursePreview(effectiveCourseId, {
    enabled: !!effectiveCourseId,
  });

  // Transform modules to template format
  const modules: Module[] = useMemo(() => {
    if (!previewModules || previewModules.length === 0) return [];

    // Group lessons by moduleId
    const lessonsByModuleId = (previewLessons || []).reduce((acc: Record<string, any[]>, lesson: any) => {
      if (lesson.moduleId) {
        if (!acc[lesson.moduleId]) {
          acc[lesson.moduleId] = [];
        }
        acc[lesson.moduleId].push(lesson);
      }
      return acc;
    }, {});

    return previewModules.map((module: any) => {
      const moduleLessons = lessonsByModuleId[module.id] || [];
      return {
        id: module.id,
        title: module.title || module.name,
        lessons: moduleLessons.map((lesson: any) => ({
          id: lesson.id,
          title: lesson.title || lesson.name,
          status: lesson.completed ? 'completed' : lesson.id === previewLessons[0]?.id ? 'current' : 'upcoming',
          duration: lesson.duration,
          onClick: () => {
            // Navigate to lesson view (works for both enrolled and preview)
            navigate(`/course/${effectiveCourseId}/lesson/${lesson.id}`);
          },
        })),
      };
    });
  }, [previewModules, previewLessons, isEnrolled, effectiveCourseId, navigate]);

  // Calculate progress
  const progress = useMemo(() => {
    if (!isEnrolled || !enrollment) return undefined;

    // Calculate from lessons if available
    const totalLessons = previewLessons?.length || 0;
    const completedLessons = previewLessons?.filter((l: any) => l.completed).length || 0;
    const progressValue = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;

    return {
      value: progressValue,
      totalLessons,
      completedLessons,
      currentLessonId: previewLessons?.find((l: any) => !l.completed)?.id,
    };
  }, [isEnrolled, enrollment, previewLessons]);

  const handleEnroll = async () => {
    try {
      await enroll();
      // Navigate to enrolled course page
      navigate(`/course/${effectiveCourseId}`);
    } catch (error: any) {
      console.error('Failed to enroll:', error);
    }
  };

  const handleContinue = () => {
    if (progress?.currentLessonId) {
      navigate(`/course/${effectiveCourseId}/lesson/${progress.currentLessonId}`);
    } else if (previewLessons && previewLessons.length > 0) {
      // If not enrolled or no progress, start with first lesson
      navigate(`/course/${effectiveCourseId}/lesson/${previewLessons[0].id}`);
    } else {
      // Fallback to course page without lesson
      navigate(`/course/${effectiveCourseId}`);
    }
  };

  const handleStartCourse = () => {
    // Navigate to course page, which will auto-select first lesson
    if (previewLessons && previewLessons.length > 0) {
      navigate(`/course/${effectiveCourseId}/lesson/${previewLessons[0].id}`);
    } else {
      navigate(`/course/${effectiveCourseId}`);
    }
  };

  const displayCourse = course || previewCourse;

  return (
    <CourseDetailPage
      courseId={effectiveCourseId}
      course={displayCourse ? {
        id: displayCourse.id,
        title: displayCourse.title || displayCourse.seedConceptName || 'Untitled Course',
        description: displayCourse.description || '',
        duration: displayCourse.estimatedDuration ? `${Math.round(displayCourse.estimatedDuration / 60)} hours` : undefined,
        isPublic: displayCourse.isPublic,
      } : undefined}
      progress={progress}
      modules={modules}
      isEnrolled={isEnrolled}
      loading={isLoading || isPreviewLoading || isChecking}
      error={error}
      showBackButton={true}
      backPath="/my-courses"
      backLabel="Back to My Courses"
      privateLink={privateLink || undefined}
      onEnroll={handleEnroll}
      onContinue={handleContinue}
      onStartCourse={handleStartCourse}
      onLessonClick={(lessonId) => {
        navigate(`/course/${effectiveCourseId}/lesson/${lessonId}`);
      }}
      onBack={() => navigate('/my-courses')}
      user={templateUser}
      navigationItems={navigationItems}
      onLogoClick={() => navigate('/home')}
    />
  );
};

MyCourseDetailPageContainer.displayName = 'MyCourseDetailPageContainer';

export default MyCourseDetailPageContainer;
export { MyCourseDetailPageContainer };
