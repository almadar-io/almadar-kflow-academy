import { getFirestore } from '../config/firebaseAdmin';

// Bloom's Taxonomy cognitive levels
export type BloomLevel = 'remember' | 'understand' | 'apply' | 'analyze' | 'evaluate' | 'create';

/**
 * UserProgress document structure
 * Stored in: users/{uid}/userProgress/{conceptId}
 */
export interface UserProgressDocument {
  conceptId: string; // Globally unique concept identifier (concept name)
  conceptName: string; // Human-readable name
  graphId?: string; // If accessed via learning path
  courseId?: string; // If accessed via course (can have multiple)
  lessonId?: string; // If accessed via lesson (can have multiple)
  masteryLevel: 0 | 1 | 2 | 3; // 0=not started, 1=learning, 2=practiced, 3=mastered
  activationResponse?: string;
  reflectionNotes?: string[];
  bloomAnswered?: Record<number, boolean>;
  bloomLevelsCompleted?: BloomLevel[];
  lastStudied: number; // timestamp
  updatedAt: number; // timestamp
  createdAt: number; // timestamp
}

/**
 * Save or update UserProgress for a concept
 */
/**
 * Sanitize a concept ID for use as a Firestore document ID
 * Firestore document IDs cannot contain "/" (path separator) or other special characters
 */
function sanitizeConceptIdForFirestore(conceptId: string): string {
  // Replace "/" with "-" and encode other special characters
  // Also replace other characters that might cause issues
  return conceptId
    .replace(/\//g, '-')  // Replace "/" with "-"
    .replace(/\\/g, '-')  // Replace "\" with "-"
    .replace(/\./g, '-')  // Replace "." with "-" (could be confused with path)
    .replace(/#/g, '-')   // Replace "#" with "-"
    .replace(/\?/g, '-')  // Replace "?" with "-"
    .replace(/\[/g, '-')  // Replace "[" with "-"
    .replace(/\]/g, '-')  // Replace "]" with "-"
    .replace(/\s+/g, '-') // Replace whitespace with "-"
    .replace(/-+/g, '-')  // Replace multiple dashes with single dash
    .replace(/^-|-$/g, ''); // Remove leading/trailing dashes
}

export async function saveUserProgress(
  uid: string,
  conceptId: string,
  progress: Partial<UserProgressDocument>
): Promise<UserProgressDocument> {
  const db = getFirestore();
  // Sanitize conceptId to ensure it's safe for Firestore document IDs
  const sanitizedConceptId = sanitizeConceptIdForFirestore(conceptId);
  const progressRef = db.collection('users').doc(uid).collection('userProgress').doc(sanitizedConceptId);
  
  const now = Date.now();
  const existingDoc = await progressRef.get();
  
  let userProgress: UserProgressDocument;
  
  if (existingDoc.exists) {
    // Merge with existing progress (preserve existing data)
    const existing = existingDoc.data() as UserProgressDocument;
      userProgress = {
        ...existing,
        ...progress,
        conceptId: sanitizedConceptId, // Store sanitized ID in document
        conceptName: progress.conceptName || existing.conceptName,
      updatedAt: now,
      // Preserve existing data if not provided
      activationResponse: progress.activationResponse ?? existing.activationResponse,
      reflectionNotes: progress.reflectionNotes ?? existing.reflectionNotes,
      bloomAnswered: progress.bloomAnswered ?? existing.bloomAnswered,
      bloomLevelsCompleted: progress.bloomLevelsCompleted ?? existing.bloomLevelsCompleted,
      lastStudied: progress.lastStudied ?? now,
    };
  } else {
    // Create new progress document
    userProgress = {
      conceptId: sanitizedConceptId, // Store sanitized ID in document
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
  // Return with original conceptId (not sanitized) for consistency
  return { ...userProgress, conceptId };
}

/**
 * Track concept access (updates lastStudied timestamp)
 * This is called when a user views a concept to update the "last accessed" time
 */
export async function trackConceptAccess(
  uid: string,
  conceptId: string,
  conceptName: string,
  graphId?: string
): Promise<void> {
  const db = getFirestore();
  // Sanitize conceptId to ensure it's safe for Firestore document IDs
  const sanitizedConceptId = sanitizeConceptIdForFirestore(conceptId);
  const userProgressRef = db.collection('users').doc(uid).collection('userProgress').doc(sanitizedConceptId);
  const now = Date.now();

  // Update or create UserProgress with lastStudied timestamp
  const existingDoc = await userProgressRef.get();
  
  if (existingDoc.exists) {
    // Update existing progress with new lastStudied
    await userProgressRef.update({
      lastStudied: now,
      updatedAt: now,
      // Update graphId if provided and not already set
      ...(graphId && !existingDoc.data()?.graphId ? { graphId } : {}),
    });
  } else {
    // Create new progress entry (minimal data for access tracking)
    await userProgressRef.set({
      conceptId: sanitizedConceptId, // Store sanitized ID in document
      conceptName,
      graphId: graphId || '',
      masteryLevel: 0,
      lastStudied: now,
      createdAt: now,
      updatedAt: now,
    });
  }
}

/**
 * Get UserProgress for a specific concept
 * @param updateLastStudied - If true, updates lastStudied timestamp when concept is accessed
 */
export async function getUserProgress(
  uid: string,
  conceptId: string,
  updateLastStudied: boolean = false,
  conceptName?: string,
  graphId?: string
): Promise<UserProgressDocument | null> {
  const db = getFirestore();
  // Sanitize conceptId to ensure it's safe for Firestore document IDs
  const sanitizedConceptId = sanitizeConceptIdForFirestore(conceptId);
  const progressDoc = await db
    .collection('users')
    .doc(uid)
    .collection('userProgress')
    .doc(sanitizedConceptId)
    .get();
  
  // If updateLastStudied is true, track the access (fire and forget)
  if (updateLastStudied) {
    trackConceptAccess(uid, sanitizedConceptId, conceptName || conceptId, graphId).catch(error => {
      console.warn('Failed to track concept access:', error);
      // Don't throw - this is a non-critical update
    });
  }
  
  if (!progressDoc.exists) {
    return null;
  }
  
  // Return with original conceptId (not sanitized) for consistency
  return { ...progressDoc.data(), conceptId } as UserProgressDocument;
}

/**
 * Get all UserProgress for a user
 */
export async function getAllUserProgress(
  uid: string
): Promise<UserProgressDocument[]> {
  const db = getFirestore();
  const snapshot = await db
    .collection('users')
    .doc(uid)
    .collection('userProgress')
    .get();
  
  return snapshot.docs.map(doc => ({
    ...doc.data(),
    conceptId: doc.id,
  })) as UserProgressDocument[];
}

/**
 * Get count of concepts mastered (masteryLevel === 3)
 */
export async function getConceptsMastered(uid: string): Promise<number> {
  const db = getFirestore();
  const snapshot = await db
    .collection('users')
    .doc(uid)
    .collection('userProgress')
    .where('masteryLevel', '==', 3)
    .get();
  
  return snapshot.size;
}

/**
 * Calculate mastery level based on progress activities and lesson completion
 */
export function calculateMasteryLevel(
  existingLevel: 0 | 1 | 2 | 3,
  isLessonCompleted: boolean,
  existingProgress?: UserProgressDocument
): 0 | 1 | 2 | 3 {
  // If lesson is completed, that's at least level 1 (learning)
  if (isLessonCompleted && existingLevel < 1) {
    return 1;
  }
  
  // If existing level is already high, keep it
  if (existingLevel >= 2) {
    return existingLevel;
  }
  
  // Calculate based on existing progress activities
  let score = 0;
  if (existingProgress?.activationResponse) score += 1;
  if (existingProgress?.reflectionNotes && existingProgress.reflectionNotes.length > 0) score += 1;
  const bloomCount = Object.keys(existingProgress?.bloomAnswered || {}).length;
  if (bloomCount > 0) score += 1;
  if (bloomCount >= 3) score += 1;
  
  // Lesson completion adds to score
  if (isLessonCompleted) score += 1;
  
  // Map score to mastery level
  if (score === 0) return 0;
  if (score === 1) return 1;
  if (score <= 3) return 2;
  return 3;
}

/**
 * Update UserProgress from lesson completion
 * Called by lessonProgressService when a lesson is completed
 */
export async function updateFromLessonCompletion(
  uid: string,
  conceptName: string,
  context: {
    courseId: string;
    lessonId: string;
    isCompleted: boolean;
  }
): Promise<UserProgressDocument> {
  // Load existing progress
  const existingProgress = await getUserProgress(uid, conceptName);
  
  // Calculate new mastery level
  const existingLevel = existingProgress?.masteryLevel || 0;
  const newMasteryLevel = calculateMasteryLevel(
    existingLevel,
    context.isCompleted,
    existingProgress || undefined
  );
  
  // Merge progress with course context
  const mergedProgress: Partial<UserProgressDocument> = {
    conceptName,
    courseId: context.courseId,
    lessonId: context.lessonId,
    masteryLevel: newMasteryLevel,
    lastStudied: Date.now(),
    // Preserve existing data
    activationResponse: existingProgress?.activationResponse,
    reflectionNotes: existingProgress?.reflectionNotes,
    bloomAnswered: existingProgress?.bloomAnswered,
    bloomLevelsCompleted: existingProgress?.bloomLevelsCompleted,
    graphId: existingProgress?.graphId,
  };
  
  return await saveUserProgress(uid, conceptName, mergedProgress);
}

