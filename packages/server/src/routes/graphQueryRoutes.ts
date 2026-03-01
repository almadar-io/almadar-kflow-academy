/**
 * Graph Query Routes
 * 
 * REST API routes for optimized graph queries.
 */

import { Router } from 'express';
import {
  getLearningPathsHandler,
  getGraphSummaryHandler,
  getConceptsHandler,
  getConceptDetailHandler,
  getMindMapHandler,
} from '../controllers/graphQueryController';
import authenticateFirebase from '../middlewares/authenticateFirebase';

const router = Router();

// All routes require authentication
router.use(authenticateFirebase);

/**
 * GET /api/graph-queries/learning-paths
 * Get summary of all learning paths for MentorPage
 */
router.get('/learning-paths', getLearningPathsHandler);

/**
 * GET /api/graph-queries/:graphId/summary
 * Get graph summary with goal and basic stats
 */
router.get('/:graphId/summary', getGraphSummaryHandler);

/**
 * GET /api/graph-queries/:graphId/concepts
 * Get all concepts organized by layer
 */
router.get('/:graphId/concepts', getConceptsHandler);

/**
 * GET /api/graph-queries/:graphId/concepts/:conceptId
 * Get complete concept detail with all related data
 */
router.get('/:graphId/concepts/:conceptId', getConceptDetailHandler);

/**
 * GET /api/graph-queries/:graphId/mindmap
 * Get mindmap structure from NodeBasedKnowledgeGraph
 * Query params: expandAll (boolean, default: false)
 */
router.get('/:graphId/mindmap', getMindMapHandler);

export default router;

