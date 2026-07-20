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
  rankPathsByQuery,
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

type PathSummary = ReturnType<typeof extractLearningPathSummary> & { levelCount: number };

type LearningPathsPayload = {
  learningPaths: PathSummary[];
  similarity: PathSimilarityEdge[];
  sharedConcepts: SharedConceptEdge[];
};

/**
 * Load every learning-path summary for a user (one pass over all graphs), sorted newest-first.
 * Cached so the canvas (/learning-paths) and the paginated card list (/learning-paths/list)
 * don't each fan out a getGraph per path.
 */
async function loadPathSummaries(uid: string): Promise<{ paths: PathSummary[]; conceptIdsByGraph: Map<string, string[]> }> {
  const cacheKey = CACHE_KEYS.pathSummaries(uid);
  const cached = await hybridCache.get<{ paths: PathSummary[]; conceptIdsByGraph: [string, string[]][] }>(cacheKey);
  if (cached) {
    return { paths: cached.paths, conceptIdsByGraph: new Map(cached.conceptIdsByGraph) };
  }

  if (!graphQueryDeps.getAllGraphIds) {
    return { paths: [], conceptIdsByGraph: new Map() };
  }
  const graphIds = await graphQueryDeps.getAllGraphIds(uid);

  const conceptIdsByGraph = new Map<string, string[]>();
  const paths = (await Promise.all(
    graphIds.map(async (graphId) => {
      try {
        const graph = await graphQueryDeps.accessLayer.getGraph(uid, graphId);
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
  )).filter((p): p is PathSummary => p !== null);

  paths.sort((a, b) => b.updatedAt - a.updatedAt);

  await hybridCache.set(cacheKey, { paths, conceptIdsByGraph: [...conceptIdsByGraph.entries()] }, CACHE_TTL.LEARNING_PATHS);
  return { paths, conceptIdsByGraph };
}

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

    const { paths, conceptIdsByGraph } = await loadPathSummaries(uid);

    const similarity = await computePathSimilarity(paths);
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

type SortOption = 'recent' | 'oldest' | 'az' | 'za';
type LevelFilter = 'all' | '1' | '2-3' | '4plus';

function matchesLevelFilter(levelCount: number, filter: LevelFilter): boolean {
  switch (filter) {
    case '1': return levelCount <= 1;
    case '2-3': return levelCount >= 2 && levelCount <= 3;
    case '4plus': return levelCount >= 4;
    default: return true;
  }
}

/**
 * Paginated, searchable, filterable learning-path list for the Home card grid.
 * Search/sort/filter/pagination applied server-side over the cached summaries.
 */
router.get('/learning-paths/list', async (req, res, next) => {
  try {
    const uid = graphQueryDeps.getUid(req);
    const search = typeof req.query.search === 'string' ? req.query.search.trim() : '';
    const sort: SortOption = (['recent', 'oldest', 'az', 'za'].includes(req.query.sort as string) ? req.query.sort : 'recent') as SortOption;
    const levelFilter: LevelFilter = (['all', '1', '2-3', '4plus'].includes(req.query.levelFilter as string) ? req.query.levelFilter : 'all') as LevelFilter;
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(48, Math.max(1, Number(req.query.limit) || 9));

    const { paths } = await loadPathSummaries(uid);

    let items = paths;
    if (levelFilter !== 'all') {
      items = items.filter((p) => matchesLevelFilter(p.levelCount, levelFilter));
    }

    if (search) {
      // Semantic search: embed the query, find the closest concept/goal/lesson nodes across
      // the in-scope graphs, and rank paths by their best-matching node's score. Relevance
      // defines the order during search (the sort dropdown is a no-op while searching).
      const ranking = await rankPathsByQuery(graphQueryDeps.accessLayer.getVectorService(), items.map((p) => p.id), search);
      const byId = new Map(items.map((p) => [p.id, p] as const));
      items = ranking.rankedGraphIds
        .map((gid) => byId.get(gid))
        .filter((p): p is PathSummary => p !== undefined);
    } else {
      switch (sort) {
        case 'oldest': items = [...items].sort((a, b) => a.updatedAt - b.updatedAt); break;
        case 'az': items = [...items].sort((a, b) => a.title.localeCompare(b.title)); break;
        case 'za': items = [...items].sort((a, b) => b.title.localeCompare(a.title)); break;
        default: break; // 'recent' — already newest-first from loadPathSummaries
      }
    }

    const total = items.length;
    const totalPages = Math.max(1, Math.ceil(total / limit));
    const start = (page - 1) * limit;
    const paged = items.slice(start, start + limit);

    res.json({ items: paged, total, page, limit, totalPages });
  } catch (error) {
    next(error);
  }
});

router.get('/:graphId/summary', createGetGraphSummaryHandler(graphQueryDeps));
router.get('/:graphId/concepts', createGetConceptsHandler(graphQueryDeps));
router.get('/:graphId/concepts/:conceptId', createGetConceptDetailHandler(graphQueryDeps));
router.get('/:graphId/mindmap', createGetMindMapHandler(graphQueryDeps));

export default router;
