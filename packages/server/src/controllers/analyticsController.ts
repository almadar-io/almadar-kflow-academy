/**
 * Analytics Controller
 * 
 * Handles analytics-related HTTP endpoints for courses.
 */

import { Request, Response } from 'express';
import { CourseAnalyticsService } from '../services/analytics/CourseAnalyticsService';
import { KnowledgeGraphAccessLayer } from '../services/knowledgeGraphAccess/KnowledgeGraphAccessLayer';
import { EnrollmentService } from '../services/enrollment/EnrollmentService';

type ErrorResponse = { error: string };

// Create singleton instances
const accessLayer = new KnowledgeGraphAccessLayer();
const enrollmentService = new EnrollmentService(accessLayer);
const analyticsService = new CourseAnalyticsService(accessLayer, enrollmentService);

// ==================== Course Analytics ====================

/**
 * Get course analytics
 */
export const getCourseAnalyticsHandler = async (
  req: Request<{ graphId: string }, { analytics: any } | ErrorResponse>,
  res: Response<{ analytics: any } | ErrorResponse>
) => {
  try {
    const uid = req.firebaseUser?.uid;

    if (!uid) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { graphId } = req.params;

    const analytics = await analyticsService.getCourseAnalytics(uid, graphId);
    return res.json({ analytics });
  } catch (error: any) {
    console.error('Failed to get course analytics:', error);
    return res.status(500).json({ error: error.message || 'Failed to get course analytics' });
  }
};

/**
 * Get lesson analytics
 */
export const getLessonAnalyticsHandler = async (
  req: Request<{ graphId: string; lessonId: string }, { analytics: any } | ErrorResponse>,
  res: Response<{ analytics: any } | ErrorResponse>
) => {
  try {
    const uid = req.firebaseUser?.uid;

    if (!uid) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { graphId, lessonId } = req.params;

    const analytics = await analyticsService.getLessonAnalytics(uid, graphId, lessonId);
    return res.json({ analytics });
  } catch (error: any) {
    console.error('Failed to get lesson analytics:', error);
    return res.status(500).json({ error: error.message || 'Failed to get lesson analytics' });
  }
};

/**
 * Get student analytics
 */
export const getStudentAnalyticsHandler = async (
  req: Request<{ graphId: string; studentId: string }, { analytics: any } | ErrorResponse>,
  res: Response<{ analytics: any } | ErrorResponse>
) => {
  try {
    const uid = req.firebaseUser?.uid;

    if (!uid) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { graphId, studentId } = req.params;

    const analytics = await analyticsService.getStudentAnalytics(uid, graphId, studentId);
    return res.json({ analytics });
  } catch (error: any) {
    console.error('Failed to get student analytics:', error);
    return res.status(500).json({ error: error.message || 'Failed to get student analytics' });
  }
};

/**
 * Get language analytics for a course
 */
export const getLanguageAnalyticsHandler = async (
  req: Request<{ graphId: string }, { analytics: any } | ErrorResponse>,
  res: Response<{ analytics: any } | ErrorResponse>
) => {
  try {
    const uid = req.firebaseUser?.uid;

    if (!uid) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { graphId } = req.params;

    const analytics = await analyticsService.getLanguageAnalytics(uid, graphId);
    return res.json({ analytics });
  } catch (error: any) {
    console.error('Failed to get language analytics:', error);
    return res.status(500).json({ error: error.message || 'Failed to get language analytics' });
  }
};
