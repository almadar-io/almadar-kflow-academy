/**
 * Script to clean up collections that reference non-existent graphs
 *
 * Usage:
 *   ts-node server/src/scripts/cleanupOrphanedGraphReferences.ts [userId]
 *
 * If userId is provided, only cleans up data for that user.
 * If userId is not provided, cleans up data for all users.
 */

import * as dotenv from 'dotenv';
import * as path from 'path';
import { createLogger } from '@almadar/logger';
import { getFirestore } from '@almadar/server';
import { getUserGraphs } from '../services/graphService';

const log = createLogger('kflow:server:scripts:cleanupOrphanedGraphReferences');

interface CleanupStats {
  goals: number;
  placementTests: number;
  userProgress: number;
  courses: number;
  pathRecommendations: number;
  gapAnalysis: number;
  feedback: number;
}

/**
 * Get all user IDs from Firestore
 */
async function getAllUserIds(): Promise<string[]> {
  const db = getFirestore();
  const usersSnapshot = await db.collection('users').get();
  return usersSnapshot.docs.map(doc => doc.id);
}

/**
 * Get all graph IDs for a user
 */
async function getUserGraphIds(uid: string): Promise<Set<string>> {
  try {
    const graphs = await getUserGraphs(uid);
    return new Set(graphs.map(g => g.id));
  } catch (error) {
    log.warn(`Failed to get graphs for user ${uid}`, { error: error instanceof Error ? error.message : String(error) });
    return new Set();
  }
}

/**
 * Get all graph IDs across all users
 */
async function getAllGraphIds(): Promise<Set<string>> {
  const db = getFirestore();
  const allGraphIds = new Set<string>();
  
  const usersSnapshot = await db.collection('users').get();
  for (const userDoc of usersSnapshot.docs) {
    const uid = userDoc.id;
    const userGraphIds = await getUserGraphIds(uid);
    userGraphIds.forEach(id => allGraphIds.add(id));
  }
  
  return allGraphIds;
}

/**
 * Clean up orphaned learning goals
 */
async function cleanupOrphanedGoals(uid: string, validGraphIds: Set<string>): Promise<number> {
  const db = getFirestore();
  const goalsRef = db.collection('userLearningGoals').doc(uid).collection('goals');
  const snapshot = await goalsRef.get();
  
  let deletedCount = 0;
  const batch = db.batch();
  let batchCount = 0;
  const MAX_BATCH_SIZE = 500;

  for (const doc of snapshot.docs) {
    const goal = doc.data();
    if (goal.graphId && !validGraphIds.has(goal.graphId)) {
      batch.delete(doc.ref);
      batchCount++;
      deletedCount++;

      if (batchCount >= MAX_BATCH_SIZE) {
        await batch.commit();
        batchCount = 0;
      }
    }
  }

  if (batchCount > 0) {
    await batch.commit();
  }

  return deletedCount;
}

/**
 * Clean up orphaned placement tests
 */
async function cleanupOrphanedPlacementTests(uid: string, validGraphIds: Set<string>): Promise<number> {
  const db = getFirestore();
  const placementTestsRef = db
    .collection('placementTests')
    .doc(uid)
    .collection('tests');

  const snapshot = await placementTestsRef.get();
  
  let deletedCount = 0;
  const batch = db.batch();
  let batchCount = 0;
  const MAX_BATCH_SIZE = 500;

  for (const doc of snapshot.docs) {
    const test = doc.data();
    if (test.graphId && !validGraphIds.has(test.graphId)) {
      batch.delete(doc.ref);
      batchCount++;
      deletedCount++;

      if (batchCount >= MAX_BATCH_SIZE) {
        await batch.commit();
        batchCount = 0;
      }
    }
  }

  if (batchCount > 0) {
    await batch.commit();
  }

  return deletedCount;
}

/**
 * Clean up orphaned user progress entries
 */
async function cleanupOrphanedUserProgress(uid: string, validGraphIds: Set<string>): Promise<number> {
  const db = getFirestore();
  const userProgressRef = db
    .collection('users')
    .doc(uid)
    .collection('userProgress');

  // Get all progress entries with a graphId
  const snapshot = await userProgressRef
    .where('graphId', '!=', '')
    .get();
  
  let deletedCount = 0;
  const batch = db.batch();
  let batchCount = 0;
  const MAX_BATCH_SIZE = 500;

  for (const doc of snapshot.docs) {
    const progress = doc.data();
    if (progress.graphId && !validGraphIds.has(progress.graphId)) {
      batch.delete(doc.ref);
      batchCount++;
      deletedCount++;

      if (batchCount >= MAX_BATCH_SIZE) {
        await batch.commit();
        batchCount = 0;
      }
    }
  }

  if (batchCount > 0) {
    await batch.commit();
  }

  return deletedCount;
}

/**
 * Clean up orphaned courses
 */
async function cleanupOrphanedCourses(validGraphIds: Set<string>): Promise<number> {
  const db = getFirestore();
  const coursesRef = db.collection('courses');
  const snapshot = await coursesRef.get();
  
  let deletedCount = 0;
  const batch = db.batch();
  let batchCount = 0;
  const MAX_BATCH_SIZE = 500;

  for (const doc of snapshot.docs) {
    const course = doc.data();
    if (course.graphId && !validGraphIds.has(course.graphId)) {
      batch.delete(doc.ref);
      batchCount++;
      deletedCount++;

      if (batchCount >= MAX_BATCH_SIZE) {
        await batch.commit();
        batchCount = 0;
      }
    }
  }

  if (batchCount > 0) {
    await batch.commit();
  }

  return deletedCount;
}

/**
 * Clean up orphaned path recommendations
 */
async function cleanupOrphanedPathRecommendations(uid: string, validGraphIds: Set<string>): Promise<number> {
  const db = getFirestore();
  const recommendationsRef = db
    .collection('pathRecommendations')
    .doc(uid)
    .collection('recommendations');

  const snapshot = await recommendationsRef.get();
  
  let deletedCount = 0;
  const batch = db.batch();
  let batchCount = 0;
  const MAX_BATCH_SIZE = 500;

  for (const doc of snapshot.docs) {
    const recommendation = doc.data();
    if (recommendation.graphId && !validGraphIds.has(recommendation.graphId)) {
      batch.delete(doc.ref);
      batchCount++;
      deletedCount++;

      if (batchCount >= MAX_BATCH_SIZE) {
        await batch.commit();
        batchCount = 0;
      }
    }
  }

  if (batchCount > 0) {
    await batch.commit();
  }

  return deletedCount;
}

/**
 * Clean up orphaned gap analysis entries
 */
async function cleanupOrphanedGapAnalysis(uid: string, validGraphIds: Set<string>): Promise<number> {
  const db = getFirestore();
  const gapAnalysisRef = db
    .collection('gapAnalysis')
    .doc(uid)
    .collection('gaps');

  const snapshot = await gapAnalysisRef.get();
  
  let deletedCount = 0;
  const batch = db.batch();
  let batchCount = 0;
  const MAX_BATCH_SIZE = 500;

  for (const doc of snapshot.docs) {
    const gap = doc.data();
    if (gap.graphId && !validGraphIds.has(gap.graphId)) {
      batch.delete(doc.ref);
      batchCount++;
      deletedCount++;

      if (batchCount >= MAX_BATCH_SIZE) {
        await batch.commit();
        batchCount = 0;
      }
    }
  }

  if (batchCount > 0) {
    await batch.commit();
  }

  return deletedCount;
}

/**
 * Clean up orphaned feedback entries
 */
async function cleanupOrphanedFeedback(uid: string, validGraphIds: Set<string>): Promise<number> {
  const db = getFirestore();
  const feedbackRef = db
    .collection('feedback')
    .doc(uid)
    .collection('feedback');

  const snapshot = await feedbackRef.get();
  
  let deletedCount = 0;
  const batch = db.batch();
  let batchCount = 0;
  const MAX_BATCH_SIZE = 500;

  for (const doc of snapshot.docs) {
    const feedback = doc.data();
    if (feedback.graphId && !validGraphIds.has(feedback.graphId)) {
      batch.delete(doc.ref);
      batchCount++;
      deletedCount++;

      if (batchCount >= MAX_BATCH_SIZE) {
        await batch.commit();
        batchCount = 0;
      }
    }
  }

  if (batchCount > 0) {
    await batch.commit();
  }

  return deletedCount;
}


/**
 * Clean up orphaned data for a specific user
 */
async function cleanupUserOrphanedData(uid: string): Promise<CleanupStats> {
  log.info(`Cleaning up orphaned data for user: ${uid}`);

  // Get all valid graph IDs for this user
  const validGraphIds = await getUserGraphIds(uid);
  log.info(`Found valid graphs for user`, { uid, count: validGraphIds.size });

  if (validGraphIds.size === 0) {
    log.info(`No graphs found for user, skipping cleanup`, { uid });
    return {
      goals: 0,
      placementTests: 0,
      userProgress: 0,
      courses: 0,
      pathRecommendations: 0,
      gapAnalysis: 0,
      feedback: 0,
    };
  }

  const stats: CleanupStats = {
    goals: 0,
    placementTests: 0,
    userProgress: 0,
    courses: 0,
    pathRecommendations: 0,
    gapAnalysis: 0,
    feedback: 0,
  };

  // Clean up each collection
  try {
    stats.goals = await cleanupOrphanedGoals(uid, validGraphIds);
    log.info(`Deleted orphaned goals`, { count: stats.goals });
  } catch (error) {
    log.error(`Error cleaning up goals`, { error: error instanceof Error ? error.message : String(error) });
  }

  try {
    stats.placementTests = await cleanupOrphanedPlacementTests(uid, validGraphIds);
    log.info(`Deleted orphaned placement tests`, { count: stats.placementTests });
  } catch (error) {
    log.error(`Error cleaning up placement tests`, { error: error instanceof Error ? error.message : String(error) });
  }

  try {
    stats.userProgress = await cleanupOrphanedUserProgress(uid, validGraphIds);
    log.info(`Deleted orphaned user progress entries`, { count: stats.userProgress });
  } catch (error) {
    log.error(`Error cleaning up user progress`, { error: error instanceof Error ? error.message : String(error) });
  }

  try {
    stats.pathRecommendations = await cleanupOrphanedPathRecommendations(uid, validGraphIds);
    log.info(`Deleted orphaned path recommendations`, { count: stats.pathRecommendations });
  } catch (error) {
    log.error(`Error cleaning up path recommendations`, { error: error instanceof Error ? error.message : String(error) });
  }

  try {
    stats.gapAnalysis = await cleanupOrphanedGapAnalysis(uid, validGraphIds);
    log.info(`Deleted orphaned gap analysis entries`, { count: stats.gapAnalysis });
  } catch (error) {
    log.error(`Error cleaning up gap analysis`, { error: error instanceof Error ? error.message : String(error) });
  }

  try {
    stats.feedback = await cleanupOrphanedFeedback(uid, validGraphIds);
    log.info(`Deleted orphaned feedback entries`, { count: stats.feedback });
  } catch (error) {
    log.error(`Error cleaning up feedback`, { error: error instanceof Error ? error.message : String(error) });
  }

  return stats;
}

/**
 * Clean up orphaned courses (shared across all users)
 */
async function cleanupOrphanedCoursesGlobal(): Promise<number> {
  log.info(`Cleaning up orphaned courses (global)`);

  // Get all valid graph IDs from all users
  const allGraphIds = await getAllGraphIds();
  log.info(`Found valid graphs across all users`, { count: allGraphIds.size });

  try {
    const deletedCount = await cleanupOrphanedCourses(allGraphIds);
    log.info(`Deleted orphaned courses`, { count: deletedCount });
    return deletedCount;
  } catch (error) {
    log.error(`Error cleaning up courses`, { error: error instanceof Error ? error.message : String(error) });
    return 0;
  }
}

/**
 * Main cleanup function
 */
async function main() {
  // Load environment variables
  dotenv.config({ path: path.join(__dirname, '..', '..', '.env') });

  const userId = process.argv[2]; // Optional user ID argument

  log.info('Starting orphaned graph references cleanup', { mode: userId ? `Single user (${userId})` : 'All users' });

  const totalStats: CleanupStats = {
    goals: 0,
    placementTests: 0,
    userProgress: 0,
    courses: 0,
    pathRecommendations: 0,
    gapAnalysis: 0,
    feedback: 0,
  };

  if (userId) {
    // Clean up for specific user
    const stats = await cleanupUserOrphanedData(userId);
    Object.keys(totalStats).forEach(key => {
      totalStats[key as keyof CleanupStats] += stats[key as keyof CleanupStats];
    });
  } else {
    // Clean up for all users
    const userIds = await getAllUserIds();
    log.info('Found users to process', { count: userIds.length });

    for (const uid of userIds) {
      const stats = await cleanupUserOrphanedData(uid);
      Object.keys(totalStats).forEach(key => {
        totalStats[key as keyof CleanupStats] += stats[key as keyof CleanupStats];
      });
    }

    // Clean up global collections (courses)
    totalStats.courses = await cleanupOrphanedCoursesGlobal();
  }

  // Print summary
  log.info('Cleanup Summary', {
    goalsDeleted: totalStats.goals,
    placementTestsDeleted: totalStats.placementTests,
    userProgressDeleted: totalStats.userProgress,
    coursesDeleted: totalStats.courses,
    pathRecommendationsDeleted: totalStats.pathRecommendations,
    gapAnalysisDeleted: totalStats.gapAnalysis,
    feedbackDeleted: totalStats.feedback
  });
  log.info('Cleanup completed');
}

// Run the script
main().catch(error => {
  log.error('Fatal error', { error: error instanceof Error ? error.message : String(error) });
  process.exit(1);
});

