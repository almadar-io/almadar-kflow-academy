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
import { createLogger } from '@almadar/logger';

// Load environment variables from .env file
// Must be called before importing Firebase Admin or other services that depend on env vars
dotenv.config({ path: path.join(__dirname, '..', '..', '.env') });

const log = createLogger('kflow:server:scripts:migrateTitleToName');

import { getFirestore } from '@almadar/server';
import { getNodeBasedKnowledgeGraph, saveNodeBasedKnowledgeGraph } from '@almadar-io/knowledge/server';
import { propsToRecord } from '@almadar-io/knowledge';

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
        const props = propsToRecord(goalNode.properties);
        const propsTitle = typeof props.title === 'string' ? props.title : undefined;
        const propsName = typeof props.name === 'string' ? props.name : undefined;

        // Check if migration is needed
        if (propsTitle && !propsName) {
          // Copy title to name
          props.name = propsTitle;
          goalNode.properties = props as any;
          goalsMigrated++;
          graphModified = true;
          log.info(`Migrated LearningGoal ${goalId}`, { from: propsTitle, to: 'name' });
        } else if (propsTitle && propsName && propsTitle !== propsName) {
          // Both exist but different - log warning, keep name
          log.warn(`LearningGoal ${goalId} has both title and name`, { title: propsTitle, name: propsName, action: 'keeping name' });
        } else if (propsTitle && propsName && propsTitle === propsName) {
          // Both exist and same - safe to remove title later
          log.info(`LearningGoal ${goalId} has both title and name`, { value: propsTitle, note: 'Title can be removed' });
        }
      }
    }

    // Migrate Milestone nodes
    const milestoneNodeIds = graph.nodeTypes.Milestone || [];
    for (const milestoneId of milestoneNodeIds) {
      const milestoneNode = graph.nodes[milestoneId];
      if (milestoneNode && milestoneNode.type === 'Milestone') {
        const props = propsToRecord(milestoneNode.properties);
        const propsTitle = typeof props.title === 'string' ? props.title : undefined;
        const propsName = typeof props.name === 'string' ? props.name : undefined;

        // Check if migration is needed
        if (propsTitle && !propsName) {
          // Copy title to name
          props.name = propsTitle;
          milestoneNode.properties = props as any;
          milestonesMigrated++;
          graphModified = true;
          log.info(`Migrated Milestone ${milestoneId}`, { from: propsTitle, to: 'name' });
        } else if (propsTitle && propsName && propsTitle !== propsName) {
          // Both exist but different - log warning, keep name
          log.warn(`Milestone ${milestoneId} has both title and name`, { title: propsTitle, name: propsName, action: 'keeping name' });
        } else if (propsTitle && propsName && propsTitle === propsName) {
          // Both exist and same - safe to remove title later
          log.info(`Milestone ${milestoneId} has both title and name`, { value: propsTitle, note: 'Title can be removed' });
        }
      }
    }

    // Migrate Layer nodes
    const layerNodeIds = graph.nodeTypes.Layer || [];
    for (const layerId of layerNodeIds) {
      const layerNode = graph.nodes[layerId];
      if (layerNode && layerNode.type === 'Layer') {
        const mutableProps = propsToRecord(layerNode.properties);
        let layerName: string | undefined;
        const propLevelName = typeof mutableProps.levelName === 'string' ? mutableProps.levelName : undefined;
        const propName = layerNode.properties.name;
        const propGoal = layerNode.properties.goal;

        // Priority: levelName > goal > generate from layerNumber
        if (propLevelName && !propName) {
          layerName = propLevelName;
          mutableProps.name = layerName;
          layerNode.properties = mutableProps as any;
          layersMigrated++;
          graphModified = true;
          log.info(`Migrated Layer ${layerId}`, { from: propLevelName, source: 'levelName' });
        } else if (propGoal && !propName && !propLevelName) {
          layerName = propGoal;
          mutableProps.name = layerName;
          layerNode.properties = mutableProps as any;
          layersMigrated++;
          graphModified = true;
          log.info(`Migrated Layer ${layerId}`, { from: propGoal, source: 'goal' });
        } else if (!propName && !propLevelName && !propGoal && layerNode.properties.layerNumber !== undefined) {
          layerName = `Layer ${layerNode.properties.layerNumber}`;
          mutableProps.name = layerName;
          layerNode.properties = mutableProps as any;
          layersMigrated++;
          graphModified = true;
          log.info(`Migrated Layer ${layerId}`, { generatedName: layerName, source: 'layerNumber' });
        } else if (mutableProps.levelName && propName && mutableProps.levelName !== propName) {
          // Both exist but different - log warning, keep name
          log.warn(`Layer ${layerId} has both levelName and name`, { levelName: mutableProps.levelName, name: propName, action: 'keeping name' });
        }

        // Note: We don't remove levelName here - that can be done in a later phase
        // to maintain backward compatibility during transition
      }
    }

    // Save graph if modified
    if (graphModified) {
      await saveNodeBasedKnowledgeGraph(uid, graph);
      log.info(`Saved graph ${graphId}`);
    } else {
      log.info(`Graph ${graphId} already migrated`, { status: 'no changes needed' });
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

  log.info('Starting migration: Title → Name Property Unification', { uid, graph: graphId, scope: graphId ? 'single' : 'all' });

  try {
    let graphIds: string[];

    if (graphId) {
      // Migrate specific graph
      graphIds = [graphId];
    } else {
      // Migrate all graphs for user
      graphIds = await getAllGraphIds(uid);
      log.info('Found graphs to migrate', { count: graphIds.length });
    }

    // Process each graph
    for (const id of graphIds) {
      log.info(`Processing graph: ${id}`);
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
        log.error(`Error migrating graph ${id}`, { error: result.error });
      }
    }

    // Print summary
    log.info('Migration Summary', {
      graphsProcessed: stats.graphsProcessed,
      goalsMigrated: stats.goalsMigrated,
      milestonesMigrated: stats.milestonesMigrated,
      layersMigrated: stats.layersMigrated,
      errors: stats.errors.length
    });

    if (stats.errors.length > 0) {
      log.info('Migration errors:', { count: stats.errors.length });
      stats.errors.forEach(({ graphId, error }) => {
        log.error(`Error in ${graphId}`, { details: error });
      });
    }

    return stats;
  } catch (error) {
    log.error('Fatal error during migration', { error: error instanceof Error ? error.message : String(error) });
    throw error;
  }
}

// Run migration if called directly
if (require.main === module) {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    log.error('Usage: node -r ts-node/register server/src/scripts/migrateTitleToName.ts <uid> [graphId]');
    log.error('Examples:');
    log.error('  Migrate all graphs: node -r ts-node/register server/src/scripts/migrateTitleToName.ts user123');
    log.error('  Migrate specific graph: node -r ts-node/register server/src/scripts/migrateTitleToName.ts user123 graph456');
    process.exit(1);
  }

  const uid = args[0];
  const graphId = args[1];

  migrateTitleToName(uid, graphId)
    .then(() => {
      log.info('Migration completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      log.error('Migration failed', { error: error instanceof Error ? error.message : String(error) });
      process.exit(1);
    });
}

export { migrateTitleToName, migrateGraph };

