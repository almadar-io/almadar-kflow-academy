import { Router } from 'express';
import {
  createGetGraphSummaryHandler,
  createGetConceptsHandler,
  createGetConceptDetailHandler,
  createGetMindMapHandler,
  extractLearningPathSummary,
  computePathSimilarity,
  computeSharedConceptEdges,
  canonicalConceptKey,
  type PathSimilarityEdge,
  type SharedConceptEdge,
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
  /** All-pairs path cosine similarity (0–1) for L1 map layout + clustering. */
  similarity: PathSimilarityEdge[];
  /** Pairwise shared-concept overlap (jaccard) — L1 map edges + color clustering. */
  sharedConcepts: SharedConceptEdge[];
};

router.use(authenticateFirebase);

router.get('/learning-paths', async (req, res, next) => {
  try {
    const uid = graphQueryDeps.getUid(req);

    const cacheKey = CACHE_KEYS.learningPaths(uid);
    const cached = await hybridCache.get<LearningPathsPayload>(cacheKey);
    if (cached && cached.sharedConcepts) { // entries predating sharedConcepts → recompute
      log.debug(`[SIMILARITY] /learning-paths cache hit`, {
        uid,
        pathCount: cached.learningPaths.length,
        pairs: (cached.similarity ?? []).length,
        sharedPairs: cached.sharedConcepts.length,
      });
      res.json(cached);
      return;
    }

    if (!graphQueryDeps.getAllGraphIds) {
      res.status(501).json({ error: 'getAllGraphIds not provided' });
      return;
    }
    const graphIds = await graphQueryDeps.getAllGraphIds(uid);

    const conceptIdsByGraph = new Map<string, string[]>();
    const paths = (await Promise.all(
      graphIds.map(async (graphId) => {
        try {
          const graph = await graphQueryDeps.accessLayer.getGraph(uid, graphId);
          // Canonical identity: two concepts with the same canonicalName count as one
          // shared concept, so the L1 map's overlap edges reflect real overlap.
          conceptIdsByGraph.set(
            graph.id,
            (graph.nodeTypes?.Concept ?? []).map((id) => {
              const node = graph.nodes[id];
              return node ? canonicalConceptKey(node) : id;
            }),
          );
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

    // Direct path↔path similarity via embeddings: one batch, all-pairs cosine.
    // Owned by @almadar-io/knowledge; degrades to [] when no embedding key is set,
    // replacing the old path↔concept cross-graph proxy (semanticEdges).
    const similarity = await computePathSimilarity(paths);

    // Pairwise shared-concept overlap, computed here where every graph is already loaded —
    // shipped in the payload so the client doesn't fan out one concept request per path.
    const sharedConcepts = computeSharedConceptEdges(
      paths.map((p) => ({ id: p.id, conceptIds: conceptIdsByGraph.get(p.id) ?? [] })),
    );

    const payload: LearningPathsPayload = { learningPaths: paths, similarity, sharedConcepts };
    log.debug(`[SIMILARITY] /learning-paths fresh`, {
      uid,
      pathCount: paths.length,
      pairs: similarity.length,
      sharedPairs: sharedConcepts.length,
    });
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
