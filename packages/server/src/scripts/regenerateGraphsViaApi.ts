/**
 * Script to regenerate ConceptGraphs using the same API flow as MentorGoalFormSteps
 * 
 * Usage:
 *   ts-node server/src/scripts/regenerateGraphsViaApi.ts [userId]
 * 
 * This script:
 * 1. Goes through all old graphs in the 'graphs' collection
 * 2. Extracts the seed concept name as the goal title
 * 3. Extracts the focus (from top level graph object) as the description (optional)
 * 4. Calls generateGoals API to create a learning goal
 * 5. Calls progressiveExpand once to generate 1 layer
 * 6. Saves the result to knowledgeGraphs collection (overwriting existing conversions)
 * 
 * This approach ensures the graph structure matches what MentorGoalFormSteps creates.
 */

import * as dotenv from 'dotenv';
import * as path from 'path';
import { getFirestore } from '@almadar/server';
import { createLogger } from '@almadar/logger';
import { getUserGraphs } from '../services/graphService';
import { saveNodeBasedKnowledgeGraph } from '@almadar-io/knowledge/server';
import { generateGoals } from '@almadar-io/knowledge/server';
import { progressiveExpandMultipleFromText } from '@almadar-io/knowledge/server';
import { GraphMutationService } from '@almadar-io/knowledge/server';
import type { NodeBasedKnowledgeGraph, GraphNode, NodeTypeIndex } from '../types/nodeBasedKnowledgeGraph';
import type { MutationContext } from '../types/mutations';
import type { GraphDifficulty } from '../types/concept';

const log = createLogger('kflow:server:scripts:regenerateGraphsViaApi');

interface RegenerationStats {
  totalGraphs: number;
  successfulRegenerations: number;
  failedRegenerations: number;
  totalLayers: number;
  errors: Array<{ graphId: string; userId: string; error: string }>;
}

const mutationService = new GraphMutationService();

/**
 * Delete existing knowledgeGraph if it exists
 */
async function deleteExistingKnowledgeGraph(uid: string, graphId: string): Promise<boolean> {
  const db = getFirestore();
  const kgRef = db
    .collection('users')
    .doc(uid)
    .collection('knowledgeGraphs')
    .doc(graphId);
  
  const doc = await kgRef.get();
  if (doc.exists) {
    await kgRef.delete();
    return true;
  }
  return false;
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
 * Create an empty NodeBasedKnowledgeGraph with just a seed concept
 */
function createEmptyGraphWithSeed(
  graphId: string,
  seedConceptName: string,
  seedConceptDescription: string,
  focus?: string,
  difficulty?: GraphDifficulty
): NodeBasedKnowledgeGraph {
  const seedConceptId = `concept-${graphId}-seed`;
  
  const seedNode: GraphNode = {
    id: seedConceptId,
    type: 'Concept',
    properties: {
      id: seedConceptId,
      name: seedConceptName,
      description: seedConceptDescription,
      isSeed: true,
      layer: 0,
    },
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  // Create empty node type index with all required types
  const nodeTypes: NodeTypeIndex = {
    Graph: [],
    Concept: [seedConceptId],
    Layer: [],
    LearningGoal: [],
    Milestone: [],
    PracticeExercise: [],
    Lesson: [],
    ConceptMetadata: [],
    GraphMetadata: [],
    FlashCard: [],
  };

  return {
    id: graphId,
    nodes: {
      [seedConceptId]: seedNode,
    },
    relationships: [],
    nodeTypes,
    seedConceptId: seedConceptId,
    focus: focus,
    difficulty: difficulty,
    version: 1,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}

/**
 * Create mutation context for operations
 */
function createMutationContext(
  graphId: string,
  seedConceptId: string,
  existingNodes: Record<string, GraphNode>,
  existingRelationships: any[] = []
): MutationContext {
  return {
    graphId,
    seedConceptId,
    existingNodes,
    existingRelationships,
  };
}

/**
 * Regenerate a single graph using the API flow
 */
async function regenerateGraph(
  uid: string,
  oldGraph: any
): Promise<{ layers: number }> {
  const graphId = oldGraph.id;

  log.debug(`Creating empty graph with seed concept...`);

  // Get seed concept from old graph
  const seedConceptData = oldGraph.concepts?.[oldGraph.seedConceptId];
  if (!seedConceptData) {
    throw new Error('No seed concept found in old graph');
  }

  const seedConceptName = seedConceptData.name || oldGraph.seedConceptId;
  const seedConceptDescription = seedConceptData.description || '';
  const focus = oldGraph.focus || '';
  const difficulty: GraphDifficulty = ['beginner', 'intermediate', 'advanced'].includes(oldGraph.difficulty)
    ? oldGraph.difficulty
    : 'beginner';

  // Create empty graph with seed concept
  let graph = createEmptyGraphWithSeed(
    graphId,
    seedConceptName,
    seedConceptDescription,
    focus,
    difficulty
  );

  const seedConceptId = graph.seedConceptId!;

  log.debug(`Generating learning goal (title: "${seedConceptName}")...`);
  
  // Step 1: Generate learning goal
  const mutationContext = createMutationContext(graphId, seedConceptId, graph.nodes, graph.relationships);

  const goalResult = await generateGoals({
    graph,
    mutationContext,
    anchorAnswer: seedConceptName,
    questionAnswers: [],
    manualGoal: {
      title: seedConceptName,
      description: focus || undefined,
      type: 'skill',
    },
    stream: false,
    uid,
  });

  // Check if it's a streaming response (shouldn't be since stream: false)
  if ('stream' in goalResult) {
    throw new Error('Unexpected streaming response from generateGoals');
  }

  // Apply goal mutations (use safe version to skip invalid mutations like graphId relationships)
  const goalApplyResult = mutationService.applyMutationBatchSafe(graph, goalResult.mutations);
  graph = goalApplyResult.graph;
  if (goalApplyResult.errors.length > 0) {
    log.debug(`Skipped ${goalApplyResult.errors.length} invalid mutations (expected for graphId relationships)`);
  }
  log.debug(`Learning goal created`, { milestonesCount: goalResult.content.goal.milestones?.length || 0 });

  // Step 2: Progressive expand - Layer 1
  log.debug(`Generating Layer 1...`);
  
  const expand1Context = createMutationContext(graphId, seedConceptId, graph.nodes, graph.relationships);

  const expand1Result = await progressiveExpandMultipleFromText({
    graph,
    mutationContext: expand1Context,
    numConcepts: 10,
    learningGoal: goalResult.content.goal,
    stream: false,
    uid,
  });

  if ('stream' in expand1Result) {
    throw new Error('Unexpected streaming response from progressiveExpand');
  }

  // Apply expand mutations (use safe version)
  const expandApplyResult = mutationService.applyMutationBatchSafe(graph, expand1Result.mutations);
  graph = expandApplyResult.graph;
  if (expandApplyResult.errors.length > 0) {
    log.debug(`Skipped ${expandApplyResult.errors.length} invalid mutations`);
  }
  log.debug(`Layer 1 created`, {
    levelName: expand1Result.content.levelName,
    conceptsCount: expand1Result.content.concepts.length,
  });

  // Save the regenerated graph (this will overwrite any existing knowledgeGraph)
  log.debug(`Saving regenerated graph...`);
  await saveNodeBasedKnowledgeGraph(uid, graph);

  return { layers: 1 };
}

/**
 * Regenerate graphs for a specific user
 */
async function regenerateUserGraphs(uid: string): Promise<RegenerationStats> {
  log.info(`Regenerating graphs for user: ${uid}`);

  const stats: RegenerationStats = {
    totalGraphs: 0,
    successfulRegenerations: 0,
    failedRegenerations: 0,
    totalLayers: 0,
    errors: [],
  };

  try {
    const graphs = await getUserGraphs(uid);
    stats.totalGraphs = graphs.length;
    log.info(`Found ${graphs.length} graphs to regenerate`);

    for (const graph of graphs) {
      try {
        log.info(`Regenerating graph: ${graph.id}`, { seedConceptId: graph.seedConceptId || 'unknown' });

        // Delete existing knowledgeGraph if it exists
        const deleted = await deleteExistingKnowledgeGraph(uid, graph.id);
        if (deleted) {
          log.debug(`Deleted existing knowledgeGraph`);
        }

        const result = await regenerateGraph(uid, graph);

        stats.successfulRegenerations++;
        stats.totalLayers += result.layers;

        log.info(`Regenerated successfully`, { graphId: graph.id, layers: result.layers });

        // Add a small delay between graphs to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 2000));

      } catch (error) {
        stats.failedRegenerations++;
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        stats.errors.push({
          graphId: graph.id,
          userId: uid,
          error: errorMessage,
        });
        log.error(`Failed to regenerate graph ${graph.id}`, { error: errorMessage });
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
 * Main function
 */
async function main() {
  // Load environment variables
  dotenv.config({ path: path.join(__dirname, '..', '..', '.env') });

  const userId = process.argv[2]; // Optional user ID argument

  log.info('Starting graph regeneration via API flow...');
  log.info(`Mode: ${userId ? `Single user (${userId})` : 'All users'}`);
  log.info('This script will:');
  log.info('1. Read old graphs from "graphs" collection');
  log.info('2. Call generateGoals API with seed concept name as goal title');
  log.info('3. Call progressiveExpand API once to generate 1 layer');
  log.info('4. Save results to "knowledgeGraphs" collection (overwriting existing)');

  const totalStats: RegenerationStats = {
    totalGraphs: 0,
    successfulRegenerations: 0,
    failedRegenerations: 0,
    totalLayers: 0,
    errors: [],
  };

  const numericKeys: Array<keyof Omit<RegenerationStats, 'errors'>> = [
    'totalGraphs',
    'successfulRegenerations',
    'failedRegenerations',
    'totalLayers',
  ];

  if (userId) {
    // Regenerate graphs for specific user
    const stats = await regenerateUserGraphs(userId);
    totalStats.errors.push(...stats.errors);
    for (const key of numericKeys) {
      totalStats[key] += stats[key];
    }
  } else {
    // Regenerate graphs for all users
    const userIds = await getAllUserIds();
    log.info(`Found ${userIds.length} users to process`);

    for (const uid of userIds) {
      const stats = await regenerateUserGraphs(uid);
      totalStats.errors.push(...stats.errors);
      for (const key of numericKeys) {
        totalStats[key] += stats[key];
      }
    }
  }

  // Print summary
  log.info('Regeneration Summary', {
    totalGraphsProcessed: totalStats.totalGraphs,
    successfulRegenerations: totalStats.successfulRegenerations,
    failedRegenerations: totalStats.failedRegenerations,
    totalLayersGenerated: totalStats.totalLayers,
  });

  if (totalStats.errors.length > 0) {
    log.error(`Regeneration completed with ${totalStats.errors.length} errors`);
    totalStats.errors.forEach((error, index) => {
      log.error(`Error ${index + 1}: Graph ${error.graphId} (User: ${error.userId})`, {
        error: error.error,
      });
    });
  } else {
    log.info('Regeneration completed successfully!');
  }
}

// Run the script
main().catch(error => {
  log.error('Fatal error', {
    error: error instanceof Error ? error.message : String(error),
  });
  process.exit(1);
});

