import { KnowledgeGraphAccessLayer, extractLearningPathSummary } from '@almadar-io/knowledge/server';
import { createLogger } from '@almadar/logger';

const log = createLogger('kflow:server:services:jumpBackInService');
import { getAllUserProgress } from "./userProgressService";
import { hybridCache, CACHE_TTL } from "./cacheService";
import { CACHE_KEYS } from "./cacheInvalidation";
import { listUserGraphIds } from "../utils/listUserGraphIds";
import { computeLevelCount } from "../utils/computeLevelCount";

export interface JumpBackInItem {
  id: string;
  type: "course" | "learningPath";
  title: string;
  description?: string;
  lastAccessedAt: number;
  progress?: {
    completedLessons: number;
    totalLessons: number;
    progressPercentage: number;
  };
  metadata: {
    courseId?: string;
    enrollmentId?: string;
    graphId?: string;
    seedConceptId?: string;
    conceptCount?: number;
    levelCount?: number;
  };
}

/**
 * Get "Jump Back In" items from the knowledge graph only.
 *
 * Returns the user's learning paths sorted by most recent activity
 * (determined from user progress timestamps). The legacy course
 * enrollment path has been removed — all data now comes from the
 * knowledge graph.
 */
export async function getJumpBackInItems(uid: string): Promise<JumpBackInItem[]> {
  const cacheKey = CACHE_KEYS.jumpBackIn(uid);
  const cached = await hybridCache.get<JumpBackInItem[]>(cacheKey);
  if (cached) return cached;

  try {
    const graphIds = await listUserGraphIds(uid);
    const accessLayer = new KnowledgeGraphAccessLayer();

    const [graphs, allUserProgress] = await Promise.all([
      Promise.all(
        graphIds.map(async (graphId) => {
          try {
            return await accessLayer.getGraph(uid, graphId);
          } catch {
            return null;
          }
        })
      ),
      getAllUserProgress(uid),
    ]);

    const validGraphs = graphs.filter((g): g is NonNullable<typeof g> => g !== null);
    const learningPaths = validGraphs.map((graph) => extractLearningPathSummary(graph));
    const graphById = new Map(validGraphs.map((graph) => [graph.id, graph]));

    const graphLastAccessed = new Map<string, number>();
    for (const progress of allUserProgress) {
      if (progress.graphId) {
        const current = graphLastAccessed.get(progress.graphId) || 0;
        if (progress.lastStudied > current) {
          graphLastAccessed.set(progress.graphId, progress.lastStudied);
        }
      }
    }

    const items: JumpBackInItem[] = [];
    for (const path of learningPaths) {
      const lastAccessed = graphLastAccessed.get(path.id) || path.updatedAt || path.createdAt || 0;
      items.push({
        id: path.id,
        type: "learningPath",
        title: path.title || `Learning Path ${path.id}`,
        description: path.description,
        lastAccessedAt: lastAccessed,
        metadata: {
          graphId: path.id,
          seedConceptId: path.seedConcept?.id,
          conceptCount: path.conceptCount,
          levelCount: computeLevelCount(graphById.get(path.id)),
        },
      });
    }

    items.sort((a, b) => b.lastAccessedAt - a.lastAccessedAt);
    const result = items.slice(0, 5);

    await hybridCache.set(cacheKey, result, CACHE_TTL.JUMP_BACK_IN);
    return result;
  } catch (error) {
    log.error("Error getting jump back in items", { error: error instanceof Error ? error.message : String(error) });
    return [];
  }
}
