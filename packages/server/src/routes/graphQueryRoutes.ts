import { Router } from 'express';
import {
  createGetGraphSummaryHandler,
  createGetConceptsHandler,
  createGetConceptDetailHandler,
  createGetMindMapHandler,
  extractLearningPathSummary,
} from '@almadar-io/knowledge/server';
import { authenticateFirebase } from '@almadar/server';
import { createLogger } from '@almadar/logger';
import { graphQueryDeps } from '../utils/graphHandlerDeps';
import { computeLevelCount } from '../utils/computeLevelCount';
import { hybridCache, CACHE_TTL } from '../services/cacheService';
import { CACHE_KEYS } from '../services/cacheInvalidation';

const log = createLogger('kflow:server:routes:graphQueryRoutes');
const router = Router();

type LearningPathsPayload = {
  learningPaths: Array<ReturnType<typeof extractLearningPathSummary> & { levelCount: number }>;
  semanticEdges: Array<{ source: string; target: string; weight?: number }>;
};

router.use(authenticateFirebase);

router.get('/learning-paths', async (req, res, next) => {
  try {
    const uid = graphQueryDeps.getUid(req);

    const cacheKey = CACHE_KEYS.learningPaths(uid);
    const cached = await hybridCache.get<LearningPathsPayload>(cacheKey);
    if (cached) {
      const titleOf = new Map(cached.learningPaths.map(p => [p.id, p.title ?? p.id]));
      log.debug(`[MERGE-DIAG] /learning-paths cache hit`, {
        uid,
        pathCount: cached.learningPaths.length,
        edges: cached.semanticEdges.length,
        weighted: cached.semanticEdges.map(e => ({
          from: titleOf.get(e.source) ?? e.source,
          to: titleOf.get(e.target) ?? e.target,
          w: e.weight,
        })),
      });
      res.json(cached);
      return;
    }

    if (!graphQueryDeps.getAllGraphIds) {
      res.status(501).json({ error: 'getAllGraphIds not provided' });
      return;
    }
    const graphIds = await graphQueryDeps.getAllGraphIds(uid);
    log.debug(`[CHROMA-DEBUG][SEMANTIC] /learning-paths getAll returned ${graphIds.length}`, { graphIds: graphIds.join(',') });

    const paths = (await Promise.all(
      graphIds.map(async (graphId) => {
        try {
          const graph = await graphQueryDeps.accessLayer.getGraph(uid, graphId);
          return {
            ...extractLearningPathSummary(graph),
            levelCount: computeLevelCount(graph),
          };
        } catch {
          return null;
        }
      })
    )).filter((p): p is NonNullable<typeof p> => p !== null);

    paths.sort((a, b) => b.updatedAt - a.updatedAt);

    // Compute semantic edges for L1 viz using cross-graph vector search (Chroma).
    // For each path, use its title+desc as query, find similar concepts across other graphs.
    // This allows client to augment exact-ID clusters with semantic ones.
    const semanticEdges: Array<{ source: string; target: string; weight?: number }> = [];
    try {
      const access = graphQueryDeps.accessLayer;
      for (const p of paths) {
        const query = `${p.title || ''} ${p.description || ''}`.trim().slice(0, 300);
        if (!query) continue;
        const otherIds = paths.map(pp => pp.id).filter(id => id !== p.id);
        if (otherIds.length === 0) continue;
        log.debug(`[CHROMA-DEBUG][SEMANTIC] querying for path`, { pathId: p.id, otherCount: otherIds.length, query: query.slice(0, 40) });
        const hits = await access.findSimilarNodesCrossGraph(uid, otherIds, query, 3, ['Concept']);
        log.debug(`[CHROMA-DEBUG][SEMANTIC] hits for path`, { pathId: p.id, hitCount: hits?.length || 0 });
        const graphScores = new Map<string, number>();
        for (const h of hits) {
          if (h.graphId && h.graphId !== p.id) {
            const prev = graphScores.get(h.graphId) || 0;
            graphScores.set(h.graphId, Math.max(prev, h.score || 0.5));
          }
        }
        for (const [g, score] of graphScores) {
          // add undirected
          const [s, t] = p.id < g ? [p.id, g] : [g, p.id];
          if (!semanticEdges.some(e => e.source === s && e.target === t)) {
            semanticEdges.push({ source: s, target: t, weight: score });
          }
        }
      }
    } catch (e) {
      log.error('[CHROMA-DEBUG][SEMANTIC] loop error', { error: e instanceof Error ? e.message : String(e) });
      // graceful, no semantic
    }

    const payload: LearningPathsPayload = { learningPaths: paths, semanticEdges };
    {
      const titleOf = new Map(paths.map(p => [p.id, p.title ?? p.id]));
      log.debug(`[MERGE-DIAG] /learning-paths fresh`, {
        uid,
        pathCount: paths.length,
        edges: semanticEdges.length,
        weighted: semanticEdges.map(e => ({
          from: titleOf.get(e.source) ?? e.source,
          to: titleOf.get(e.target) ?? e.target,
          w: e.weight,
        })),
      });
    }
    await hybridCache.set(cacheKey, payload, CACHE_TTL.LEARNING_PATHS);
    res.json(payload);
  } catch (error) {
    next(error);
  }
});
router.get('/:graphId/summary', createGetGraphSummaryHandler(graphQueryDeps));
router.get('/:graphId/concepts', createGetConceptsHandler(graphQueryDeps));
router.get('/:graphId/concepts/:conceptId', createGetConceptDetailHandler(graphQueryDeps));
router.get('/:graphId/mindmap', createGetMindMapHandler(graphQueryDeps));

export default router;
