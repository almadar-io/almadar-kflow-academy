/**
 * Graph Query Controller
 * 
 * REST API endpoints for optimized graph queries that return
 * pre-formatted, display-ready data for Mentor pages.
 */

import type { Request, Response } from 'express';
import { GraphQueryService } from '../services/graphQueryService';
import type {
  LearningPathsSummaryResponse,
  GraphSummary,
  ConceptsByLayerResponse,
  ConceptDetail,
} from '../types/graphQueries';
import { verifyGraphAccess } from '../utils/controllerHelpers';

const queryService = new GraphQueryService();

/**
 * Get user ID from authenticated request
 */
function getUserId(req: Request): string {
  const uid = (req as any).firebaseUser?.uid;
  if (!uid) {
    throw new Error('Unauthorized');
  }
  return uid;
}

/**
 * Error response type
 */
interface ErrorResponse {
  error: string;
  details?: string;
  code?: string;
  graphId?: string;
}

/**
 * Get all learning paths summary
 * GET /api/graph-queries/learning-paths
 */
export async function getLearningPathsHandler(
  req: Request,
  res: Response<LearningPathsSummaryResponse | ErrorResponse>
): Promise<void> {
  try {
    const uid = getUserId(req);
    const learningPaths = await queryService.getLearningPathsSummary(uid);
    res.json({ learningPaths });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ error: `Failed to get learning paths: ${errorMessage}` });
  }
}

/**
 * Get graph summary
 * GET /api/graph-queries/:graphId/summary
 */
export async function getGraphSummaryHandler(
  req: Request,
  res: Response<GraphSummary | ErrorResponse>
): Promise<void> {
  try {
    const uid = getUserId(req);
    const { graphId } = req.params;
    
    // Verify graph ownership before read operations
    await verifyGraphAccess(uid, graphId, 'read');
    
    const summary = await queryService.getGraphSummary(uid, graphId);
    res.json(summary);
  } catch (error: any) {
    // Handle authorization errors
    if (error.name === 'AuthorizationError') {
      const statusCode = error.code === 'UNAUTHORIZED' ? 401 : error.code === 'NOT_FOUND' ? 404 : 403;
      res.status(statusCode).json({
        error: error.message,
        code: error.code,
        graphId: error.graphId,
      });
      return;
    }
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    if (errorMessage.includes('not found')) {
      res.status(404).json({ error: errorMessage });
    } else {
      res.status(500).json({ error: `Failed to get graph summary: ${errorMessage}` });
    }
  }
}

/**
 * Get concepts by layer
 * GET /api/graph-queries/:graphId/concepts
 */
export async function getConceptsHandler(
  req: Request,
  res: Response<ConceptsByLayerResponse | ErrorResponse>
): Promise<void> {
  try {
    const uid = getUserId(req);
    const { graphId } = req.params;
    
    // Verify graph ownership before read operations
    await verifyGraphAccess(uid, graphId, 'read');
    
    const includeRelationships = req.query.includeRelationships !== 'false';
    const groupByLayer = req.query.groupByLayer !== 'false';

    const response = await queryService.getConceptsByLayer(uid, graphId, {
      includeRelationships,
      groupByLayer,
    });
    res.json(response);
  } catch (error: any) {
    // Handle authorization errors
    if (error.name === 'AuthorizationError') {
      const statusCode = error.code === 'UNAUTHORIZED' ? 401 : error.code === 'NOT_FOUND' ? 404 : 403;
      res.status(statusCode).json({
        error: error.message,
        code: error.code,
        graphId: error.graphId,
      });
      return;
    }
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    if (errorMessage.includes('not found')) {
      res.status(404).json({ error: errorMessage });
    } else {
      res.status(500).json({ error: `Failed to get concepts: ${errorMessage}` });
    }
  }
}

/**
 * Get concept detail
 * GET /api/graph-queries/:graphId/concepts/:conceptId
 */
export async function getMindMapHandler(
  req: Request,
  res: Response<import('../types/graphQueries').MindMapResponse | ErrorResponse>
): Promise<void> {
  try {
    const uid = getUserId(req);
    const { graphId } = req.params;
    const { expandAll } = req.query;

    if (!graphId) {
      res.status(400).json({ error: 'Graph ID is required' });
      return;
    }

    // Verify graph ownership before read operations
    await verifyGraphAccess(uid, graphId, 'read');

    const result = await queryService.getMindMapStructure(uid, graphId, {
      expandAll: expandAll === 'true',
    });

    res.json(result);
  } catch (error: any) {
    // Handle authorization errors
    if (error.name === 'AuthorizationError') {
      const statusCode = error.code === 'UNAUTHORIZED' ? 401 : error.code === 'NOT_FOUND' ? 404 : 403;
      res.status(statusCode).json({
        error: error.message,
        code: error.code,
        graphId: error.graphId,
      });
      return;
    }
    console.error('Error getting mindmap structure:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    if (errorMessage.includes('not found') || errorMessage.includes('Seed concept')) {
      res.status(404).json({
        error: errorMessage,
        code: error.code,
        graphId: req.params.graphId,
      });
    } else {
      res.status(500).json({
        error: `Failed to get mindmap structure: ${errorMessage}`,
        code: error.code,
        graphId: req.params.graphId,
      });
    }
  }
}

export async function getConceptDetailHandler(
  req: Request,
  res: Response<ConceptDetail | ErrorResponse>
): Promise<void> {
  try {
    const uid = getUserId(req);
    const { graphId, conceptId } = req.params;
    
    // Verify graph ownership before read operations
    await verifyGraphAccess(uid, graphId, 'read');
    
    const detail = await queryService.getConceptDetail(uid, graphId, conceptId);
    res.json(detail);
  } catch (error: any) {
    // Handle authorization errors
    if (error.name === 'AuthorizationError') {
      const statusCode = error.code === 'UNAUTHORIZED' ? 401 : error.code === 'NOT_FOUND' ? 404 : 403;
      res.status(statusCode).json({
        error: error.message,
        code: error.code,
        graphId: error.graphId,
      });
      return;
    }
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    if (errorMessage.includes('not found')) {
      res.status(404).json({ error: errorMessage });
    } else {
      res.status(500).json({ error: `Failed to get concept detail: ${errorMessage}` });
    }
  }
}

