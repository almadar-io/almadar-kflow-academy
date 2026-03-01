/**
 * React Query hooks for enrollment management
 * 
 * These hooks provide type-safe, cached access to enrollment data with
 * automatic cache invalidation and optimistic updates.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { enrollmentKeys } from '../../knowledge-graph/hooks/queryKeys';
import { enrollmentApi } from '../../student/enrollmentApi';
import type { Enrollment, ProgressData } from '../../student/types';

// ============================================================================
// Types
// ============================================================================

export interface EnrollmentWithDetails extends Enrollment {
  courseTitle: string;
  courseDescription?: string;
  mentorName: string;
  totalLessons: number;
  thumbnailUrl?: string;
}

export interface EnrollmentQueryOptions {
  // Reserved for future filtering options
}

export interface CourseStudentsQueryOptions {
  limit?: number;
  offset?: number;
}

export interface EnrolledStudent {
  studentId: string;
  studentName: string;
  studentEmail?: string;
  enrollmentId: string;
  enrolledAt: number;
  completedLessonIds: string[];
  lastActiveAt?: number;
}

export interface ProgressUpdate {
  lessonId: string;
  completed?: boolean;
  timeSpentSeconds?: number;
}

// ============================================================================
// Query Hooks
// ============================================================================

/**
 * Get all enrollments for the current student
 */
export function useMyEnrollments(options?: EnrollmentQueryOptions) {
  return useQuery({
    queryKey: enrollmentKeys.myEnrollments(options),
    queryFn: async () => {
      const response = await enrollmentApi.getStudentEnrollments();
      return response.enrollments as Enrollment[];
    },
  });
}

/**
 * Get all enrollments with course details
 */
export function useMyEnrollmentsWithDetails() {
  return useQuery({
    queryKey: [...enrollmentKeys.myEnrollments(), 'with-details'] as const,
    queryFn: async () => {
      const response = await enrollmentApi.getEnrolledCoursesWithDetails();
      return response.enrollments as EnrollmentWithDetails[];
    },
  });
}

/**
 * Get a single enrollment by ID
 */
export function useEnrollment(enrollmentId: string | undefined) {
  return useQuery({
    queryKey: enrollmentKeys.enrollment(enrollmentId!),
    queryFn: async () => {
      const response = await enrollmentApi.getEnrollment(enrollmentId!);
      return response.enrollment as Enrollment;
    },
    enabled: !!enrollmentId,
  });
}

/**
 * Check enrollment status for a specific course
 */
export function useEnrollmentStatus(courseId: string | undefined) {
  return useQuery({
    queryKey: courseId ? enrollmentKeys.enrollmentStatus('', courseId) : ['disabled'],
    queryFn: async () => {
      const response = await enrollmentApi.getCourseEnrollment(courseId!);
      return {
        isEnrolled: !!response.enrollment,
        enrollment: response.enrollment as Enrollment | null,
      };
    },
    enabled: !!courseId,
  });
}

/**
 * Get enrollment progress
 */
export function useEnrollmentProgress(enrollmentId: string | undefined) {
  return useQuery({
    queryKey: enrollmentId ? [...enrollmentKeys.enrollment(enrollmentId), 'progress'] as const : ['disabled'],
    queryFn: async () => {
      const response = await enrollmentApi.getProgress(enrollmentId!);
      return response.progress as ProgressData;
    },
    enabled: !!enrollmentId,
  });
}

/**
 * Get accessible lessons for an enrollment
 */
export function useAccessibleLessons(enrollmentId: string | undefined) {
  return useQuery({
    queryKey: enrollmentId ? [...enrollmentKeys.enrollment(enrollmentId), 'accessible-lessons'] as const : ['disabled'],
    queryFn: async () => {
      const response = await enrollmentApi.getAccessibleLessons(enrollmentId!);
      return response.lessons as string[];
    },
    enabled: !!enrollmentId,
  });
}

// ============================================================================
// Mutation Hooks
// ============================================================================

/**
 * Enroll in a course
 */
export function useEnrollInCourse() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (courseId: string) => {
      const response = await enrollmentApi.enrollInCourse(courseId);
      return response.enrollment as Enrollment;
    },
    onSuccess: (data, courseId) => {
      // Invalidate enrollment queries
      queryClient.invalidateQueries({ queryKey: enrollmentKeys.myEnrollments() });
      queryClient.invalidateQueries({ queryKey: enrollmentKeys.enrollmentStatus('', courseId) });
      
      // Set the new enrollment in cache
      queryClient.setQueryData(enrollmentKeys.enrollment(data.id), data);
    },
  });
}

/**
 * Unenroll from a course
 * NOTE: Now uses new StudentManagementService - requires courseId instead of enrollmentId
 */
export function useUnenrollFromCourse() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ courseId }: { courseId: string }) => {
      await enrollmentApi.unenrollFromCourse(courseId);
      return { courseId };
    },
    onSuccess: ({ courseId }) => {
      // Invalidate lists (enrollmentId no longer needed)
      queryClient.invalidateQueries({ queryKey: enrollmentKeys.myEnrollments() });
      queryClient.invalidateQueries({ queryKey: enrollmentKeys.enrollmentStatus('', courseId) });
    },
  });
}

/**
 * Update progress for an enrollment
 */
export function useUpdateProgress() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ enrollmentId, lessonId }: { enrollmentId: string; lessonId: string }) => {
      const response = await enrollmentApi.updateProgress(enrollmentId, lessonId);
      return response.enrollment as Enrollment;
    },
    onMutate: async ({ enrollmentId, lessonId }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: enrollmentKeys.enrollment(enrollmentId) });
      
      // Snapshot previous value
      const previousEnrollment = queryClient.getQueryData<Enrollment>(
        enrollmentKeys.enrollment(enrollmentId)
      );
      
      // Optimistically update current lesson
      if (previousEnrollment) {
        queryClient.setQueryData<Enrollment>(
          enrollmentKeys.enrollment(enrollmentId),
          {
            ...previousEnrollment,
            currentLessonId: lessonId,
            lastAccessedAt: Date.now(),
          }
        );
      }
      
      return { previousEnrollment };
    },
    onError: (err, { enrollmentId }, context) => {
      // Rollback on error
      if (context?.previousEnrollment) {
        queryClient.setQueryData(
          enrollmentKeys.enrollment(enrollmentId),
          context.previousEnrollment
        );
      }
    },
    onSettled: (data, error, { enrollmentId }) => {
      // Always refetch after mutation
      queryClient.invalidateQueries({ queryKey: enrollmentKeys.enrollment(enrollmentId) });
      queryClient.invalidateQueries({ queryKey: enrollmentKeys.myEnrollments() });
    },
  });
}

/**
 * Mark a lesson as completed
 */
export function useCompleteLessonProgress() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ enrollmentId, lessonId }: { enrollmentId: string; lessonId: string }) => {
      const response = await enrollmentApi.trackLessonCompletion(enrollmentId, lessonId);
      return response.enrollment as Enrollment;
    },
    onMutate: async ({ enrollmentId, lessonId }) => {
      await queryClient.cancelQueries({ queryKey: enrollmentKeys.enrollment(enrollmentId) });
      
      const previousEnrollment = queryClient.getQueryData<Enrollment>(
        enrollmentKeys.enrollment(enrollmentId)
      );
      
      // Optimistically update completed lessons
      if (previousEnrollment) {
        const completedLessons = previousEnrollment.completedLessonIds || [];
        if (!completedLessons.includes(lessonId)) {
          queryClient.setQueryData<Enrollment>(
            enrollmentKeys.enrollment(enrollmentId),
            {
              ...previousEnrollment,
              completedLessonIds: [...completedLessons, lessonId],
              lastAccessedAt: Date.now(),
            }
          );
        }
      }
      
      return { previousEnrollment };
    },
    onError: (err, { enrollmentId }, context) => {
      if (context?.previousEnrollment) {
        queryClient.setQueryData(
          enrollmentKeys.enrollment(enrollmentId),
          context.previousEnrollment
        );
      }
    },
    onSettled: (data, error, { enrollmentId }) => {
      queryClient.invalidateQueries({ queryKey: enrollmentKeys.enrollment(enrollmentId) });
      queryClient.invalidateQueries({ queryKey: enrollmentKeys.myEnrollments() });
    },
  });
}

/**
 * Check if student can advance to next lesson
 */
export function useCanAdvanceToNext(enrollmentId: string | undefined, lessonId: string | undefined) {
  return useQuery({
    queryKey: enrollmentId && lessonId 
      ? [...enrollmentKeys.enrollment(enrollmentId), 'can-advance', lessonId] as const 
      : ['disabled'],
    queryFn: async () => {
      const response = await enrollmentApi.canAdvanceToNext(enrollmentId!, lessonId!);
      return {
        canAdvance: response.canAdvance as boolean,
        reason: response.reason as string | undefined,
        nextLessonId: response.nextLessonId as string | undefined,
      };
    },
    enabled: !!enrollmentId && !!lessonId,
  });
}
