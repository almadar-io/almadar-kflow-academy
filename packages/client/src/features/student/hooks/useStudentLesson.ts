import { useState, useEffect, useCallback, useRef } from 'react';
import { enrollmentApi } from '../enrollmentApi';
import type { Assessment } from '@/types/server/publishing';

interface UseStudentLessonOptions {
  lessonId: string | null;
  enrollmentId: string;
  courseId: string;
}

interface UseStudentLessonReturn {
  assessment: Assessment | null;
  isCompleted: boolean;
  showAssessment: boolean;
  isLoadingAssessment: boolean;
  checkForAssessment: (lessonId: string) => Promise<Assessment | null>;
  completeLesson: (lessonId: string) => Promise<void>;
  setShowAssessment: (show: boolean) => void;
  resetLessonState: () => void;
}

/**
 * Hook to manage student lesson state, completion tracking, and assessments
 */
export function useStudentLesson({
  lessonId,
  enrollmentId,
  courseId,
}: UseStudentLessonOptions): UseStudentLessonReturn {
  const [isCompleted, setIsCompleted] = useState(false);
  const [assessment, setAssessment] = useState<Assessment | null>(null);
  const [isLoadingAssessment, setIsLoadingAssessment] = useState(false);
  const [showAssessment, setShowAssessment] = useState(false);

  // Check for assessment for a lesson
  const checkForAssessment = useCallback(async (lessonId: string): Promise<Assessment | null> => {
    if (!enrollmentId || !courseId) return null;
    
    setIsLoadingAssessment(true);
    try {
      const result = await enrollmentApi.getAssessmentByLesson(courseId, lessonId);
      if (result.assessment) {
        setAssessment(result.assessment);
        return result.assessment;
      }
    } catch (error) {
      // No assessment exists, that's fine
      setAssessment(null);
    } finally {
      setIsLoadingAssessment(false);
    }
    return null;
  }, [enrollmentId, courseId]);

  // Track lesson completion
  const completeLesson = useCallback(async (lessonId: string) => {
    if (!enrollmentId) return;

    try {
      await enrollmentApi.trackLessonCompletion(enrollmentId, lessonId);
      setIsCompleted(true);
      
      // After completing, check if there's an assessment and show it
      const foundAssessment = await checkForAssessment(lessonId);
      if (foundAssessment) {
        setShowAssessment(true);
      }
    } catch (error: any) {
      console.error('Failed to complete lesson:', error);
      throw error; // Let the component handle the error
    }
  }, [enrollmentId, checkForAssessment]);

  // Reset lesson state when lesson changes
  const resetLessonState = useCallback(() => {
    setIsCompleted(false);
    setAssessment(null);
    setShowAssessment(false);
  }, []);

  // Track previous lessonId to prevent duplicate API calls
  const previousLessonIdRef = useRef<string | null>(null);

  // Check for assessment when lesson changes
  useEffect(() => {
    // Only check if lessonId actually changed
    if (lessonId && enrollmentId && courseId && lessonId !== previousLessonIdRef.current) {
      previousLessonIdRef.current = lessonId;
      resetLessonState();
      checkForAssessment(lessonId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lessonId, enrollmentId, courseId]); // checkForAssessment and resetLessonState are stable

  return {
    assessment,
    isCompleted,
    showAssessment,
    isLoadingAssessment,
    checkForAssessment,
    completeLesson,
    setShowAssessment,
    resetLessonState,
  };
}

