/**
 * Graph-Based Publishing Controller
 * 
 * Handles publishing operations using the new graph-based system.
 * Publishing creates CourseSettings, ModuleSettings, and LessonSettings nodes
 * directly in the knowledge graph.
 */

import { Request, Response } from 'express';
import { KnowledgeGraphAccessLayer } from '../services/knowledgeGraphAccess';
import { getUserGraphs } from '../services/graphService';
import type { CoursePublishSettings, ModulePublishSettings, LessonPublishSettings } from '../services/knowledgeGraphAccess';

type ErrorResponse = { error: string };

// Singleton instance of the access layer
const accessLayer = new KnowledgeGraphAccessLayer();

// ============================================================================
// Course Publishing Endpoints
// ============================================================================

/**
 * GET /api/mentor/graphs/:graphId/course-settings
 * Get course settings from graph (CourseSettings node)
 */
export const getCourseSettingsHandler = async (
  req: Request<{ graphId: string }>,
  res: Response
) => {
  try {
    const uid = req.firebaseUser?.uid;
    if (!uid) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { graphId } = req.params;
    const settings = await accessLayer.getCourseSettings(uid, graphId);

    return res.json({ settings });
  } catch (error: any) {
    console.error('Failed to get course settings:', error);
    return res.status(500).json({ error: error.message || 'Failed to get course settings' });
  }
};

/**
 * POST /api/mentor/graphs/:graphId/publish
 * Publish a course (creates CourseSettings node in graph)
 */
export const publishCourseToGraphHandler = async (
  req: Request<{ graphId: string }, {}, CoursePublishSettings>,
  res: Response
) => {
  try {
    const uid = req.firebaseUser?.uid;
    if (!uid) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { graphId } = req.params;
    const settings = req.body;

    const result = await accessLayer.publishCourse(uid, graphId, settings);
    const course = await accessLayer.getPublishedCourseView(uid, graphId);

    return res.json({
      courseSettingsId: result.courseSettingsId,
      course,
    });
  } catch (error: any) {
    console.error('Failed to publish course:', error);
    return res.status(500).json({ error: error.message || 'Failed to publish course' });
  }
};

/**
 * DELETE /api/mentor/graphs/:graphId/publish
 * Unpublish a course (marks CourseSettings as unpublished)
 */
export const unpublishCourseFromGraphHandler = async (
  req: Request<{ graphId: string }>,
  res: Response
) => {
  try {
    const uid = req.firebaseUser?.uid;
    if (!uid) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { graphId } = req.params;
    await accessLayer.unpublishCourse(uid, graphId);

    return res.json({ success: true });
  } catch (error: any) {
    console.error('Failed to unpublish course:', error);
    return res.status(500).json({ error: error.message || 'Failed to unpublish course' });
  }
};

/**
 * PUT /api/mentor/graphs/:graphId/course-settings
 * Update course settings
 */
export const updateCourseSettingsInGraphHandler = async (
  req: Request<{ graphId: string }, {}, Partial<CoursePublishSettings>>,
  res: Response
) => {
  try {
    const uid = req.firebaseUser?.uid;
    if (!uid) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { graphId } = req.params;
    const updates = req.body;

    await accessLayer.updateCourseSettings(uid, graphId, updates);
    const settings = await accessLayer.getCourseSettings(uid, graphId);

    return res.json({ settings });
  } catch (error: any) {
    console.error('Failed to update course settings:', error);
    return res.status(500).json({ error: error.message || 'Failed to update course settings' });
  }
};

/**
 * GET /api/mentor/graphs/:graphId/published-view
 * Get published course view (for students or preview)
 */
export const getPublishedCourseViewHandler = async (
  req: Request<{ graphId: string }, {}, {}, { language?: string }>,
  res: Response
) => {
  try {
    const uid = req.firebaseUser?.uid;
    if (!uid) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { graphId } = req.params;
    const { language } = req.query;
    const course = await accessLayer.getPublishedCourseView(uid, graphId, language);

    return res.json({ course });
  } catch (error: any) {
    console.error('Failed to get published course view:', error);
    return res.status(500).json({ error: error.message || 'Failed to get published course view' });
  }
};

/**
 * GET /api/mentor/graphs/:graphId/is-published
 * Check if a graph is published as a course
 */
export const isGraphPublishedHandler = async (
  req: Request<{ graphId: string }>,
  res: Response
) => {
  try {
    const uid = req.firebaseUser?.uid;
    if (!uid) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { graphId } = req.params;
    const isPublished = await accessLayer.isCoursePublished(uid, graphId);

    return res.json({ isPublished });
  } catch (error: any) {
    console.error('Failed to check if published:', error);
    return res.status(500).json({ error: error.message || 'Failed to check if published' });
  }
};

// ============================================================================
// Module Publishing Endpoints
// ============================================================================

/**
 * GET /api/mentor/graphs/:graphId/modules
 * Get all modules (layers) available for publishing with published status
 */
export const getGraphModulesHandler = async (
  req: Request<{ graphId: string }>,
  res: Response
) => {
  try {
    const uid = req.firebaseUser?.uid;
    if (!uid) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { graphId } = req.params;
    
    // Get seed concept data which includes modules (layers)
    const seedData = await accessLayer.getSeedConceptForPublishing(uid, graphId);
    if (!seedData) {
      return res.json({ modules: [] });
    }

    // Get graph to check ModuleSettings for published status
    const graph = await accessLayer.getGraph(uid, graphId);
    const moduleSettingsIds = graph.nodeTypes.ModuleSettings || [];
    
    // Create a map of layerId -> isPublished
    const publishedStatusMap = new Map<string, boolean>();
    for (const settingsId of moduleSettingsIds) {
      const settingsNode = graph.nodes[settingsId];
      if (settingsNode && settingsNode.type === 'ModuleSettings') {
        const settings = settingsNode.properties as any;
        const layerId = settings.layerId;
        publishedStatusMap.set(layerId, settings.isPublished || false);
      }
    }

    // Add isPublished status to each module
    const modulesWithStatus = seedData.modules.map(module => ({
      ...module,
      isPublished: publishedStatusMap.get(module.id) || false,
    }));

    return res.json({ modules: modulesWithStatus });
  } catch (error: any) {
    console.error('Failed to get graph modules:', error);
    return res.status(500).json({ error: error.message || 'Failed to get graph modules' });
  }
};

/**
 * POST /api/mentor/graphs/:graphId/modules/:layerId/publish
 * Publish a module (layer)
 */
export const publishModuleHandler = async (
  req: Request<{ graphId: string; layerId: string }, {}, ModulePublishSettings>,
  res: Response
) => {
  try {
    const uid = req.firebaseUser?.uid;
    if (!uid) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { graphId, layerId } = req.params;
    const settings = req.body;

    const result = await accessLayer.publishModule(uid, graphId, layerId, settings);

    return res.json({ moduleSettingsId: result.moduleSettingsId });
  } catch (error: any) {
    console.error('Failed to publish module:', error);
    return res.status(500).json({ error: error.message || 'Failed to publish module' });
  }
};

/**
 * DELETE /api/mentor/graphs/:graphId/modules/:layerId/publish
 * Unpublish a module
 */
export const unpublishModuleFromGraphHandler = async (
  req: Request<{ graphId: string; layerId: string }>,
  res: Response
) => {
  try {
    const uid = req.firebaseUser?.uid;
    if (!uid) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { graphId, layerId } = req.params;
    await accessLayer.unpublishModule(uid, graphId, layerId);

    return res.json({ success: true });
  } catch (error: any) {
    console.error('Failed to unpublish module:', error);
    return res.status(500).json({ error: error.message || 'Failed to unpublish module' });
  }
};

/**
 * POST /api/mentor/graphs/:graphId/modules/publish-all
 * Publish all modules in a graph
 */
export const publishAllModulesHandler = async (
  req: Request<{ graphId: string }>,
  res: Response
) => {
  try {
    const uid = req.firebaseUser?.uid;
    if (!uid) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { graphId } = req.params;
    const result = await accessLayer.publishAllModules(uid, graphId);

    return res.json({ count: result.publishedCount });
  } catch (error: any) {
    console.error('Failed to publish all modules:', error);
    return res.status(500).json({ error: error.message || 'Failed to publish all modules' });
  }
};

// ============================================================================
// Lesson Publishing Endpoints
// ============================================================================

/**
 * GET /api/mentor/graphs/:graphId/lessons
 * Get all published lessons in a graph
 */
export const getGraphLessonsHandler = async (
  req: Request<{ graphId: string }>,
  res: Response
) => {
  try {
    const uid = req.firebaseUser?.uid;
    if (!uid) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { graphId } = req.params;
    const lessons = await accessLayer.getAllPublishedLessons(uid, graphId);

    return res.json({ lessons });
  } catch (error: any) {
    console.error('Failed to get graph lessons:', error);
    return res.status(500).json({ error: error.message || 'Failed to get graph lessons' });
  }
};

/**
 * GET /api/mentor/graphs/:graphId/modules/:layerId/lessons
 * Get lessons for a specific module (layer)
 */
export const getModuleLessonsFromGraphHandler = async (
  req: Request<{ graphId: string; layerId: string }>,
  res: Response
) => {
  try {
    const uid = req.firebaseUser?.uid;
    if (!uid) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { graphId, layerId } = req.params;
    
    // Get module concept data which includes lessons
    const moduleData = await accessLayer.getModuleConceptForPublishing(uid, graphId, layerId);
    if (!moduleData) {
      return res.json({ lessons: [] });
    }

    // Get graph to check LessonSettings for published status
    const graph = await accessLayer.getGraph(uid, graphId);
    const lessonSettingsIds = graph.nodeTypes.LessonSettings || [];
    
    // Create a map of conceptId -> isPublished
    const publishedStatusMap = new Map<string, boolean>();
    for (const settingsId of lessonSettingsIds) {
      const settingsNode = graph.nodes[settingsId];
      if (settingsNode && settingsNode.type === 'LessonSettings') {
        const settings = settingsNode.properties as any;
        const conceptId = settings.conceptId;
        publishedStatusMap.set(conceptId, settings.isPublished || false);
      }
    }

    // Add isPublished status to each lesson
    const lessonsWithStatus = moduleData.availableLessons.map(lesson => ({
      ...lesson,
      isPublished: publishedStatusMap.get(lesson.id) || false,
    }));

    return res.json({ lessons: lessonsWithStatus });
  } catch (error: any) {
    console.error('Failed to get module lessons:', error);
    return res.status(500).json({ error: error.message || 'Failed to get module lessons' });
  }
};

/**
 * POST /api/mentor/graphs/:graphId/lessons/:conceptId/publish
 * Publish a lesson (concept)
 */
export const publishLessonHandler = async (
  req: Request<{ graphId: string; conceptId: string }, {}, LessonPublishSettings>,
  res: Response
) => {
  try {
    const uid = req.firebaseUser?.uid;
    if (!uid) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { graphId, conceptId } = req.params;
    const settings = req.body;

    const result = await accessLayer.publishLesson(uid, graphId, conceptId, settings);

    return res.json({ lessonSettingsId: result.lessonSettingsId });
  } catch (error: any) {
    console.error('Failed to publish lesson:', error);
    return res.status(500).json({ error: error.message || 'Failed to publish lesson' });
  }
};

/**
 * DELETE /api/mentor/graphs/:graphId/lessons/:conceptId/publish
 * Unpublish a lesson
 */
export const unpublishLessonFromGraphHandler = async (
  req: Request<{ graphId: string; conceptId: string }>,
  res: Response
) => {
  try {
    const uid = req.firebaseUser?.uid;
    if (!uid) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { graphId, conceptId } = req.params;
    await accessLayer.unpublishLesson(uid, graphId, conceptId);

    return res.json({ success: true });
  } catch (error: any) {
    console.error('Failed to unpublish lesson:', error);
    return res.status(500).json({ error: error.message || 'Failed to unpublish lesson' });
  }
};

/**
 * POST /api/mentor/graphs/:graphId/modules/:layerId/lessons/publish-all
 * Publish all lessons in a module
 */
export const publishAllLessonsInModuleHandler = async (
  req: Request<{ graphId: string; layerId: string }>,
  res: Response
) => {
  try {
    const uid = req.firebaseUser?.uid;
    if (!uid) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { graphId, layerId } = req.params;
    const result = await accessLayer.publishAllLessonsInModule(uid, graphId, layerId);

    return res.json({ count: result.publishedCount });
  } catch (error: any) {
    console.error('Failed to publish all lessons:', error);
    return res.status(500).json({ error: error.message || 'Failed to publish all lessons' });
  }
};

// ============================================================================
// Content Readiness Endpoint
// ============================================================================

/**
 * GET /api/mentor/graphs/:graphId/content-readiness
 * Get content readiness status for publishing
 */
export const getContentReadinessHandler = async (
  req: Request<{ graphId: string }>,
  res: Response
) => {
  try {
    const uid = req.firebaseUser?.uid;
    if (!uid) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { graphId } = req.params;
    
    // Get seed data to calculate readiness
    const seedData = await accessLayer.getSeedConceptForPublishing(uid, graphId);
    if (!seedData) {
      return res.json({
        graphId,
        isReady: false,
        readinessScore: 0,
        totalModules: 0,
        modulesWithContent: 0,
        totalLessons: 0,
        lessonsWithContent: 0,
        issues: [{ type: 'error', message: 'Graph not found or has no seed concept' }],
      });
    }

    // Calculate metrics
    const totalModules = seedData.modules.length;
    let totalLessons = 0;
    let lessonsWithContent = 0;
    const issues: Array<{ type: 'error' | 'warning'; message: string; moduleId?: string; lessonId?: string }> = [];

    for (const module of seedData.modules) {
      const moduleData = await accessLayer.getModuleConceptForPublishing(uid, graphId, module.id);
      if (moduleData) {
        for (const lesson of moduleData.availableLessons) {
          totalLessons++;
          if (lesson.hasLessonContent) {
            lessonsWithContent++;
          } else {
            issues.push({
              type: 'warning',
              message: `Lesson "${lesson.name}" has no content`,
              moduleId: module.id,
              lessonId: lesson.id,
            });
          }
        }
      }
    }

    const readinessScore = totalLessons > 0 ? Math.round((lessonsWithContent / totalLessons) * 100) : 0;
    const isReady = readinessScore >= 50 && totalModules > 0;

    if (totalModules === 0) {
      issues.push({ type: 'error', message: 'No modules (layers) found in graph' });
    }

    return res.json({
      graphId,
      isReady,
      readinessScore,
      totalModules,
      modulesWithContent: totalModules, // All modules exist
      totalLessons,
      lessonsWithContent,
      issues,
    });
  } catch (error: any) {
    console.error('Failed to get content readiness:', error);
    return res.status(500).json({ error: error.message || 'Failed to get content readiness' });
  }
};

// ============================================================================
// Mentor Courses Endpoint
// ============================================================================

/**
 * GET /api/mentor/published-courses
 * Get all published courses for the current mentor
 * This queries all graphs owned by the user that have CourseSettings nodes
 */
export const getMentorPublishedCoursesHandler = async (
  req: Request,
  res: Response
) => {
  try {
    const uid = req.firebaseUser?.uid;
    if (!uid) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Get all graphs for the user using graphService
    const graphs = await getUserGraphs(uid);
    const publishedCourses = [];

    for (const graph of graphs) {
      try {
        const settings = await accessLayer.getCourseSettings(uid, graph.id);
        if (settings && settings.isPublished) {
          // Get full course view for published courses
          const courseView = await accessLayer.getPublishedCourseView(uid, graph.id);
          if (courseView) {
            publishedCourses.push({
              graphId: graph.id,
              title: courseView.title,
              description: courseView.description,
              visibility: courseView.visibility,
              isPublished: courseView.isPublished,
              publishedAt: courseView.publishedAt,
              totalModules: courseView.totalModules,
              totalLessons: courseView.totalLessons,
              thumbnailUrl: courseView.thumbnailUrl,
              tags: courseView.tags,
              category: courseView.category,
            });
          }
        }
      } catch (err) {
        // Skip graphs that fail to load (might be corrupted or inaccessible)
        console.warn(`Skipping graph ${graph.id}:`, err);
      }
    }

    return res.json({ courses: publishedCourses });
  } catch (error: any) {
    console.error('Failed to get mentor published courses:', error);
    return res.status(500).json({ error: error.message || 'Failed to get mentor published courses' });
  }
};

// ============================================================================
// Public Courses Endpoint
// ============================================================================

/**
 * GET /api/public/courses
 * Get all public courses (no authentication required)
 * Queries all graphs that have CourseSettings with visibility='public'
 */
export const getPublicCoursesHandler = async (
  req: Request,
  res: Response
) => {
  try {
    // Get all graphs from all users (public courses)
    // Note: This is a simplified implementation. In production, you might want to:
    // 1. Use a public course index/cache
    // 2. Limit the query scope
    // 3. Add pagination
    
    // For now, we'll need to query all graphs - this is expensive
    // A better approach would be to maintain a public course index
    // But for now, let's return an empty array or implement a basic version
    
    // TODO: Implement proper public course listing
    // This should query a public course index or cache, not all graphs
    return res.json({ courses: [] });
  } catch (error: any) {
    console.error('Failed to get public courses:', error);
    return res.status(500).json({ error: error.message || 'Failed to get public courses' });
  }
};
