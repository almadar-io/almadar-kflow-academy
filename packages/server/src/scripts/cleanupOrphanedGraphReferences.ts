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
import { getFirestore } from '../config/firebaseAdmin';
import { getUserGraphs } from '../services/graphService';

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
    console.warn(`Failed to get graphs for user ${uid}:`, error);
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
  console.log(`\nCleaning up orphaned data for user: ${uid}`);
  
  // Get all valid graph IDs for this user
  const validGraphIds = await getUserGraphIds(uid);
  console.log(`Found ${validGraphIds.size} valid graphs for user ${uid}`);

  if (validGraphIds.size === 0) {
    console.log(`No graphs found for user ${uid}, skipping cleanup`);
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
    console.log(`  Deleted ${stats.goals} orphaned goals`);
  } catch (error) {
    console.error(`  Error cleaning up goals:`, error);
  }

  try {
    stats.placementTests = await cleanupOrphanedPlacementTests(uid, validGraphIds);
    console.log(`  Deleted ${stats.placementTests} orphaned placement tests`);
  } catch (error) {
    console.error(`  Error cleaning up placement tests:`, error);
  }

  try {
    stats.userProgress = await cleanupOrphanedUserProgress(uid, validGraphIds);
    console.log(`  Deleted ${stats.userProgress} orphaned user progress entries`);
  } catch (error) {
    console.error(`  Error cleaning up user progress:`, error);
  }

  try {
    stats.pathRecommendations = await cleanupOrphanedPathRecommendations(uid, validGraphIds);
    console.log(`  Deleted ${stats.pathRecommendations} orphaned path recommendations`);
  } catch (error) {
    console.error(`  Error cleaning up path recommendations:`, error);
  }

  try {
    stats.gapAnalysis = await cleanupOrphanedGapAnalysis(uid, validGraphIds);
    console.log(`  Deleted ${stats.gapAnalysis} orphaned gap analysis entries`);
  } catch (error) {
    console.error(`  Error cleaning up gap analysis:`, error);
  }

  try {
    stats.feedback = await cleanupOrphanedFeedback(uid, validGraphIds);
    console.log(`  Deleted ${stats.feedback} orphaned feedback entries`);
  } catch (error) {
    console.error(`  Error cleaning up feedback:`, error);
  }

  return stats;
}

/**
 * Clean up orphaned courses (shared across all users)
 */
async function cleanupOrphanedCoursesGlobal(): Promise<number> {
  console.log(`\nCleaning up orphaned courses (global)`);
  
  // Get all valid graph IDs from all users
  const allGraphIds = await getAllGraphIds();
  console.log(`Found ${allGraphIds.size} valid graphs across all users`);

  try {
    const deletedCount = await cleanupOrphanedCourses(allGraphIds);
    console.log(`  Deleted ${deletedCount} orphaned courses`);
    return deletedCount;
  } catch (error) {
    console.error(`  Error cleaning up courses:`, error);
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

  console.log('Starting orphaned graph references cleanup...');
  console.log(`Mode: ${userId ? `Single user (${userId})` : 'All users'}`);

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
    console.log(`\nFound ${userIds.length} users to process`);

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
  console.log('\n' + '='.repeat(50));
  console.log('Cleanup Summary:');
  console.log('='.repeat(50));
  console.log(`Goals deleted: ${totalStats.goals}`);
  console.log(`Placement tests deleted: ${totalStats.placementTests}`);
  console.log(`User progress entries deleted: ${totalStats.userProgress}`);
  console.log(`Courses deleted: ${totalStats.courses}`);
  console.log(`Path recommendations deleted: ${totalStats.pathRecommendations}`);
  console.log(`Gap analysis entries deleted: ${totalStats.gapAnalysis}`);
  console.log(`Feedback entries deleted: ${totalStats.feedback}`);
  console.log('='.repeat(50));
  console.log('\nCleanup completed!');
}

// Run the script
main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});

