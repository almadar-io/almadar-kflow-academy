import { hybridCache } from "./cacheService";
import { bumpGraphVersion } from "./graphVersionService";

export const CACHE_KEYS = {
  jumpBackIn: (uid: string) => `jumpbackin:${uid}`,
  learningPaths: (uid: string) => `learningpaths:${uid}`,
  /** Cached sorted path summaries (+ per-graph concept-id sets) shared by /learning-paths and /learning-paths/list. */
  pathSummaries: (uid: string) => `pathsummaries:${uid}`,
  enrollments: (studentId: string) => `enrollments:${studentId}`,
  userProgressAll: (uid: string) => `userprogress:all:${uid}`,
  graphQuery: (uid: string, graphId?: string) =>
    graphId ? `graphQuery:*:${uid}:${graphId}` : `graphQuery:*:${uid}`,
};

export async function invalidateJumpBackIn(uid: string): Promise<void> {
  await hybridCache.delete(CACHE_KEYS.jumpBackIn(uid));
}

export async function invalidateLearningPaths(uid: string): Promise<void> {
  await hybridCache.delete(CACHE_KEYS.learningPaths(uid));
  await hybridCache.delete(CACHE_KEYS.pathSummaries(uid));
  await hybridCache.deletePattern(CACHE_KEYS.graphQuery(uid));
}

export async function invalidateEnrollments(studentId: string): Promise<void> {
  await hybridCache.delete(CACHE_KEYS.enrollments(studentId));
  await invalidateJumpBackIn(studentId);
}

export async function invalidateUserProgress(uid: string): Promise<void> {
  await hybridCache.delete(CACHE_KEYS.userProgressAll(uid));
  await invalidateJumpBackIn(uid);
}

export async function invalidateGraphCaches(uid: string, graphId: string): Promise<void> {
  await hybridCache.deletePattern(`graph:${uid}:${graphId}`);
  await hybridCache.deletePattern(`graphology:${uid}:${graphId}`);
  await hybridCache.deletePattern(CACHE_KEYS.graphQuery(uid, graphId));
  await hybridCache.delete(CACHE_KEYS.learningPaths(uid));
  await hybridCache.delete(CACHE_KEYS.pathSummaries(uid));
  await invalidateJumpBackIn(uid);
  await bumpGraphVersion(uid);
}
