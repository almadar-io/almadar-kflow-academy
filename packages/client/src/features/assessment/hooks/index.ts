/**
 * Assessment hooks exports
 */

export {
  // Query hooks - Mentor
  useAssessment,
  useAssessmentByConceptId,
  
  // Query hooks - Student
  useStudentAssessment,
  useAssessmentResults,
  useSubmission,
  useAssessmentSubmissions,
  
  // Mutation hooks - Mentor
  useCreateAssessment,
  useUpdateAssessment,
  useDeleteAssessment,
  
  // Mutation hooks - Student
  useSubmitAssessment,
  useEvaluateAnswer,
  
  // Utility hooks
  useHasPassedAssessment,
  useRemainingAttempts,
  
  // Types
  type Assessment,
  type AssessmentQuestion,
  type AssessmentSubmission,
  type CreateAssessmentInput,
  type UpdateAssessmentInput,
  type SubmitAssessmentInput,
  type AnswerEvaluation,
  type QuestionType,
} from './useAssessment';
