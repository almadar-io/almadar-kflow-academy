import { getFirestore } from '@almadar/server';
import { hybridCache, CACHE_TTL } from "./cacheService";
import { CACHE_KEYS, invalidateUserProgress } from "./cacheInvalidation";

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

function sanitizeConceptIdForFirestore(conceptId: string): string {
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

export async function saveUserProgress(
  uid: string,
  conceptId: string,
  progress: Partial<UserProgressDocument>
): Promise<UserProgressDocument> {
  const db = getFirestore();
  const sanitizedConceptId = sanitizeConceptIdForFirestore(conceptId);
  const progressRef = db
    .collection("users")
    .doc(uid)
    .collection("userProgress")
    .doc(sanitizedConceptId);

  const now = Date.now();
  const existingDoc = await progressRef.get();

  let userProgress: UserProgressDocument;

  if (existingDoc.exists) {
    const existing = existingDoc.data() as UserProgressDocument;
    userProgress = {
      ...existing,
      ...progress,
      conceptId: sanitizedConceptId,
      conceptName: progress.conceptName || existing.conceptName,
      updatedAt: now,
      activationResponse: progress.activationResponse ?? existing.activationResponse,
      reflectionNotes: progress.reflectionNotes ?? existing.reflectionNotes,
      bloomAnswered: progress.bloomAnswered ?? existing.bloomAnswered,
      bloomLevelsCompleted: progress.bloomLevelsCompleted ?? existing.bloomLevelsCompleted,
      lastStudied: progress.lastStudied ?? now,
    };
  } else {
    userProgress = {
      conceptId: sanitizedConceptId,
      conceptName: progress.conceptName || conceptId,
      masteryLevel: progress.masteryLevel ?? 0,
      activationResponse: progress.activationResponse,
      reflectionNotes: progress.reflectionNotes,
      bloomAnswered: progress.bloomAnswered,
      bloomLevelsCompleted: progress.bloomLevelsCompleted,
      graphId: progress.graphId,
      courseId: progress.courseId,
      lessonId: progress.lessonId,
      lastStudied: progress.lastStudied ?? now,
      updatedAt: now,
      createdAt: now,
    };
  }

  await progressRef.set(userProgress);
  await invalidateUserProgress(uid);
  return { ...userProgress, conceptId };
}

export async function trackConceptAccess(
  uid: string,
  conceptId: string,
  conceptName: string,
  graphId?: string
): Promise<void> {
  const db = getFirestore();
  const sanitizedConceptId = sanitizeConceptIdForFirestore(conceptId);
  const userProgressRef = db
    .collection("users")
    .doc(uid)
    .collection("userProgress")
    .doc(sanitizedConceptId);
  const now = Date.now();

  const existingDoc = await userProgressRef.get();

  if (existingDoc.exists) {
    await userProgressRef.update({
      lastStudied: now,
      updatedAt: now,
      ...(graphId && !existingDoc.data()?.graphId ? { graphId } : {}),
    });
  } else {
    await userProgressRef.set({
      conceptId: sanitizedConceptId,
      conceptName,
      graphId: graphId || "",
      masteryLevel: 0,
      lastStudied: now,
      createdAt: now,
      updatedAt: now,
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
  const db = getFirestore();
  const sanitizedConceptId = sanitizeConceptIdForFirestore(conceptId);
  const progressDoc = await db
    .collection("users")
    .doc(uid)
    .collection("userProgress")
    .doc(sanitizedConceptId)
    .get();

  if (updateLastStudied) {
    trackConceptAccess(uid, sanitizedConceptId, conceptName || conceptId, graphId).catch((error) => {
      console.warn("Failed to track concept access:", error);
    });
  }

  if (!progressDoc.exists) {
    return null;
  }

  return { ...progressDoc.data(), conceptId } as UserProgressDocument;
}

export async function getAllUserProgress(uid: string): Promise<UserProgressDocument[]> {
  const cacheKey = CACHE_KEYS.userProgressAll(uid);
  const cached = await hybridCache.get<UserProgressDocument[]>(cacheKey);
  if (cached) {
    return cached;
  }

  const db = getFirestore();
  const snapshot = await db.collection("users").doc(uid).collection("userProgress").get();

  const result = snapshot.docs.map((doc) => ({
    ...doc.data(),
    conceptId: doc.id,
  })) as UserProgressDocument[];

  await hybridCache.set(cacheKey, result, CACHE_TTL.USER_PROGRESS);
  return result;
}

export async function getConceptsMastered(uid: string): Promise<number> {
  const db = getFirestore();
  const snapshot = await db
    .collection("users")
    .doc(uid)
    .collection("userProgress")
    .where("masteryLevel", "==", 3)
    .get();

  return snapshot.size;
}

export function calculateMasteryLevel(
  existingLevel: 0 | 1 | 2 | 3,
  isLessonCompleted: boolean,
  existingProgress?: UserProgressDocument
): 0 | 1 | 2 | 3 {
  if (isLessonCompleted && existingLevel < 1) {
    return 1;
  }

  if (existingLevel >= 2) {
    return existingLevel;
  }

  let score = 0;
  if (existingProgress?.activationResponse) score += 1;
  if (existingProgress?.reflectionNotes && existingProgress.reflectionNotes.length > 0) score += 1;
  const bloomCount = Object.keys(existingProgress?.bloomAnswered || {}).length;
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

  const existingLevel = existingProgress?.masteryLevel || 0;
  const newMasteryLevel = calculateMasteryLevel(
    existingLevel,
    context.isCompleted,
    existingProgress || undefined
  );

  const mergedProgress: Partial<UserProgressDocument> = {
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

  return await saveUserProgress(uid, conceptName, mergedProgress);
}
