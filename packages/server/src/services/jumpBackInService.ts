import { GraphQueryService } from "./graphQueryService";
import { getAllUserProgress } from "./userProgressService";
import { hybridCache, CACHE_TTL } from "./cacheService";
import { CACHE_KEYS } from "./cacheInvalidation";

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
  if (cached) {
    return cached;
  }

  try {
    const graphQueryService = new GraphQueryService();
    const [learningPaths, allUserProgress] = await Promise.all([
      graphQueryService.getLearningPathsSummary(uid),
      getAllUserProgress(uid),
    ]);

    // Map each graphId to the most recent lastStudied timestamp
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
        },
      });
    }

    items.sort((a, b) => b.lastAccessedAt - a.lastAccessedAt);
    const result = items.slice(0, 5);

    await hybridCache.set(cacheKey, result, CACHE_TTL.JUMP_BACK_IN);
    return result;
  } catch (error) {
    console.error("Error getting jump back in items:", error);
    return [];
  }
}
