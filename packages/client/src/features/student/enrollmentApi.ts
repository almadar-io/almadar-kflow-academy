import { apiClient } from '../../services/apiClient';
import { auth } from '../../config/firebase';

// Helper function for auth headers
const withAuthHeaders = async (): Promise<HeadersInit> => {
  const currentUser = auth.currentUser;
  if (!currentUser) {
    throw new Error('User is not authenticated');
  }
  const token = await currentUser.getIdToken();
  return {
    Authorization: `Bearer ${token}`,
  };
};

// Enrollment API
// NOTE: Enrollment/unenrollment now uses the new StudentManagementService
// Progress tracking endpoints still use the old EnrollmentService (will be migrated separately)
export const enrollmentApi = {
  // Enrollment endpoints - NOW USING NEW STUDENT MANAGEMENT SERVICE
  enrollInCourse: async (courseId: string) => {
    const headers = await withAuthHeaders();
    // New endpoint uses StudentManagementService
    return apiClient.fetch(`/api/student/courses/${courseId}/enroll`, {
      method: 'POST',
      headers: { "Content-Type": "application/json", ...headers },
    });
  },

  unenrollFromCourse: async (courseId: string) => {
    const headers = await withAuthHeaders();
    // New endpoint uses StudentManagementService - courseId instead of enrollmentId
    return apiClient.fetch(`/api/student/courses/${courseId}/enroll`, {
      method: 'DELETE',
      headers: { "Content-Type": "application/json", ...headers },
    });
  },

  getEnrollment: async (enrollmentId: string) => {
    const headers = await withAuthHeaders();
    return apiClient.fetch(`/api/student/enrollments/${enrollmentId}`, {
      headers: { "Content-Type": "application/json", ...headers },
    });
  },

  getStudentEnrollments: async () => {
    const headers = await withAuthHeaders();
    return apiClient.fetch('/api/student/enrollments', {
      headers: { "Content-Type": "application/json", ...headers },
    });
  },

  getEnrolledCoursesWithDetails: async () => {
    const headers = await withAuthHeaders();
    return apiClient.fetch('/api/student/enrollments/with-details', {
      headers: { "Content-Type": "application/json", ...headers },
    });
  },

  getCourseEnrollment: async (courseId: string) => {
    const headers = await withAuthHeaders();
    return apiClient.fetch(`/api/student/courses/${courseId}/enrollment`, {
      headers: { "Content-Type": "application/json", ...headers },
    });
  },

  // Progress endpoints
  updateProgress: async (enrollmentId: string, lessonId: string) => {
    const headers = await withAuthHeaders();
    return apiClient.fetch(`/api/student/enrollments/${enrollmentId}/progress`, {
      method: 'PUT',
      headers: { "Content-Type": "application/json", ...headers },
      body: JSON.stringify({ lessonId }),
    });
  },

  trackLessonCompletion: async (enrollmentId: string, lessonId: string) => {
    const headers = await withAuthHeaders();
    return apiClient.fetch(`/api/student/enrollments/${enrollmentId}/complete`, {
      method: 'POST',
      headers: { "Content-Type": "application/json", ...headers },
      body: JSON.stringify({ lessonId }),
    });
  },

  canAdvanceToNext: async (enrollmentId: string, lessonId: string) => {
    const headers = await withAuthHeaders();
    return apiClient.fetch(`/api/student/enrollments/${enrollmentId}/advance?lessonId=${lessonId}`, {
      headers: { "Content-Type": "application/json", ...headers },
    });
  },

  getProgress: async (enrollmentId: string) => {
    const headers = await withAuthHeaders();
    return apiClient.fetch(`/api/student/enrollments/${enrollmentId}/progress`, {
      headers: { "Content-Type": "application/json", ...headers },
    });
  },

  getAccessibleLessons: async (enrollmentId: string) => {
    const headers = await withAuthHeaders();
    return apiClient.fetch(`/api/student/enrollments/${enrollmentId}/lessons/accessible`, {
      headers: { "Content-Type": "application/json", ...headers },
    });
  },

  // Assessment endpoints
  getAssessmentByLesson: async (courseId: string, lessonId: string) => {
    const headers = await withAuthHeaders();
    return apiClient.fetch(`/api/student/courses/${courseId}/lessons/${lessonId}/assessments`, {
      headers: { "Content-Type": "application/json", ...headers },
    });
  },

  submitAssessment: async (courseId: string, assessmentId: string, enrollmentId: string, lessonId: string, answers: any[]) => {
    const headers = await withAuthHeaders();
    return apiClient.fetch(`/api/student/assessments/${assessmentId}/submit`, {
      method: 'POST',
      headers: { "Content-Type": "application/json", ...headers },
      body: JSON.stringify({ courseId, assessmentId, enrollmentId, lessonId, answers }),
    });
  },

  getAssessmentSubmission: async (courseId: string, assessmentId: string, submissionId: string) => {
    const headers = await withAuthHeaders();
    return apiClient.fetch(`/api/student/assessments/submissions/${submissionId}`, {
      headers: { "Content-Type": "application/json", ...headers },
    });
  },

  getAssessmentSubmissions: async (courseId: string, assessmentId: string, enrollmentId?: string) => {
    const headers = await withAuthHeaders();
    const query = enrollmentId ? `?enrollmentId=${enrollmentId}` : '';
    return apiClient.fetch(`/api/student/assessments/${assessmentId}/submissions${query}`, {
      headers: { "Content-Type": "application/json", ...headers },
    });
  },

  evaluateAnswer: async (courseId: string, moduleId: string, lessonId: string, question: string, studentAnswer: string, correctAnswer: string | undefined, maxPoints: number) => {
    const headers = await withAuthHeaders();
    return apiClient.fetch(`/api/student/assessments/evaluate-answer`, {
      method: 'POST',
      headers: { "Content-Type": "application/json", ...headers },
      body: JSON.stringify({ courseId, moduleId, lessonId, question, studentAnswer, correctAnswer, maxPoints }),
    });
  },
};

