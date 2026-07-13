/**
 * Script to convert ConceptGraphs to NodeBasedKnowledgeGraph format
 * 
 * Usage:
 *   ts-node server/src/scripts/convertGraphsToKnowledgeGraph.ts [userId]
 * 
 * If userId is provided, only converts graphs for that user.
 * If userId is not provided, converts graphs for all users.
 * 
 * This script validates that all ConceptGraphs can be successfully converted
 * to NodeBasedKnowledgeGraph format with nodes, relationships, and metadata.
 */

import * as dotenv from 'dotenv';
import * as path from 'path';
import { getFirestore } from '@almadar/server';
import { createLogger } from '@almadar/logger';
import { getUserGraphs } from '../services/graphService';
import {
  convertStoredConceptGraphToNodeBased,
  saveNodeBasedKnowledgeGraph
} from '@almadar-io/knowledge/server';
import { getGoalsByGraphId } from '../services/goalService';

const log = createLogger('kflow:server:scripts:convertGraphsToKnowledgeGraph');

interface ConversionStats {
  totalGraphs: number;
  successfulConversions: number;
  failedConversions: number;
  totalNodes: number;
  totalRelationships: number;
  layersConverted: number;
  errors: Array<{ graphId: string; userId: string; error: string }>;
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
 * Convert graphs for a specific user
 */
async function convertUserGraphs(uid: string): Promise<ConversionStats> {
  log.info(`Converting graphs for user: ${uid}`);

  const stats: ConversionStats = {
    totalGraphs: 0,
    successfulConversions: 0,
    failedConversions: 0,
    totalNodes: 0,
    totalRelationships: 0,
    layersConverted: 0,
    errors: [],
  };

  try {
    const graphs = await getUserGraphs(uid);
    stats.totalGraphs = graphs.length;
    log.info(`Found ${graphs.length} graphs to convert`);

    for (const graph of graphs) {
      try {
        log.info(`Converting graph: ${graph.id}`);

        // Fetch learning goal if available (pass full object to get milestones)
        const goals = await getGoalsByGraphId(uid, graph.id);
        const learningGoal = goals.length > 0 ? goals[0] : null;

        // Convert to NodeBasedKnowledgeGraph (pass full LearningGoal object to include milestones)
        const result = convertStoredConceptGraphToNodeBased(graph, {
          includeLessons: true,
          includeMetadata: true,
          includeFlashCards: true,
          learningGoal: learningGoal || undefined,
        });

        // Save NodeBasedKnowledgeGraph to Firestore
        await saveNodeBasedKnowledgeGraph(uid, result.nodeBasedGraph);

        // Update stats
        stats.successfulConversions++;
        stats.totalNodes += result.stats.nodesCreated;
        stats.totalRelationships += result.stats.relationshipsCreated;
        stats.layersConverted += result.stats.layersConverted;

        log.info(`Converted and saved successfully`, {
          nodesCreated: result.stats.nodesCreated,
          relationshipsCreated: result.stats.relationshipsCreated,
          layersConverted: result.stats.layersConverted,
        });
      } catch (error) {
        stats.failedConversions++;
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        stats.errors.push({
          graphId: graph.id,
          userId: uid,
          error: errorMessage,
        });
        log.error(`Failed to convert graph ${graph.id}`, { error: errorMessage });
      }
    }
  } catch (error) {
    log.error(`Error fetching graphs for user ${uid}`, {
      error: error instanceof Error ? error.message : String(error),
    });
    stats.errors.push({
      graphId: 'N/A',
      userId: uid,
      error: error instanceof Error ? error.message : 'Failed to fetch graphs',
    });
  }

  return stats;
}

/**
 * Main conversion function
 */
async function main() {
  // Load environment variables
  dotenv.config({ path: path.join(__dirname, '..', '..', '.env') });

  const userId = process.argv[2]; // Optional user ID argument

  log.info('Starting ConceptGraph to KnowledgeGraph conversion...');
  log.info(`Mode: ${userId ? `Single user (${userId})` : 'All users'}`);

  const totalStats: ConversionStats = {
    totalGraphs: 0,
    successfulConversions: 0,
    failedConversions: 0,
    totalNodes: 0,
    totalRelationships: 0,
    layersConverted: 0,
    errors: [],
  };

  if (userId) {
    // Convert graphs for specific user
    const stats = await convertUserGraphs(userId);
    const numericKeys: Array<keyof Omit<ConversionStats, 'errors'>> = [
      'totalGraphs',
      'successfulConversions',
      'failedConversions',
      'totalNodes',
      'totalRelationships',
      'layersConverted',
    ];
    totalStats.errors.push(...stats.errors);
    for (const key of numericKeys) {
      totalStats[key] += stats[key];
    }
  } else {
    // Convert graphs for all users
    const userIds = await getAllUserIds();
    log.info(`Found ${userIds.length} users to process`);

    for (const uid of userIds) {
      const stats = await convertUserGraphs(uid);
      const numericKeys: Array<keyof Omit<ConversionStats, 'errors'>> = [
        'totalGraphs',
        'successfulConversions',
        'failedConversions',
        'totalNodes',
        'totalRelationships',
        'layersConverted',
      ];
      totalStats.errors.push(...stats.errors);
      for (const key of numericKeys) {
        totalStats[key] += stats[key];
      }
    }
  }

  // Print summary
  log.info('Conversion Summary', {
    totalGraphsProcessed: totalStats.totalGraphs,
    successfulConversions: totalStats.successfulConversions,
    failedConversions: totalStats.failedConversions,
    totalNodesCreated: totalStats.totalNodes,
    totalRelationshipsCreated: totalStats.totalRelationships,
    totalLayersConverted: totalStats.layersConverted,
  });

  if (totalStats.errors.length > 0) {
    log.error(`Conversion completed with ${totalStats.errors.length} errors`);
    totalStats.errors.forEach((error, index) => {
      log.error(`  Error ${index + 1}: Graph ${error.graphId} (User: ${error.userId})`, {
        error: error.error,
      });
    });
  } else {
    log.info('Conversion completed successfully!');
  }
}

// Run the script
main().catch(error => {
  log.error('Fatal error', {
    error: error instanceof Error ? error.message : String(error),
  });
  process.exit(1);
});

