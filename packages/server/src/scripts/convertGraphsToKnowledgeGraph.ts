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
import { getFirestore } from '../config/firebaseAdmin';
import { getUserGraphs } from '../services/graphService';
import { 
  convertStoredConceptGraphToNodeBased, 
  saveNodeBasedKnowledgeGraph 
} from '../services/knowledgeGraphService';
import { getGoalsByGraphId } from '../services/goalService';

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
  console.log(`\nConverting graphs for user: ${uid}`);
  
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
    console.log(`  Found ${graphs.length} graphs to convert`);

    for (const graph of graphs) {
      try {
        console.log(`  Converting graph: ${graph.id}`);
        
        // Fetch learning goal if available (pass full object to get milestones)
        const goals = await getGoalsByGraphId(uid, graph.id);
        const learningGoal = goals.length > 0 ? goals[0] : null;
        
        // Convert to NodeBasedKnowledgeGraph (pass full LearningGoal object to include milestones)
        const result = convertStoredConceptGraphToNodeBased(graph, {
          includeLayers: true,
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

        console.log(`    ✓ Converted and saved successfully`);
        console.log(`      - Nodes: ${result.stats.nodesCreated}`);
        console.log(`      - Relationships: ${result.stats.relationshipsCreated}`);
        console.log(`      - Layers converted: ${result.stats.layersConverted}`);
      } catch (error) {
        stats.failedConversions++;
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        stats.errors.push({
          graphId: graph.id,
          userId: uid,
          error: errorMessage,
        });
        console.error(`    ✗ Failed to convert graph ${graph.id}:`, errorMessage);
      }
    }
  } catch (error) {
    console.error(`  Error fetching graphs for user ${uid}:`, error);
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

  console.log('Starting ConceptGraph to KnowledgeGraph conversion...');
  console.log(`Mode: ${userId ? `Single user (${userId})` : 'All users'}`);

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
    Object.keys(totalStats).forEach(key => {
      if (key === 'errors') {
        totalStats.errors.push(...stats.errors);
      } else {
        (totalStats as any)[key] += (stats as any)[key];
      }
    });
  } else {
    // Convert graphs for all users
    const userIds = await getAllUserIds();
    console.log(`\nFound ${userIds.length} users to process`);

    for (const uid of userIds) {
      const stats = await convertUserGraphs(uid);
      Object.keys(totalStats).forEach(key => {
        if (key === 'errors') {
          totalStats.errors.push(...stats.errors);
        } else {
          (totalStats as any)[key] += (stats as any)[key];
        }
      });
    }
  }

  // Print summary
  console.log('\n' + '='.repeat(50));
  console.log('Conversion Summary:');
  console.log('='.repeat(50));
  console.log(`Total graphs processed: ${totalStats.totalGraphs}`);
  console.log(`Successful conversions: ${totalStats.successfulConversions}`);
  console.log(`Failed conversions: ${totalStats.failedConversions}`);
  console.log(`Total nodes created: ${totalStats.totalNodes}`);
  console.log(`Total relationships created: ${totalStats.totalRelationships}`);
  console.log(`Total layers converted: ${totalStats.layersConverted}`);
  
  if (totalStats.errors.length > 0) {
    console.log('\nErrors:');
    totalStats.errors.forEach((error, index) => {
      console.log(`  ${index + 1}. Graph ${error.graphId} (User: ${error.userId}): ${error.error}`);
    });
  }
  
  console.log('='.repeat(50));
  console.log('\nConversion completed!');
}

// Run the script
main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});

