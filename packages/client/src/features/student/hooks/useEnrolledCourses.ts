import { useState, useEffect, useCallback, useRef } from 'react';
import { enrollmentApi } from '../enrollmentApi';
import type { Enrollment } from '../types';

export interface EnrolledCourseWithDetails {
  enrollment: Enrollment;
  course: any; // PublishedCourse
  progress?: {
    totalLessons: number;
    completedLessons: number;
    progressPercentage: number;
  };
}

export function useEnrolledCourses() {
  const [enrolledCourses, setEnrolledCourses] = useState<EnrolledCourseWithDetails[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const hasFetchedRef = useRef(false);
  const isFetchingRef = useRef(false);

  const loadEnrolledCourses = useCallback(async () => {
    // Prevent concurrent fetches
    if (isFetchingRef.current) {
      return;
    }

    isFetchingRef.current = true;
    setIsLoading(true);
    setError(null);
    try {
      // Get all enrolled courses with details in one bulk call
      const result = await enrollmentApi.getEnrolledCoursesWithDetails();
      const coursesWithDetails: EnrolledCourseWithDetails[] = (result.courses || []).map((item: any) => ({
        enrollment: item.enrollment,
        course: item.course,
        progress: item.progress,
      }));

      setEnrolledCourses(coursesWithDetails);
      hasFetchedRef.current = true;
    } catch (err: any) {
      console.error('Failed to load enrolled courses:', err);
      setError(err.message || 'Failed to load enrolled courses');
    } finally {
      setIsLoading(false);
      isFetchingRef.current = false;
    }
  }, []);

  useEffect(() => {
    // Only fetch on initial mount, not on re-renders
    if (!hasFetchedRef.current) {
      loadEnrolledCourses();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty deps - only run on mount

  return {
    enrolledCourses,
    isLoading,
    error,
    refresh: loadEnrolledCourses,
  };
}

