import { Router } from 'express';
import {
  listPublicCoursesHandler,
  getPublicCourseHandler,
  getCourseByLinkHandler,
  getLessonContentHandler,
} from '../controllers/publicCourseController';

const router = Router();

// Public course routes (no authentication required)
router.get('/courses', listPublicCoursesHandler);
router.get('/courses/:id', getPublicCourseHandler);
router.get('/courses/by-link', getCourseByLinkHandler);
router.get('/courses/:courseId/lessons/:lessonId/content', getLessonContentHandler);

export default router;
