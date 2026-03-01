/**
 * Analytics Routes
 * 
 * API endpoints for course analytics.
 */

import { Router } from 'express';
import authenticateFirebase from '../middlewares/authenticateFirebase';
import {
  getCourseAnalyticsHandler,
  getLessonAnalyticsHandler,
  getStudentAnalyticsHandler,
  getLanguageAnalyticsHandler,
} from '../controllers/analyticsController';

const router = Router();

// Course analytics
router.get('/graphs/:graphId/course', authenticateFirebase, getCourseAnalyticsHandler);
router.get('/graphs/:graphId/lessons/:lessonId', authenticateFirebase, getLessonAnalyticsHandler);
router.get('/graphs/:graphId/students/:studentId', authenticateFirebase, getStudentAnalyticsHandler);
router.get('/graphs/:graphId/languages', authenticateFirebase, getLanguageAnalyticsHandler);

export default router;
