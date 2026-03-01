/**
 * Public Course Controller
 * 
 * Handles public course listing and search (no authentication required)
 */

import { Request, Response } from 'express';
import { PublicCourseIndexService } from '../services/publicCourse/PublicCourseIndexService';
import { KnowledgeGraphAccessLayer } from '../services/knowledgeGraphAccess';

// Singleton instances
const accessLayer = new KnowledgeGraphAccessLayer();
const publicCourseIndex = new PublicCourseIndexService(accessLayer);

/**
 * GET /api/public/courses
 * List all public courses
 */
export const listPublicCoursesHandler = async (
  req: Request,
  res: Response
) => {
  try {
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;
    
    const result = await publicCourseIndex.listCourses(limit, offset);
    
    return res.json({
      courses: result.courses,
      total: result.total,
      hasMore: result.hasMore,
    });
  } catch (error: any) {
    console.error('Failed to list public courses:', error);
    return res.status(500).json({ error: error.message || 'Failed to list public courses' });
  }
};

/**
 * GET /api/public/courses/:id
 * Get a public course by ID
 */
export const getPublicCourseHandler = async (
  req: Request<{ id: string }>,
  res: Response
) => {
  try {
    const { id } = req.params;
    
    // Try to get from index first
    let course = await publicCourseIndex.getCourseById(id);
    
    // If not found in index, try to get by graphId
    if (!course) {
      course = await publicCourseIndex.getCourseByGraphId(id);
    }
    
    if (!course) {
      return res.status(404).json({ error: 'Course not found' });
    }
    
    return res.json({ course });
  } catch (error: any) {
    console.error('Failed to get public course:', error);
    return res.status(500).json({ error: error.message || 'Failed to get public course' });
  }
};

/**
 * GET /api/public/courses/by-link
 * Get a course by private link
 */
export const getCourseByLinkHandler = async (
  req: Request,
  res: Response
) => {
  try {
    const link = req.query.link as string;
    
    if (!link) {
      return res.status(400).json({ error: 'Link parameter is required' });
    }
    
    // Search for course with matching private link
    // This would need to be implemented in PublicCourseIndexService
    // For now, return not implemented
    return res.status(501).json({ error: 'Private link lookup not yet implemented' });
  } catch (error: any) {
    console.error('Failed to get course by link:', error);
    return res.status(500).json({ error: error.message || 'Failed to get course by link' });
  }
};

/**
 * GET /api/public/courses/:courseId/lessons/:lessonId/content
 * Get lesson content for a published lesson (public access)
 */
export const getLessonContentHandler = async (
  req: Request<{ courseId: string; lessonId: string }>,
  res: Response
) => {
  try {
    const { courseId, lessonId } = req.params;
    
    // Use PublicCourseIndexService to get lesson content
    // It handles public access without requiring authentication
    const course = await publicCourseIndex.getCourseByGraphId(courseId);
    
    if (!course || !course.mentorId) {
      return res.status(404).json({ error: 'Course not found' });
    }
    
    // Get lesson content using the access layer
    // We need mentorId to access the graph (graphs are stored under users/{mentorId}/graphs/{graphId})
    // The lessonId should be the conceptId
    const contentData = await accessLayer.getLessonContentForPublishing(course.mentorId, courseId, lessonId);
    
    if (!contentData) {
      return res.json({
        content: '',
        flashCards: [],
      });
    }
    
    return res.json({
      content: contentData.content || '',
      flashCards: contentData.flashCards || [],
    });
  } catch (error: any) {
    console.error('Failed to get lesson content:', error);
    return res.status(500).json({ error: error.message || 'Failed to get lesson content' });
  }
};
