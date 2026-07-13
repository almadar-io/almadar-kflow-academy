/**
 * Service for cascade deletion of graph-related data
 * When a graph is deleted, all dependent collections should also be cleaned up
 */

import { getFirestore } from '@almadar/server';
import { createLogger } from '@almadar/logger';

const log = createLogger('kflow:server:services:graphCascadeDeleteService');
import { getGoalsByGraphId, deleteGoal } from './goalService';
import { deletePlacementTest } from './placementTestService';

/**
 * Delete all layers for a graph (subcollection - will be auto-deleted, but we'll clean up explicitly)
 */
async function deleteGraphLayers(uid: string, graphId: string): Promise<void> {
  const db = getFirestore();
  const layersRef = db
    .collection('users')
    .doc(uid)
    .collection('graphs')
    .doc(graphId)
    .collection('layers');

  const snapshot = await layersRef.get();
  const batch = db.batch();

  snapshot.docs.forEach(doc => {
    batch.delete(doc.ref);
  });

  if (snapshot.docs.length > 0) {
    await batch.commit();
  }
}

/**
 * Delete all learning goals associated with a graph
 */
async function deleteGraphGoals(uid: string, graphId: string): Promise<void> {
  const goals = await getGoalsByGraphId(uid, graphId);
  
  // Delete each goal (which will also clean up associated placement tests)
  for (const goal of goals) {
    // Delete placement tests for this goal
    if (goal.placementTestId) {
      try {
        await deletePlacementTest(uid, goal.placementTestId);
      } catch (error) {
        log.warn('Failed to delete placement test for goal', { placementTestId: goal.placementTestId, goalId: goal.id, error: error instanceof Error ? error.message : String(error) });
      }
    }
    
    // Delete the goal itself
    try {
      await deleteGoal(uid, goal.id);
    } catch (error) {
      // Handle case where goal doesn't exist (might have been deleted already)
      if (error instanceof Error && error.message.includes('not found')) {
        log.debug('Goal already deleted or not found for graph', { goalId: goal.id, graphId });
      } else {
        log.warn('Failed to delete goal for graph', { goalId: goal.id, graphId, error: error instanceof Error ? error.message : String(error) });
      }
    }
  }
}

/**
 * Delete all placement tests associated with a graph
 * Note: Placement tests are also linked via goals, but we'll clean up any orphaned ones
 */
async function deleteGraphPlacementTests(uid: string, graphId: string): Promise<void> {
  const db = getFirestore();
  const placementTestsRef = db
    .collection('placementTests')
    .doc(uid)
    .collection('tests');

  const snapshot = await placementTestsRef
    .where('graphId', '==', graphId)
    .get();

  const batch = db.batch();
  snapshot.docs.forEach(doc => {
    batch.delete(doc.ref);
  });

  if (snapshot.docs.length > 0) {
    await batch.commit();
  }
}

/**
 * Delete user progress entries associated with a graph
 * Note: We only delete progress entries that are exclusively tied to this graph
 * Progress entries without graphId or with other graphIds are preserved
 */
async function deleteGraphUserProgress(uid: string, graphId: string): Promise<void> {
  const db = getFirestore();
  const userProgressRef = db
    .collection('users')
    .doc(uid)
    .collection('userProgress');

  const snapshot = await userProgressRef
    .where('graphId', '==', graphId)
    .get();

  const batch = db.batch();
  snapshot.docs.forEach(doc => {
    batch.delete(doc.ref);
  });

  if (snapshot.docs.length > 0) {
    await batch.commit();
  }
}

/**
 * Delete courses that reference this graph
 * Note: This is a destructive operation - published courses will be deleted
 */
async function deleteGraphCourses(graphId: string): Promise<void> {
  const db = getFirestore();
  const coursesRef = db.collection('courses');

  const snapshot = await coursesRef
    .where('graphId', '==', graphId)
    .get();

  const batch = db.batch();
  snapshot.docs.forEach(doc => {
    batch.delete(doc.ref);
  });

  if (snapshot.docs.length > 0) {
    await batch.commit();
  }
}

/**
 * Delete embeddings associated with concepts in this graph
 * Note: This requires fetching the graph first to get concept IDs
 */
async function deleteGraphEmbeddings(uid: string, graphId: string): Promise<void> {
  try {
    // Import here to avoid circular dependency
    const { getUserGraphById } = await import('./graphService');
    const graph = await getUserGraphById(uid, graphId);
    
    if (!graph || !graph.concepts) {
      return;
    }

    const db = getFirestore();
    const embeddingsRef = db.collection('embeddings');
    const conceptIds = Object.keys(graph.concepts);

    // Delete embeddings for each concept
    const batch = db.batch();
    let batchCount = 0;
    const MAX_BATCH_SIZE = 500; // Firestore batch limit

    for (const conceptId of conceptIds) {
      const embeddingDoc = embeddingsRef.doc(conceptId);
      batch.delete(embeddingDoc);
      batchCount++;

      // Commit batch if we reach the limit
      if (batchCount >= MAX_BATCH_SIZE) {
        await batch.commit();
        batchCount = 0;
      }
    }

    // Commit remaining deletions
    if (batchCount > 0) {
      await batch.commit();
    }
  } catch (error) {
    // Embeddings might not exist or might be managed by Python service
    log.warn('Failed to delete embeddings for graph', { graphId, error: error instanceof Error ? error.message : String(error) });
  }
}

/**
 * Delete path recommendations associated with a graph
 */
async function deleteGraphPathRecommendations(uid: string, graphId: string): Promise<void> {
  const db = getFirestore();
  const recommendationsRef = db
    .collection('pathRecommendations')
    .doc(uid)
    .collection('recommendations');

  // Query for recommendations that reference this graph
  // Note: This assumes recommendations have a graphId field
  const snapshot = await recommendationsRef
    .where('graphId', '==', graphId)
    .get();

  const batch = db.batch();
  snapshot.docs.forEach(doc => {
    batch.delete(doc.ref);
  });

  if (snapshot.docs.length > 0) {
    await batch.commit();
  }
}

/**
 * Delete gap analysis entries associated with a graph
 */
async function deleteGraphGapAnalysis(uid: string, graphId: string): Promise<void> {
  const db = getFirestore();
  const gapAnalysisRef = db
    .collection('gapAnalysis')
    .doc(uid)
    .collection('gaps');

  // Query for gaps that reference this graph
  const snapshot = await gapAnalysisRef
    .where('graphId', '==', graphId)
    .get();

  const batch = db.batch();
  snapshot.docs.forEach(doc => {
    batch.delete(doc.ref);
  });

  if (snapshot.docs.length > 0) {
    await batch.commit();
  }
}

/**
 * Delete feedback entries associated with a graph
 */
async function deleteGraphFeedback(uid: string, graphId: string): Promise<void> {
  const db = getFirestore();
  const feedbackRef = db
    .collection('feedback')
    .doc(uid)
    .collection('feedback');

  // Query for feedback that references this graph
  const snapshot = await feedbackRef
    .where('graphId', '==', graphId)
    .get();

  const batch = db.batch();
  snapshot.docs.forEach(doc => {
    batch.delete(doc.ref);
  });

  if (snapshot.docs.length > 0) {
    await batch.commit();
  }
}

/**
 * Perform cascade deletion of all data associated with a graph
 * This function should be called before deleting the graph itself
 * 
 * @param uid - User ID
 * @param graphId - Graph ID to delete
 * @param options - Options for cascade deletion
 */
export async function cascadeDeleteGraph(
  uid: string,
  graphId: string,
  options: {
    deleteCourses?: boolean; // Whether to delete published courses (default: false)
    deleteEmbeddings?: boolean; // Whether to delete embeddings (default: true)
    deleteUserProgress?: boolean; // Whether to delete user progress (default: true)
  } = {}
): Promise<void> {
  const {
    deleteCourses = false, // Default to false to prevent accidental course deletion
    deleteEmbeddings = true,
    deleteUserProgress = true,
  } = options;

  log.info('Starting cascade delete for graph', { graphId, uid });

  try {
    // 1. Delete layers (subcollection - will be auto-deleted, but clean up explicitly)
    try {
      await deleteGraphLayers(uid, graphId);
      log.debug('Deleted layers for graph', { graphId });
    } catch (error) {
      log.warn('Failed to delete layers for graph', { graphId, error: error instanceof Error ? error.message : String(error) });
    }

    // 2. Delete learning goals (and their associated placement tests)
    try {
      await deleteGraphGoals(uid, graphId);
      log.debug('Deleted goals for graph', { graphId });
    } catch (error) {
      log.warn('Failed to delete goals for graph', { graphId, error: error instanceof Error ? error.message : String(error) });
    }

    // 3. Delete any orphaned placement tests
    try {
      await deleteGraphPlacementTests(uid, graphId);
      log.debug('Deleted placement tests for graph', { graphId });
    } catch (error) {
      log.warn('Failed to delete placement tests for graph', { graphId, error: error instanceof Error ? error.message : String(error) });
    }

    // 4. Delete user progress (if enabled)
    if (deleteUserProgress) {
      try {
        await deleteGraphUserProgress(uid, graphId);
        log.debug('Deleted user progress for graph', { graphId });
      } catch (error) {
        log.warn('Failed to delete user progress for graph', { graphId, error: error instanceof Error ? error.message : String(error) });
      }
    }

    // 5. Delete courses (if enabled - destructive operation)
    if (deleteCourses) {
      try {
        await deleteGraphCourses(graphId);
        log.debug('Deleted courses for graph', { graphId });
      } catch (error) {
        log.warn('Failed to delete courses for graph', { graphId, error: error instanceof Error ? error.message : String(error) });
      }
    }

    // 6. Delete embeddings (if enabled)
    if (deleteEmbeddings) {
      try {
        await deleteGraphEmbeddings(uid, graphId);
        log.debug('Deleted embeddings for graph', { graphId });
      } catch (error) {
        log.warn('Failed to delete embeddings for graph', { graphId, error: error instanceof Error ? error.message : String(error) });
      }
    }

    // 7. Delete path recommendations
    try {
      await deleteGraphPathRecommendations(uid, graphId);
      log.debug('Deleted path recommendations for graph', { graphId });
    } catch (error) {
      log.warn('Failed to delete path recommendations for graph', { graphId, error: error instanceof Error ? error.message : String(error) });
    }

    // 8. Delete gap analysis
    try {
      await deleteGraphGapAnalysis(uid, graphId);
      log.debug('Deleted gap analysis for graph', { graphId });
    } catch (error) {
      log.warn('Failed to delete gap analysis for graph', { graphId, error: error instanceof Error ? error.message : String(error) });
    }

    // 9. Delete feedback
    try {
      await deleteGraphFeedback(uid, graphId);
      log.debug('Deleted feedback for graph', { graphId });
    } catch (error) {
      log.warn('Failed to delete feedback for graph', { graphId, error: error instanceof Error ? error.message : String(error) });
    }

    log.info('Completed cascade delete for graph', { graphId });
  } catch (error) {
    log.error('Error during cascade delete for graph', { graphId, error: error instanceof Error ? error.message : String(error) });
    // Don't throw - we want to continue with graph deletion even if some cleanup fails
    throw error;
  }
}

