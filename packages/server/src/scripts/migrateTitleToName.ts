/**
 * Migration Script: Title to Name Property Unification
 * 
 * Migrates existing NodeBasedKnowledgeGraph data in Firestore to use
 * the unified `name` property instead of `title` or `levelName`.
 * 
 * Usage:
 *   node -r ts-node/register server/src/scripts/migrateTitleToName.ts [uid] [graphId]
 * 
 * Examples:
 *   - Migrate all graphs for a user: node -r ts-node/register server/src/scripts/migrateTitleToName.ts user123
 *   - Migrate specific graph: node -r ts-node/register server/src/scripts/migrateTitleToName.ts user123 graph456
 */

import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables from .env file
// Must be called before importing Firebase Admin or other services that depend on env vars
dotenv.config({ path: path.join(__dirname, '..', '..', '.env') });

import { getFirestore } from '../config/firebaseAdmin';
import { getNodeBasedKnowledgeGraph, saveNodeBasedKnowledgeGraph } from '../services/knowledgeGraphService';

interface MigrationStats {
  graphsProcessed: number;
  goalsMigrated: number;
  milestonesMigrated: number;
  layersMigrated: number;
  errors: Array<{ graphId: string; error: string }>;
}

/**
 * Migrate a single graph
 */
async function migrateGraph(uid: string, graphId: string): Promise<{
  goalsMigrated: number;
  milestonesMigrated: number;
  layersMigrated: number;
  success: boolean;
  error?: string;
}> {
  let goalsMigrated = 0;
  let milestonesMigrated = 0;
  let layersMigrated = 0;

  try {
    // Load graph
    const graph = await getNodeBasedKnowledgeGraph(uid, graphId);
    if (!graph) {
      return {
        goalsMigrated: 0,
        milestonesMigrated: 0,
        layersMigrated: 0,
        success: false,
        error: `Graph ${graphId} not found`,
      };
    }

    let graphModified = false;

    // Migrate LearningGoal nodes
    const goalNodeIds = graph.nodeTypes.LearningGoal || [];
    for (const goalId of goalNodeIds) {
      const goalNode = graph.nodes[goalId];
      if (goalNode && goalNode.type === 'LearningGoal') {
        const props = goalNode.properties;
        
        // Check if migration is needed
        if (props.title && !props.name) {
          // Copy title to name
          props.name = props.title;
          goalsMigrated++;
          graphModified = true;
          console.log(`  ✓ Migrated LearningGoal ${goalId}: "${props.title}" → name`);
        } else if (props.title && props.name && props.title !== props.name) {
          // Both exist but different - log warning, keep name
          console.warn(`  ⚠ LearningGoal ${goalId} has both title and name (different values). Keeping name: "${props.name}"`);
        } else if (props.title && props.name && props.title === props.name) {
          // Both exist and same - safe to remove title later
          console.log(`  ℹ LearningGoal ${goalId} has both title and name (same value). Title can be removed.`);
        }
      }
    }

    // Migrate Milestone nodes
    const milestoneNodeIds = graph.nodeTypes.Milestone || [];
    for (const milestoneId of milestoneNodeIds) {
      const milestoneNode = graph.nodes[milestoneId];
      if (milestoneNode && milestoneNode.type === 'Milestone') {
        const props = milestoneNode.properties;
        
        // Check if migration is needed
        if (props.title && !props.name) {
          // Copy title to name
          props.name = props.title;
          milestonesMigrated++;
          graphModified = true;
          console.log(`  ✓ Migrated Milestone ${milestoneId}: "${props.title}" → name`);
        } else if (props.title && props.name && props.title !== props.name) {
          // Both exist but different - log warning, keep name
          console.warn(`  ⚠ Milestone ${milestoneId} has both title and name (different values). Keeping name: "${props.name}"`);
        } else if (props.title && props.name && props.title === props.name) {
          // Both exist and same - safe to remove title later
          console.log(`  ℹ Milestone ${milestoneId} has both title and name (same value). Title can be removed.`);
        }
      }
    }

    // Migrate Layer nodes
    const layerNodeIds = graph.nodeTypes.Layer || [];
    for (const layerId of layerNodeIds) {
      const layerNode = graph.nodes[layerId];
      if (layerNode && layerNode.type === 'Layer') {
        const props = layerNode.properties;
        let layerName: string | undefined;
        
        // Priority: levelName > goal > generate from layerNumber
        if (props.levelName && !props.name) {
          layerName = props.levelName;
          props.name = layerName;
          layersMigrated++;
          graphModified = true;
          console.log(`  ✓ Migrated Layer ${layerId}: levelName "${props.levelName}" → name`);
        } else if (props.goal && !props.name && !props.levelName) {
          layerName = props.goal;
          props.name = layerName;
          layersMigrated++;
          graphModified = true;
          console.log(`  ✓ Migrated Layer ${layerId}: goal "${props.goal}" → name`);
        } else if (!props.name && !props.levelName && !props.goal && props.layerNumber !== undefined) {
          layerName = `Layer ${props.layerNumber}`;
          props.name = layerName;
          layersMigrated++;
          graphModified = true;
          console.log(`  ✓ Migrated Layer ${layerId}: generated name "${layerName}" from layerNumber`);
        } else if (props.levelName && props.name && props.levelName !== props.name) {
          // Both exist but different - log warning, keep name
          console.warn(`  ⚠ Layer ${layerId} has both levelName and name (different values). Keeping name: "${props.name}"`);
        }
        
        // Note: We don't remove levelName here - that can be done in a later phase
        // to maintain backward compatibility during transition
      }
    }

    // Save graph if modified
    if (graphModified) {
      await saveNodeBasedKnowledgeGraph(uid, graph);
      console.log(`  ✓ Saved graph ${graphId}`);
    } else {
      console.log(`  ℹ Graph ${graphId} already migrated (no changes needed)`);
    }

    return {
      goalsMigrated,
      milestonesMigrated,
      layersMigrated,
      success: true,
    };
  } catch (error) {
    return {
      goalsMigrated: 0,
      milestonesMigrated: 0,
      layersMigrated: 0,
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Get all graph IDs for a user
 */
async function getAllGraphIds(uid: string): Promise<string[]> {
  const db = getFirestore();
  const kgCollection = db
    .collection('users')
    .doc(uid)
    .collection('knowledgeGraphs');

  const snapshot = await kgCollection.select('id').get();
  return snapshot.docs.map(doc => doc.id);
}

/**
 * Main migration function
 */
async function migrateTitleToName(uid: string, graphId?: string): Promise<MigrationStats> {
  const stats: MigrationStats = {
    graphsProcessed: 0,
    goalsMigrated: 0,
    milestonesMigrated: 0,
    layersMigrated: 0,
    errors: [],
  };

  console.log(`\n🚀 Starting migration: Title → Name Property Unification`);
  console.log(`   User: ${uid}`);
  if (graphId) {
    console.log(`   Graph: ${graphId}`);
  } else {
    console.log(`   Scope: All graphs`);
  }
  console.log('');

  try {
    let graphIds: string[];

    if (graphId) {
      // Migrate specific graph
      graphIds = [graphId];
    } else {
      // Migrate all graphs for user
      graphIds = await getAllGraphIds(uid);
      console.log(`Found ${graphIds.length} graph(s) to migrate\n`);
    }

    // Process each graph
    for (const id of graphIds) {
      console.log(`Processing graph: ${id}`);
      stats.graphsProcessed++;

      const result = await migrateGraph(uid, id);

      if (result.success) {
        stats.goalsMigrated += result.goalsMigrated;
        stats.milestonesMigrated += result.milestonesMigrated;
        stats.layersMigrated += result.layersMigrated;
      } else {
        stats.errors.push({
          graphId: id,
          error: result.error || 'Unknown error',
        });
        console.error(`  ✗ Error migrating graph ${id}: ${result.error}`);
      }

      console.log('');
    }

    // Print summary
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 Migration Summary');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`Graphs processed: ${stats.graphsProcessed}`);
    console.log(`LearningGoals migrated: ${stats.goalsMigrated}`);
    console.log(`Milestones migrated: ${stats.milestonesMigrated}`);
    console.log(`Layers migrated: ${stats.layersMigrated}`);
    console.log(`Errors: ${stats.errors.length}`);
    
    if (stats.errors.length > 0) {
      console.log('\nErrors:');
      stats.errors.forEach(({ graphId, error }) => {
        console.log(`  - ${graphId}: ${error}`);
      });
    }
    
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    return stats;
  } catch (error) {
    console.error('Fatal error during migration:', error);
    throw error;
  }
}

// Run migration if called directly
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.error('Usage: node -r ts-node/register server/src/scripts/migrateTitleToName.ts <uid> [graphId]');
    console.error('Examples:');
    console.error('  Migrate all graphs: node -r ts-node/register server/src/scripts/migrateTitleToName.ts user123');
    console.error('  Migrate specific graph: node -r ts-node/register server/src/scripts/migrateTitleToName.ts user123 graph456');
    process.exit(1);
  }

  const uid = args[0];
  const graphId = args[1];

  migrateTitleToName(uid, graphId)
    .then(() => {
      console.log('✅ Migration completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Migration failed:', error);
      process.exit(1);
    });
}

export { migrateTitleToName, migrateGraph };

