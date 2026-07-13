import type { ProgressNodeProperties } from '@almadar-io/knowledge';
import { createLogger } from '@almadar/logger';

const log = createLogger('kflow:server:services:userProgressService');
import { hybridCache, CACHE_TTL } from "./cacheService";
import { CACHE_KEYS, invalidateUserProgress } from "./cacheInvalidation";
import { accessLayer } from "./studentDataAccess";

export type BloomLevel = "remember" | "understand" | "apply" | "analyze" | "evaluate" | "create";

export interface UserProgressDocument {
  conceptId: string;
  conceptName: string;
  graphId?: string;
  courseId?: string;
  lessonId?: string;
  masteryLevel: 0 | 1 | 2 | 3;
  activationResponse?: string;
  reflectionNotes?: string[];
  bloomAnswered?: Record<number, boolean>;
  bloomLevelsCompleted?: BloomLevel[];
  lastStudied: number;
  updatedAt: number;
  createdAt: number;
}

function sanitizeConceptId(conceptId: string): string {
  return conceptId
    .replace(/\//g, "-")
    .replace(/\\/g, "-")
    .replace(/\./g, "-")
    .replace(/#/g, "-")
    .replace(/\?/g, "-")
    .replace(/\[/g, "-")
    .replace(/\]/g, "-")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function toProgressNodeData(
  conceptId: string,
  progress: Partial<UserProgressDocument>
): Partial<ProgressNodeProperties> {
  return {
    masteryLevel: progress.masteryLevel,
    activationResponse: progress.activationResponse,
    reflectionNotes: Array.isArray(progress.reflectionNotes)
      ? progress.reflectionNotes.join('\n')
      : progress.reflectionNotes as string | undefined,
    bloomAnswered: progress.bloomAnswered
      ? Object.fromEntries(Object.entries(progress.bloomAnswered).map(([k, v]) => [k, v]))
      : undefined,
    bloomLevelsCompleted: progress.bloomLevelsCompleted as string[] | undefined,
    graphId: progress.graphId,
    courseId: progress.courseId,
    lessonId: progress.lessonId,
    lastStudied: progress.lastStudied,
    createdAt: progress.createdAt,
    updatedAt: progress.updatedAt,
  };
}

function fromProgressNode(conceptId: string, node: ProgressNodeProperties): UserProgressDocument {
  const notes = node.reflectionNotes;
  return {
    conceptId,
    conceptName: conceptId,
    graphId: node.graphId,
    courseId: node.courseId,
    lessonId: node.lessonId,
    masteryLevel: node.masteryLevel,
    activationResponse: node.activationResponse,
    reflectionNotes: notes ? notes.split('\n') : undefined,
    bloomAnswered: node.bloomAnswered as Record<number, boolean> | undefined,
    bloomLevelsCompleted: node.bloomLevelsCompleted as BloomLevel[] | undefined,
    lastStudied: node.lastStudied,
    updatedAt: node.updatedAt,
    createdAt: node.createdAt,
  };
}

export async function saveUserProgress(
  uid: string,
  conceptId: string,
  progress: Partial<UserProgressDocument>
): Promise<UserProgressDocument> {
  const sanitizedConceptId = sanitizeConceptId(conceptId);
  const now = Date.now();
  const sourceGraphId = progress.graphId;

  if (!sourceGraphId) {
    throw new Error(`saveUserProgress requires a graphId for concept ${conceptId}`);
  }

  const existing = await getProgressNode(uid, sourceGraphId, sanitizedConceptId);

  const userProgress: UserProgressDocument = existing
    ? {
        ...existing,
        ...progress,
        conceptId: sanitizedConceptId,
        conceptName: progress.conceptName ?? existing.conceptName,
        updatedAt: now,
        activationResponse: progress.activationResponse ?? existing.activationResponse,
        reflectionNotes: progress.reflectionNotes ?? existing.reflectionNotes,
        bloomAnswered: progress.bloomAnswered ?? existing.bloomAnswered,
        bloomLevelsCompleted: progress.bloomLevelsCompleted ?? existing.bloomLevelsCompleted,
        lastStudied: progress.lastStudied ?? now,
      }
    : {
        conceptId: sanitizedConceptId,
        conceptName: progress.conceptName ?? conceptId,
        masteryLevel: progress.masteryLevel ?? 0,
        activationResponse: progress.activationResponse,
        reflectionNotes: progress.reflectionNotes,
        bloomAnswered: progress.bloomAnswered,
        bloomLevelsCompleted: progress.bloomLevelsCompleted,
        graphId: sourceGraphId,
        courseId: progress.courseId,
        lessonId: progress.lessonId,
        lastStudied: progress.lastStudied ?? now,
        updatedAt: now,
        createdAt: now,
      };

  const progressData = toProgressNodeData(sanitizedConceptId, userProgress);
  progressData.graphId = sourceGraphId;
  await accessLayer.upsertProgress(uid, sourceGraphId, uid, sanitizedConceptId, progressData);
  await invalidateUserProgress(uid);
  return { ...userProgress, conceptId };
}

export async function trackConceptAccess(
  uid: string,
  conceptId: string,
  conceptName: string,
  sourceGraphId?: string
): Promise<void> {
  const sanitizedConceptId = sanitizeConceptId(conceptId);
  const now = Date.now();

  const existing = await getProgressNode(uid, sourceGraphId, sanitizedConceptId);
  const graphId = existing?.graphId ?? sourceGraphId;
  if (!graphId) return;

  if (existing) {
    await accessLayer.upsertProgress(uid, graphId, uid, sanitizedConceptId, {
      masteryLevel: existing.masteryLevel,
      lastStudied: now,
      updatedAt: now,
      graphId,
    });
  } else {
    await accessLayer.upsertProgress(uid, graphId, uid, sanitizedConceptId, {
      masteryLevel: 0,
      lastStudied: now,
      createdAt: now,
      updatedAt: now,
      graphId,
    });
  }

  await invalidateUserProgress(uid);
}

export async function getUserProgress(
  uid: string,
  conceptId: string,
  updateLastStudied: boolean = false,
  conceptName?: string,
  graphId?: string
): Promise<UserProgressDocument | null> {
  const sanitizedConceptId = sanitizeConceptId(conceptId);

  if (updateLastStudied) {
    trackConceptAccess(uid, sanitizedConceptId, conceptName ?? conceptId, graphId).catch((error) => {
      log.warn("Failed to track concept access", { error: error instanceof Error ? error.message : String(error) });
    });
  }

  const node = await getProgressNode(uid, graphId, sanitizedConceptId);
  if (!node) return null;
  return { ...node, conceptId };
}

export async function getAllUserProgress(uid: string): Promise<UserProgressDocument[]> {
  const cacheKey = CACHE_KEYS.userProgressAll(uid);
  const cached = await hybridCache.get<UserProgressDocument[]>(cacheKey);
  if (cached) return cached;

  const nodes = await accessLayer.listProgress(uid);
  const result = nodes.map((n) => fromProgressNode(n.id, n));
  await hybridCache.set(cacheKey, result, CACHE_TTL.USER_PROGRESS);
  return result;
}

export async function getConceptsMastered(uid: string): Promise<number> {
  const all = await accessLayer.listProgress(uid);
  return all.filter((p) => p.masteryLevel === 3).length;
}

export function calculateMasteryLevel(
  existingLevel: 0 | 1 | 2 | 3,
  isLessonCompleted: boolean,
  existingProgress?: UserProgressDocument
): 0 | 1 | 2 | 3 {
  if (isLessonCompleted && existingLevel < 1) return 1;
  if (existingLevel >= 2) return existingLevel;

  let score = 0;
  if (existingProgress?.activationResponse) score += 1;
  if (existingProgress?.reflectionNotes && existingProgress.reflectionNotes.length > 0) score += 1;
  const bloomCount = Object.keys(existingProgress?.bloomAnswered ?? {}).length;
  if (bloomCount > 0) score += 1;
  if (bloomCount >= 3) score += 1;
  if (isLessonCompleted) score += 1;

  if (score === 0) return 0;
  if (score === 1) return 1;
  if (score <= 3) return 2;
  return 3;
}

export async function updateFromLessonCompletion(
  uid: string,
  conceptName: string,
  context: {
    courseId: string;
    lessonId: string;
    isCompleted: boolean;
  }
): Promise<UserProgressDocument> {
  const existingProgress = await getUserProgress(uid, conceptName);

  const existingLevel = existingProgress?.masteryLevel ?? 0;
  const newMasteryLevel = calculateMasteryLevel(
    existingLevel,
    context.isCompleted,
    existingProgress ?? undefined
  );

  const merged: Partial<UserProgressDocument> = {
    conceptName,
    courseId: context.courseId,
    lessonId: context.lessonId,
    masteryLevel: newMasteryLevel,
    lastStudied: Date.now(),
    activationResponse: existingProgress?.activationResponse,
    reflectionNotes: existingProgress?.reflectionNotes,
    bloomAnswered: existingProgress?.bloomAnswered,
    bloomLevelsCompleted: existingProgress?.bloomLevelsCompleted,
    graphId: existingProgress?.graphId,
  };

  return saveUserProgress(uid, conceptName, merged);
}

async function getProgressNode(
  uid: string,
  graphId: string | undefined,
  conceptId: string
): Promise<UserProgressDocument | null> {
  if (graphId) {
    const node = await accessLayer.getProgressForConcept(uid, graphId, uid, conceptId);
    if (!node) return null;
    return fromProgressNode(conceptId, node);
  }
  const all = await accessLayer.listProgress(uid);
  const match = all.find((n) => n.id === conceptId);
  if (!match) return null;
  return fromProgressNode(conceptId, match);
}
