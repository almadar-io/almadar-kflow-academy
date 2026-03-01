import { Router } from 'express';
import {
  enrollStudentHandler as oldEnrollStudentHandler,
  unenrollStudentHandler as oldUnenrollStudentHandler,
  getEnrollmentHandler,
  getStudentEnrollmentsHandler,
  getCourseEnrollmentHandler,
  updateProgressHandler,
  trackLessonCompletionHandler,
  canAdvanceToNextHandler,
  getProgressHandler,
  getAccessibleLessonsHandler,
  getEnrolledCoursesWithDetailsHandler,
} from '../controllers/enrollmentController';
import {
  enrollStudentSelfHandler,
  unenrollStudentSelfHandler,
} from '../controllers/studentManagementController';
import {
  getAssessmentByLessonForStudentHandler,
  submitAssessmentHandler,
  getAssessmentSubmissionHandler,
  getAssessmentSubmissionsHandler,
  evaluateAnswerHandler,
} from '../controllers/assessmentController';
import authenticateFirebase from '../middlewares/authenticateFirebase';

const router = Router();

// Enrollment Endpoints
// NEW: Student self-enrollment using StudentManagementService (replaces old enrollment)
router.post('/courses/:courseId/enroll', authenticateFirebase, enrollStudentSelfHandler);
router.delete('/courses/:courseId/enroll', authenticateFirebase, unenrollStudentSelfHandler);

// DEPRECATED: Old enrollment endpoints (kept for backward compatibility during migration)
// These routes use the old EnrollmentService and will be removed
router.post('/courses/:id/enroll-legacy', authenticateFirebase, oldEnrollStudentHandler);
router.get('/courses/:courseId/enrollment', authenticateFirebase, getCourseEnrollmentHandler);
router.get('/enrollments/with-details', authenticateFirebase, getEnrolledCoursesWithDetailsHandler); // Must be before /enrollments/:id
router.get('/enrollments', authenticateFirebase, getStudentEnrollmentsHandler);
router.delete('/enrollments/:id', authenticateFirebase, oldUnenrollStudentHandler);
router.get('/enrollments/:id', authenticateFirebase, getEnrollmentHandler);

// Progress Endpoints
router.put('/enrollments/:id/progress', authenticateFirebase, updateProgressHandler);
router.post('/enrollments/:id/complete', authenticateFirebase, trackLessonCompletionHandler);
router.get('/enrollments/:id/advance', authenticateFirebase, canAdvanceToNextHandler);
router.get('/enrollments/:id/progress', authenticateFirebase, getProgressHandler);
router.get('/enrollments/:id/lessons/accessible', authenticateFirebase, getAccessibleLessonsHandler);

// Assessment Endpoints (Student)
// More specific route first
router.get('/courses/:courseId/lessons/:lessonId/assessments', authenticateFirebase, getAssessmentByLessonForStudentHandler);
// Legacy route (requires courseId in query or will fail)
router.get('/lessons/:lessonId/assessments', authenticateFirebase, getAssessmentByLessonForStudentHandler);
router.post('/assessments/:id/submit', authenticateFirebase, submitAssessmentHandler);
router.post('/assessments/evaluate-answer', authenticateFirebase, evaluateAnswerHandler);
router.get('/assessments/submissions/:id', authenticateFirebase, getAssessmentSubmissionHandler);
router.get('/assessments/:id/submissions', authenticateFirebase, getAssessmentSubmissionsHandler);

export default router;

