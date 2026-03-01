import { Router } from 'express';
import authenticateFirebase from '../middlewares/authenticateFirebase';

// Graph-based publishing controllers
import {
  getCourseSettingsHandler,
  publishCourseToGraphHandler,
  unpublishCourseFromGraphHandler,
  updateCourseSettingsInGraphHandler,
  getPublishedCourseViewHandler,
  isGraphPublishedHandler,
  getGraphModulesHandler,
  publishModuleHandler,
  unpublishModuleFromGraphHandler,
  publishAllModulesHandler,
  getGraphLessonsHandler,
  getModuleLessonsFromGraphHandler,
  publishLessonHandler,
  unpublishLessonFromGraphHandler,
  publishAllLessonsInModuleHandler,
  getContentReadinessHandler,
  getMentorPublishedCoursesHandler,
} from '../controllers/graphPublishingController';
import {
  enrollStudentHandler,
  unenrollStudentHandler,
  enrollStudentSelfHandler,
  unenrollStudentSelfHandler,
} from '../controllers/studentManagementController';

const router = Router();

// =============================================================================
// Assessment endpoints (kept for backward compatibility)
// These are still needed for assessment CRUD operations
// =============================================================================
import {
  createAssessmentHandler,
  updateAssessmentHandler,
  getAssessmentHandler,
  getAssessmentByLessonHandler,
  deleteAssessmentHandler,
} from '../controllers/assessmentController';

router.post('/courses/:courseId/modules/:moduleId/lessons/:id/assessments', authenticateFirebase, createAssessmentHandler);
router.put('/courses/:courseId/modules/:moduleId/lessons/:id/assessments/:assessmentId', authenticateFirebase, updateAssessmentHandler);
router.get('/courses/:courseId/modules/:moduleId/lessons/:id/assessments', authenticateFirebase, getAssessmentByLessonHandler);
router.get('/courses/:courseId/assessments/:id', authenticateFirebase, getAssessmentHandler);
router.delete('/courses/:courseId/assessments/:id', authenticateFirebase, deleteAssessmentHandler);

// =============================================================================
// Graph-Based Publishing Routes
// These routes use CourseSettings, ModuleSettings, and LessonSettings nodes
// stored directly in the knowledge graph.
// =============================================================================

// Mentor published courses (list all published courses from graphs)
router.get('/published-courses', authenticateFirebase, getMentorPublishedCoursesHandler);

// Course publishing (graph-based)
router.get('/graphs/:graphId/course-settings', authenticateFirebase, getCourseSettingsHandler);
router.put('/graphs/:graphId/course-settings', authenticateFirebase, updateCourseSettingsInGraphHandler);
router.post('/graphs/:graphId/publish', authenticateFirebase, publishCourseToGraphHandler);
router.delete('/graphs/:graphId/publish', authenticateFirebase, unpublishCourseFromGraphHandler);
router.get('/graphs/:graphId/published-view', authenticateFirebase, getPublishedCourseViewHandler);
router.get('/graphs/:graphId/is-published', authenticateFirebase, isGraphPublishedHandler);
router.get('/graphs/:graphId/content-readiness', authenticateFirebase, getContentReadinessHandler);

// Module publishing (graph-based)
router.get('/graphs/:graphId/modules', authenticateFirebase, getGraphModulesHandler);
router.post('/graphs/:graphId/modules/:layerId/publish', authenticateFirebase, publishModuleHandler);
router.delete('/graphs/:graphId/modules/:layerId/publish', authenticateFirebase, unpublishModuleFromGraphHandler);
router.post('/graphs/:graphId/modules/publish-all', authenticateFirebase, publishAllModulesHandler);
router.get('/graphs/:graphId/modules/:layerId/lessons', authenticateFirebase, getModuleLessonsFromGraphHandler);

// Lesson publishing (graph-based)
router.get('/graphs/:graphId/lessons', authenticateFirebase, getGraphLessonsHandler);
router.post('/graphs/:graphId/lessons/:conceptId/publish', authenticateFirebase, publishLessonHandler);
router.delete('/graphs/:graphId/lessons/:conceptId/publish', authenticateFirebase, unpublishLessonFromGraphHandler);
router.post('/graphs/:graphId/modules/:layerId/lessons/publish-all', authenticateFirebase, publishAllLessonsInModuleHandler);

// Enrollment endpoints (using courseId which maps to graphId)
// Mentor endpoints (for mentors to enroll/unenroll students)
router.post('/courses/:courseId/enroll', authenticateFirebase, enrollStudentHandler);
router.delete('/courses/:courseId/enroll/:studentUserId', authenticateFirebase, unenrollStudentHandler);

export default router;

