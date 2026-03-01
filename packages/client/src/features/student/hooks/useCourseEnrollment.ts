import { useState, useEffect, useCallback, useRef } from 'react';
import { enrollmentApi } from '../enrollmentApi';
import type { Enrollment } from '../types';

interface UseCourseEnrollmentOptions {
  courseId: string;
  autoCheck?: boolean; // Whether to automatically check enrollment on mount
}

interface UseCourseEnrollmentReturn {
  enrollment: Enrollment | null;
  enrollmentId: string | null;
  isEnrolled: boolean;
  isChecking: boolean;
  isEnrolling: boolean;
  checkEnrollment: () => Promise<void>;
  enroll: () => Promise<string | null>; // Returns enrollmentId on success
  unenroll: () => Promise<void>;
}

/**
 * Hook to manage course enrollment
 */
export function useCourseEnrollment({
  courseId,
  autoCheck = true,
}: UseCourseEnrollmentOptions): UseCourseEnrollmentReturn {
  const [enrollment, setEnrollment] = useState<Enrollment | null>(null);
  const [enrollmentId, setEnrollmentId] = useState<string | null>(null);
  const [isChecking, setIsChecking] = useState(autoCheck);
  const [isEnrolling, setIsEnrolling] = useState(false);
  const previousCourseIdRef = useRef<string | null>(null);

  const checkEnrollment = useCallback(async () => {
    setIsChecking(true);
    try {
      const result = await enrollmentApi.getCourseEnrollment(courseId);
      // API now returns 200 with { enrollment: null } if not enrolled (not an error)
      if (result.enrollment) {
        setEnrollment(result.enrollment);
        setEnrollmentId(result.enrollment.id);
      } else {
        setEnrollment(null);
        setEnrollmentId(null);
      }
    } catch (error: any) {
      // Only log actual errors, not "not enrolled" cases
      console.error('Failed to check enrollment:', error);
      setEnrollment(null);
      setEnrollmentId(null);
    } finally {
      setIsChecking(false);
    }
  }, [courseId]);

  const enroll = useCallback(async (): Promise<string | null> => {
    setIsEnrolling(true);
    try {
      const result = await enrollmentApi.enrollInCourse(courseId);
      const newEnrollmentId = result.enrollment.id;
      setEnrollment(result.enrollment);
      setEnrollmentId(newEnrollmentId);
      return newEnrollmentId;
    } catch (error: any) {
      console.error('Failed to enroll:', error);
      throw error;
    } finally {
      setIsEnrolling(false);
    }
  }, [courseId]);

  const unenroll = useCallback(async () => {
    setIsEnrolling(true);
    try {
      // New API uses courseId instead of enrollmentId
      await enrollmentApi.unenrollFromCourse(courseId);
      setEnrollment(null);
      setEnrollmentId(null);
    } catch (error: any) {
      console.error('Failed to unenroll:', error);
      throw error;
    } finally {
      setIsEnrolling(false);
    }
  }, [courseId]);

  // Auto-check enrollment on mount if enabled, and only if courseId changed
  useEffect(() => {
    if (courseId !== previousCourseIdRef.current) {
      previousCourseIdRef.current = courseId;
      
      // Clear previous enrollment data when courseId changes
      if (!courseId) {
        setEnrollment(null);
        setEnrollmentId(null);
        setIsChecking(false);
        return;
      }
      
      // Load enrollment if autoCheck is enabled
      if (autoCheck) {
        checkEnrollment();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoCheck, courseId]); // checkEnrollment is stable (useCallback with courseId dependency)

  return {
    enrollment,
    enrollmentId,
    isEnrolled: !!enrollment,
    isChecking,
    isEnrolling,
    checkEnrollment,
    enroll,
    unenroll,
  };
}

