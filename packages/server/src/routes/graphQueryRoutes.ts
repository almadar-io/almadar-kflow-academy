import { Router } from 'express';
import {
  createGetGraphSummaryHandler,
  createGetConceptsHandler,
  createGetConceptDetailHandler,
  createGetMindMapHandler,
  extractLearningPathSummary,
} from '@almadar-io/knowledge/server';
import { authenticateFirebase } from '@almadar/server';
import { graphQueryDeps } from '../utils/graphHandlerDeps';
import { computeLevelCount } from '../utils/computeLevelCount';

const router = Router();

router.use(authenticateFirebase);

router.get('/learning-paths', async (req, res, next) => {
  try {
    const uid = graphQueryDeps.getUid(req);
    if (!graphQueryDeps.getAllGraphIds) {
      res.status(501).json({ error: 'getAllGraphIds not provided' });
      return;
    }
    const graphIds = await graphQueryDeps.getAllGraphIds(uid);

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
        const hits = await access.findSimilarNodesCrossGraph(uid, otherIds, query, 3, ['Concept']);
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
    } catch {
      // graceful, no semantic
    }

    res.json({ learningPaths: paths, semanticEdges });
  } catch (error) {
    next(error);
  }
});
router.get('/:graphId/summary', createGetGraphSummaryHandler(graphQueryDeps));
router.get('/:graphId/concepts', createGetConceptsHandler(graphQueryDeps));
router.get('/:graphId/concepts/:conceptId', createGetConceptDetailHandler(graphQueryDeps));
router.get('/:graphId/mindmap', createGetMindMapHandler(graphQueryDeps));

export default router;
