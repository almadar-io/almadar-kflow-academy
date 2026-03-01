/**
 * Container component for CoursesPage
 * Handles data fetching, state management, and passes data to library CoursesPage
 */

import React, { useMemo, useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router';
import { useAuthContext } from '../../auth/AuthContext';
import { CoursesPage } from '../../../components/pages/CoursesPage';
import { getNavigationItems, getUserForTemplate, mainNavItems } from '../../../config/navigation';
import { useEnrolledCourses } from '../hooks/useEnrolledCourses';
import { publicApi } from '../../public/publicApi';
import type { CourseCardProps } from '../../../components/organisms/CourseCard';

const CoursesPageContainer: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuthContext();
  const { enrolledCourses, isLoading: isLoadingEnrolled } = useEnrolledCourses();
  const [publicCourses, setPublicCourses] = useState<any[]>([]);
  const [isLoadingPublic, setIsLoadingPublic] = useState(true);

  // Navigation configuration
  const navigationItems = getNavigationItems(location.pathname, mainNavItems).map(item => ({
    ...item,
    onClick: () => navigate(item.href),
  }));
  const templateUser = getUserForTemplate(user);

  // Load public courses
  useEffect(() => {
    const loadPublicCourses = async () => {
      setIsLoadingPublic(true);
      try {
        const result = await publicApi.listPublicCourses();
        const allPublicCourses = result.courses || [];
        
        // Filter out courses that the user is already enrolled in
        const enrolledCourseIds = new Set(enrolledCourses.map(ec => ec.enrollment.courseId));
        const availablePublicCourses = allPublicCourses.filter(
          (course: any) => !enrolledCourseIds.has(course.id)
        );
        
        setPublicCourses(availablePublicCourses);
      } catch (error: any) {
        console.error('Failed to load public courses:', error);
      } finally {
        setIsLoadingPublic(false);
      }
    };

    if (!isLoadingEnrolled) {
      loadPublicCourses();
    }
  }, [isLoadingEnrolled, enrolledCourses]);

  // Transform enrolled courses to CourseCardProps
  const enrolledCourseCards: CourseCardProps[] = useMemo(() => {
    return enrolledCourses
      .filter(({ course }) => course)
      .map(({ enrollment, course, progress }) => ({
        id: course.id,
        title: course.title || course.seedConceptName || 'Untitled Course',
        description: course.description,
        modules: course.moduleIds?.length || 0,
        duration: course.estimatedDuration ? Math.round(course.estimatedDuration / 60) : undefined,
        progress: progress?.progressPercentage,
        isPublic: course.isPublic,
        onClick: () => navigate(`/course/${enrollment.courseId}`),
      }));
  }, [enrolledCourses, navigate]);

  // Transform available courses to CourseCardProps
  const availableCourseCards: CourseCardProps[] = useMemo(() => {
    return publicCourses.map((course) => ({
      id: course.id,
      title: course.title || course.seedConceptName || 'Untitled Course',
      description: course.description,
      modules: course.moduleIds?.length || 0,
      duration: course.estimatedDuration ? Math.round(course.estimatedDuration / 60) : undefined,
      isPublic: course.isPublic,
      onClick: () => navigate(`/my-courses/${course.id}`),
    }));
  }, [publicCourses, navigate]);

  return (
    <CoursesPage
      enrolledCourses={enrolledCourseCards}
      availableCourses={availableCourseCards}
      isLoadingEnrolled={isLoadingEnrolled}
      isLoadingAvailable={isLoadingPublic}
      onCourseClick={(courseId) => navigate(`/course/${courseId}`)}
      onEnrollClick={(courseId) => navigate(`/my-courses/${courseId}`)}
      user={templateUser}
      navigationItems={navigationItems}
      onLogoClick={() => navigate('/home')}
    />
  );
};

CoursesPageContainer.displayName = 'CoursesPageContainer';

export default CoursesPageContainer;
export { CoursesPageContainer };
