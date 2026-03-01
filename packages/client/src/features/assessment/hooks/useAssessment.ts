/**
 * React Query hooks for assessment management
 * 
 * These hooks provide type-safe, cached access to assessment data with
 * automatic cache invalidation and optimistic updates.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { assessmentKeys } from '../../knowledge-graph/hooks/queryKeys';
import {
  assessmentApi,
  type Assessment,
  type AssessmentQuestion,
  type AssessmentSubmission,
  type CreateAssessmentInput,
  type UpdateAssessmentInput,
  type SubmitAssessmentInput,
  type AnswerEvaluation,
  type QuestionType,
} from '../assessmentApi';

// ============================================================================
// Re-export types
// ============================================================================

export type {
  Assessment,
  AssessmentQuestion,
  AssessmentSubmission,
  CreateAssessmentInput,
  UpdateAssessmentInput,
  SubmitAssessmentInput,
  AnswerEvaluation,
  QuestionType,
};

// ============================================================================
// Query Hooks - Mentor Side
// ============================================================================

/**
 * Get assessment by ID
 */
export function useAssessment(
  courseId: string | undefined,
  assessmentId: string | undefined,
  options?: { enabled?: boolean }
) {
  const { enabled = true } = options ?? {};
  
  return useQuery({
    queryKey: assessmentId 
      ? assessmentKeys.byId(assessmentId)
      : ['disabled'],
    queryFn: async () => {
      const response = await assessmentApi.getAssessment(courseId!, assessmentId!);
      return response.assessment;
    },
    enabled: enabled && !!courseId && !!assessmentId,
  });
}

/**
 * Get assessment for a specific lesson/concept
 */
export function useAssessmentByConceptId(
  courseId: string | undefined,
  moduleId: string | undefined,
  lessonId: string | undefined,
  options?: { enabled?: boolean }
) {
  const { enabled = true } = options ?? {};
  
  return useQuery({
    queryKey: lessonId 
      ? assessmentKeys.byConceptId(lessonId)
      : ['disabled'],
    queryFn: async () => {
      const response = await assessmentApi.getAssessmentByLesson(courseId!, moduleId!, lessonId!);
      return response.assessment;
    },
    enabled: enabled && !!courseId && !!moduleId && !!lessonId,
  });
}

// ============================================================================
// Query Hooks - Student Side
// ============================================================================

/**
 * Get assessment for a student (may hide correct answers)
 */
export function useStudentAssessment(
  courseId: string | undefined,
  lessonId: string | undefined,
  options?: { enabled?: boolean }
) {
  const { enabled = true } = options ?? {};
  
  return useQuery({
    queryKey: lessonId 
      ? [...assessmentKeys.byConceptId(lessonId), 'student'] as const
      : ['disabled'],
    queryFn: async () => {
      const response = await assessmentApi.getStudentAssessment(courseId!, lessonId!);
      return response.assessment;
    },
    enabled: enabled && !!courseId && !!lessonId,
  });
}

/**
 * Get all submissions for an enrollment
 */
export function useAssessmentResults(
  enrollmentId: string | undefined,
  options?: { enabled?: boolean }
) {
  const { enabled = true } = options ?? {};
  
  return useQuery({
    queryKey: enrollmentId 
      ? assessmentKeys.results(enrollmentId)
      : ['disabled'],
    queryFn: async () => {
      const response = await assessmentApi.getEnrollmentSubmissions(enrollmentId!);
      return response.submissions;
    },
    enabled: enabled && !!enrollmentId,
  });
}

/**
 * Get a specific submission
 */
export function useSubmission(
  submissionId: string | undefined,
  options?: { enabled?: boolean }
) {
  const { enabled = true } = options ?? {};
  
  return useQuery({
    queryKey: submissionId 
      ? [...assessmentKeys.all, 'submission', submissionId] as const
      : ['disabled'],
    queryFn: async () => {
      const response = await assessmentApi.getSubmission(submissionId!);
      return response.submission;
    },
    enabled: enabled && !!submissionId,
  });
}

/**
 * Get submissions for a specific assessment
 */
export function useAssessmentSubmissions(
  assessmentId: string | undefined,
  enrollmentId?: string,
  options?: { enabled?: boolean }
) {
  const { enabled = true } = options ?? {};
  
  return useQuery({
    queryKey: assessmentId 
      ? [...assessmentKeys.byId(assessmentId), 'submissions', enrollmentId ?? 'all'] as const
      : ['disabled'],
    queryFn: async () => {
      const response = await assessmentApi.getSubmissions(assessmentId!, enrollmentId);
      return response.submissions;
    },
    enabled: enabled && !!assessmentId,
  });
}

// ============================================================================
// Mutation Hooks - Mentor Side (CRUD)
// ============================================================================

/**
 * Create a new assessment
 */
export function useCreateAssessment() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({
      courseId,
      moduleId,
      lessonId,
      data,
    }: {
      courseId: string;
      moduleId: string;
      lessonId: string;
      data: CreateAssessmentInput;
    }) => {
      const response = await assessmentApi.createAssessment(courseId, moduleId, lessonId, data);
      return response.assessment;
    },
    onSuccess: (data, variables) => {
      // Set the new assessment in cache
      queryClient.setQueryData(assessmentKeys.byId(data.id), data);
      queryClient.setQueryData(assessmentKeys.byConceptId(variables.lessonId), data);
    },
  });
}

/**
 * Update an assessment
 */
export function useUpdateAssessment() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({
      courseId,
      moduleId,
      lessonId,
      assessmentId,
      updates,
    }: {
      courseId: string;
      moduleId: string;
      lessonId: string;
      assessmentId: string;
      updates: UpdateAssessmentInput;
    }) => {
      const response = await assessmentApi.updateAssessment(
        courseId,
        moduleId,
        lessonId,
        assessmentId,
        updates
      );
      return response.assessment;
    },
    onSuccess: (data, variables) => {
      // Update cache
      queryClient.setQueryData(assessmentKeys.byId(variables.assessmentId), data);
      queryClient.setQueryData(assessmentKeys.byConceptId(variables.lessonId), data);
    },
  });
}

/**
 * Delete an assessment
 */
export function useDeleteAssessment() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({
      courseId,
      assessmentId,
      lessonId,
    }: {
      courseId: string;
      assessmentId: string;
      lessonId: string;
    }) => {
      await assessmentApi.deleteAssessment(courseId, assessmentId);
      return { assessmentId, lessonId };
    },
    onSuccess: ({ assessmentId, lessonId }) => {
      // Remove from cache
      queryClient.removeQueries({ queryKey: assessmentKeys.byId(assessmentId) });
      queryClient.setQueryData(assessmentKeys.byConceptId(lessonId), null);
    },
  });
}

// ============================================================================
// Mutation Hooks - Student Side (Submission)
// ============================================================================

/**
 * Submit assessment answers
 */
export function useSubmitAssessment() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({
      assessmentId,
      courseId,
      enrollmentId,
      lessonId,
      input,
    }: {
      assessmentId: string;
      courseId: string;
      enrollmentId: string;
      lessonId: string;
      input: SubmitAssessmentInput;
    }) => {
      const response = await assessmentApi.submitAssessment(
        assessmentId,
        courseId,
        enrollmentId,
        lessonId,
        input
      );
      return response.submission;
    },
    onSuccess: (data, variables) => {
      // Invalidate results queries
      queryClient.invalidateQueries({
        queryKey: assessmentKeys.results(variables.enrollmentId),
      });
      
      // Invalidate submissions for this assessment
      queryClient.invalidateQueries({
        queryKey: [...assessmentKeys.byId(variables.assessmentId), 'submissions'],
      });
    },
  });
}

/**
 * Evaluate a single answer (AI-powered for essay/short answer)
 */
export function useEvaluateAnswer() {
  return useMutation({
    mutationFn: async ({
      courseId,
      moduleId,
      lessonId,
      question,
      studentAnswer,
      correctAnswer,
      maxPoints,
    }: {
      courseId: string;
      moduleId: string;
      lessonId: string;
      question: string;
      studentAnswer: string;
      correctAnswer?: string;
      maxPoints: number;
    }) => {
      const response = await assessmentApi.evaluateAnswer(
        courseId,
        moduleId,
        lessonId,
        question,
        studentAnswer,
        correctAnswer,
        maxPoints
      );
      return response;
    },
  });
}

// ============================================================================
// Utility Hooks
// ============================================================================

/**
 * Check if student has passed the assessment
 */
export function useHasPassedAssessment(
  enrollmentId: string | undefined,
  assessmentId: string | undefined
) {
  const { data: submissions, ...rest } = useAssessmentSubmissions(
    assessmentId,
    enrollmentId,
    { enabled: !!enrollmentId && !!assessmentId }
  );
  
  return {
    ...rest,
    data: submissions
      ? {
          hasPassed: submissions.some(s => s.passed),
          bestScore: Math.max(...submissions.map(s => s.percentage), 0),
          attemptCount: submissions.length,
          lastAttempt: submissions.length > 0
            ? submissions.reduce((latest, s) => 
                s.submittedAt > latest.submittedAt ? s : latest
              )
            : undefined,
        }
      : undefined,
  };
}

/**
 * Get remaining attempts for an assessment
 */
export function useRemainingAttempts(
  assessmentId: string | undefined,
  enrollmentId: string | undefined
) {
  const { data: assessment } = useAssessment(undefined, assessmentId);
  const { data: submissions } = useAssessmentSubmissions(assessmentId, enrollmentId);
  
  if (!assessment || !submissions) {
    return { remaining: undefined, unlimited: undefined };
  }
  
  if (!assessment.maxAttempts) {
    return { remaining: undefined, unlimited: true };
  }
  
  return {
    remaining: Math.max(0, assessment.maxAttempts - submissions.length),
    unlimited: false,
  };
}
