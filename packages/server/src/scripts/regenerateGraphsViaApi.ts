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
import { getFirestore } from '../config/firebaseAdmin';
import { getUserGraphs } from '../services/graphService';
import { saveNodeBasedKnowledgeGraph } from '../services/knowledgeGraphService';
import { generateGoals } from '../services/graphOperations/generateGoals';
import { progressiveExpandMultipleFromText } from '../services/graphOperations/progressiveExpandMultipleFromText';
import { GraphMutationService } from '../services/graphMutationService';
import type { NodeBasedKnowledgeGraph, GraphNode, NodeTypeIndex } from '../types/nodeBasedKnowledgeGraph';
import type { MutationContext } from '../types/mutations';
import type { GraphDifficulty } from '../types/concept';

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
      name: seedConceptName,
      description: seedConceptDescription,
      isSeed: true,
      layer: 0, // Seed concept is layer 0, generated layers start at 1
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
  
  console.log(`    Creating empty graph with seed concept...`);
  
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
  
  console.log(`    Generating learning goal (title: "${seedConceptName}")...`);
  
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
    console.log(`    Note: Skipped ${goalApplyResult.errors.length} invalid mutations (expected for graphId relationships)`);
  }
  console.log(`    ✓ Learning goal created with ${goalResult.content.goal.milestones?.length || 0} milestones`);
  
  // Step 2: Progressive expand - Layer 1
  console.log(`    Generating Layer 1...`);
  
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
    console.log(`    Note: Skipped ${expandApplyResult.errors.length} invalid mutations`);
  }
  console.log(`    ✓ Layer 1 created: "${expand1Result.content.levelName}" with ${expand1Result.content.concepts.length} concepts`);
  
  // Save the regenerated graph (this will overwrite any existing knowledgeGraph)
  console.log(`    Saving regenerated graph...`);
  await saveNodeBasedKnowledgeGraph(uid, graph);
  
  return { layers: 1 };
}

/**
 * Regenerate graphs for a specific user
 */
async function regenerateUserGraphs(uid: string): Promise<RegenerationStats> {
  console.log(`\nRegenerating graphs for user: ${uid}`);
  
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
    console.log(`  Found ${graphs.length} graphs to regenerate`);

    for (const graph of graphs) {
      try {
        console.log(`  Regenerating graph: ${graph.id} (seed: ${graph.seedConceptId || 'unknown'})`);
        
        // Delete existing knowledgeGraph if it exists
        const deleted = await deleteExistingKnowledgeGraph(uid, graph.id);
        if (deleted) {
          console.log(`    Deleted existing knowledgeGraph`);
        }
        
        const result = await regenerateGraph(uid, graph);
        
        stats.successfulRegenerations++;
        stats.totalLayers += result.layers;
        
        console.log(`    ✓ Regenerated successfully with ${result.layers} layers`);
        
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
        console.error(`    ✗ Failed to regenerate graph ${graph.id}:`, errorMessage);
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
 * Main function
 */
async function main() {
  // Load environment variables
  dotenv.config({ path: path.join(__dirname, '..', '..', '.env') });

  const userId = process.argv[2]; // Optional user ID argument

  console.log('Starting graph regeneration via API flow...');
  console.log(`Mode: ${userId ? `Single user (${userId})` : 'All users'}`);
  console.log('');
  console.log('This script will:');
  console.log('1. Read old graphs from "graphs" collection');
  console.log('2. Call generateGoals API with seed concept name as goal title');
  console.log('3. Call progressiveExpand API once to generate 1 layer');
  console.log('4. Save results to "knowledgeGraphs" collection (overwriting existing)');
  console.log('');

  const totalStats: RegenerationStats = {
    totalGraphs: 0,
    successfulRegenerations: 0,
    failedRegenerations: 0,
    totalLayers: 0,
    errors: [],
  };

  if (userId) {
    // Regenerate graphs for specific user
    const stats = await regenerateUserGraphs(userId);
    Object.keys(totalStats).forEach(key => {
      if (key === 'errors') {
        totalStats.errors.push(...stats.errors);
      } else {
        (totalStats as any)[key] += (stats as any)[key];
      }
    });
  } else {
    // Regenerate graphs for all users
    const userIds = await getAllUserIds();
    console.log(`\nFound ${userIds.length} users to process`);

    for (const uid of userIds) {
      const stats = await regenerateUserGraphs(uid);
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
  console.log('Regeneration Summary:');
  console.log('='.repeat(50));
  console.log(`Total graphs processed: ${totalStats.totalGraphs}`);
  console.log(`Successful regenerations: ${totalStats.successfulRegenerations}`);
  console.log(`Failed regenerations: ${totalStats.failedRegenerations}`);
  console.log(`Total layers generated: ${totalStats.totalLayers}`);
  
  if (totalStats.errors.length > 0) {
    console.log('\nErrors:');
    totalStats.errors.forEach((error, index) => {
      console.log(`  ${index + 1}. Graph ${error.graphId} (User: ${error.userId}): ${error.error}`);
    });
  }
  
  console.log('='.repeat(50));
  console.log('\nRegeneration completed!');
}

// Run the script
main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});

