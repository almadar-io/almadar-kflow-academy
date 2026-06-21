/**
 * Graph Query Controller
 */

import type { Request, Response } from 'express';
import { singleParam, singleQueryParam } from '../utils/httpParams';
import { KnowledgeGraphAccessLayer, extractLearningPathSummary, extractGraphSummary, getConceptsByLayer, getConceptDetail, getMindMapStructure } from '@almadar-io/knowledge/server';
import { getFirestore } from '@almadar/server';
import type {
  LearningPathsSummaryResponse,
  GraphSummary,
  ConceptsByLayerResponse,
  ConceptDetail,
} from '../types/graphQueries';
import { verifyGraphAccess } from '../utils/controllerHelpers';

const accessLayer = new KnowledgeGraphAccessLayer();

async function getAllGraphIds(uid: string): Promise<string[]> {
  const db = getFirestore();
  const snapshot = await db
    .collection('users')
    .doc(uid)
    .collection('knowledgeGraphs')
    .select('id')
    .get();
  return snapshot.docs.map(doc => doc.id);
}

function getUserId(req: Request): string {
  const uid = req.firebaseUser?.uid;
  if (!uid) throw new Error('Unauthorized');
  return uid;
}

interface ErrorResponse {
  error: string;
  details?: string;
  code?: string;
  graphId?: string | string[];
}

export async function getLearningPathsHandler(
  req: Request,
  res: Response<LearningPathsSummaryResponse | ErrorResponse>
): Promise<void> {
  try {
    const uid = getUserId(req);
    const graphIds = await getAllGraphIds(uid);
    const settled = await Promise.all(
      graphIds.map(async graphId => {
        try {
          const graph = await accessLayer.getGraph(uid, graphId);
          return extractLearningPathSummary(graph);
        } catch {
          return null;
        }
      })
    );
    const learningPaths = settled
      .filter((s): s is NonNullable<typeof s> => s !== null)
      .sort((a, b) => b.updatedAt - a.updatedAt);
    res.json({ learningPaths });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ error: `Failed to get learning paths: ${errorMessage}` });
  }
}

export async function getGraphSummaryHandler(
  req: Request,
  res: Response<GraphSummary | ErrorResponse>
): Promise<void> {
  try {
    const uid = getUserId(req);
    const graphId = singleParam(req.params.graphId);
    if (!graphId) { res.status(400).json({ error: 'Graph ID is required' }); return; }
    await verifyGraphAccess(uid, graphId, 'read');
    const graph = await accessLayer.getGraph(uid, graphId);
    const summary = extractGraphSummary(graph);
    res.json(summary);
  } catch (error: any) {
    if (error.name === 'AuthorizationError') {
      const statusCode = error.code === 'UNAUTHORIZED' ? 401 : error.code === 'NOT_FOUND' ? 404 : 403;
      res.status(statusCode).json({ error: error.message, code: error.code, graphId: error.graphId });
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

export async function getConceptsHandler(
  req: Request,
  res: Response<ConceptsByLayerResponse | ErrorResponse>
): Promise<void> {
  try {
    const uid = getUserId(req);
    const graphId = singleParam(req.params.graphId);
    if (!graphId) { res.status(400).json({ error: 'Graph ID is required' }); return; }
    await verifyGraphAccess(uid, graphId, 'read');
    const includeRelationships = req.query.includeRelationships !== 'false';
    const groupByLayer = req.query.groupByLayer !== 'false';
    const graph = await accessLayer.getGraph(uid, graphId);
    const response = getConceptsByLayer(graph, { includeRelationships, groupByLayer });
    res.json(response);
  } catch (error: any) {
    if (error.name === 'AuthorizationError') {
      const statusCode = error.code === 'UNAUTHORIZED' ? 401 : error.code === 'NOT_FOUND' ? 404 : 403;
      res.status(statusCode).json({ error: error.message, code: error.code, graphId: error.graphId });
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

export async function getMindMapHandler(
  req: Request,
  res: Response<import('../types/graphQueries').MindMapResponse | ErrorResponse>
): Promise<void> {
  try {
    const uid = getUserId(req);
    const graphId = singleParam(req.params.graphId);
    const expandAll = singleQueryParam(req.query.expandAll);
    if (!graphId) { res.status(400).json({ error: 'Graph ID is required' }); return; }
    await verifyGraphAccess(uid, graphId, 'read');
    const graph = await accessLayer.getGraph(uid, graphId);
    const result = getMindMapStructure(graph, { expandAll: expandAll === 'true' });
    res.json(result);
  } catch (error: any) {
    if (error.name === 'AuthorizationError') {
      const statusCode = error.code === 'UNAUTHORIZED' ? 401 : error.code === 'NOT_FOUND' ? 404 : 403;
      res.status(statusCode).json({ error: error.message, code: error.code, graphId: error.graphId });
      return;
    }
    console.error('Error getting mindmap structure:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    if (errorMessage.includes('not found') || errorMessage.includes('Seed concept')) {
      res.status(404).json({ error: errorMessage, code: error.code, graphId: req.params.graphId });
    } else {
      res.status(500).json({ error: `Failed to get mindmap structure: ${errorMessage}`, code: error.code, graphId: req.params.graphId });
    }
  }
}

export async function getConceptDetailHandler(
  req: Request,
  res: Response<ConceptDetail | ErrorResponse>
): Promise<void> {
  try {
    const uid = getUserId(req);
    const graphId = singleParam(req.params.graphId);
    const conceptId = singleParam(req.params.conceptId);
    if (!graphId || !conceptId) { res.status(400).json({ error: 'Graph ID and concept ID are required' }); return; }
    await verifyGraphAccess(uid, graphId, 'read');
    const graph = await accessLayer.getGraph(uid, graphId);
    const detail = getConceptDetail(graph, conceptId);
    res.json(detail);
  } catch (error: any) {
    if (error.name === 'AuthorizationError') {
      const statusCode = error.code === 'UNAUTHORIZED' ? 401 : error.code === 'NOT_FOUND' ? 404 : 403;
      res.status(statusCode).json({ error: error.message, code: error.code, graphId: error.graphId });
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
