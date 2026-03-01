import { useState, useEffect, useCallback, useRef } from 'react';
import { enrollmentApi } from '../enrollmentApi';
import type { ProgressData } from '../types';

interface UseProgressReturn {
  progress: ProgressData | null;
  isLoading: boolean;
  error: string | null;
  reload: () => Promise<void>;
  trackLessonCompletion: (lessonId: string) => Promise<void>;
  canAdvanceToNext: (lessonId: string) => Promise<{ canAdvance: boolean; reason?: string; nextLessonId?: string }>;
}

/**
 * Hook to manage student progress tracking
 */
export function useProgress(enrollmentId: string): UseProgressReturn {
  const [progress, setProgress] = useState<ProgressData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const previousEnrollmentIdRef = useRef<string | null>(null);

  const loadProgress = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await enrollmentApi.getProgress(enrollmentId);
      setProgress(result.progress);
    } catch (error: any) {
      console.error('Failed to load progress:', error);
      setError(error.message || 'Failed to load progress');
    } finally {
      setIsLoading(false);
    }
  }, [enrollmentId]);

  const trackLessonCompletion = useCallback(async (lessonId: string) => {
    try {
      await enrollmentApi.trackLessonCompletion(enrollmentId, lessonId);
      // Reload progress after completion
      await loadProgress();
    } catch (error: any) {
      console.error('Failed to track lesson completion:', error);
      throw error;
    }
  }, [enrollmentId, loadProgress]);

  const canAdvanceToNext = useCallback(async (lessonId: string) => {
    try {
      const result = await enrollmentApi.canAdvanceToNext(enrollmentId, lessonId);
      return result;
    } catch (error: any) {
      console.error('Failed to check advancement:', error);
      throw error;
    }
  }, [enrollmentId]);

  useEffect(() => {
    if (enrollmentId !== previousEnrollmentIdRef.current) {
      previousEnrollmentIdRef.current = enrollmentId;
      
      // Clear previous progress data when enrollmentId changes
      if (!enrollmentId) {
        setProgress(null);
        setIsLoading(false);
        setError(null);
        return;
      }
      
      // Load progress if enrollmentId is provided
      loadProgress();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enrollmentId]); // loadProgress is stable (useCallback with enrollmentId dependency)

  return {
    progress,
    isLoading,
    error,
    reload: loadProgress,
    trackLessonCompletion,
    canAdvanceToNext,
  };
}

