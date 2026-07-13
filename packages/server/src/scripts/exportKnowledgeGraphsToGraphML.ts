/**
 * Script to export ConceptGraphs and KnowledgeGraphs to GraphML format
 * 
 * Usage:
 *   ts-node server/src/scripts/exportKnowledgeGraphsToGraphML.ts [userId] [outputDir]
 * 
 * Arguments:
 *   userId (optional): If provided, only exports graphs for that user
 *   outputDir (optional): Directory to save GraphML files (default: ./graphml-exports)
 * 
 * This script exports both:
 *   - ConceptGraphs: Converts from StoredConceptGraph to NodeBasedKnowledgeGraph format, then exports
 *   - KnowledgeGraphs: Exports directly from the knowledgeGraphs collection (already in NodeBasedKnowledgeGraph format)
 * 
 * Output structure:
 *   {outputDir}/{userId}/conceptGraphs/{graphId}.graphml
 *   {outputDir}/{userId}/knowledgeGraphs/{graphId}.graphml
 * 
 * GraphML files can be opened in visualization tools like Gephi, yEd, or Cytoscape.
 */

import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';
import { getFirestore } from '@almadar/server';
import { createLogger } from '@almadar/logger';
import { getUserGraphs } from '../services/graphService';
import { convertStoredConceptGraphToNodeBased } from '@almadar-io/knowledge/server';
import { exportGraphML, type GraphMLExportOptions } from '@almadar-io/knowledge/server';
import { getGoalsByGraphId } from '../services/goalService';
import type { NodeBasedKnowledgeGraph } from '../types/nodeBasedKnowledgeGraph';

const log = createLogger('kflow:server:scripts:exportKnowledgeGraphsToGraphML');

interface ExportStats {
  totalGraphs: number;
  successfulExports: number;
  failedExports: number;
  outputDirectory: string;
  errors: Array<{ graphId: string; userId: string; error: string; source?: 'conceptGraph' | 'knowledgeGraph' }>;
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
 * Ensure output directory exists
 */
function ensureOutputDirectory(outputDir: string): void {
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
    log.info(`Created output directory: ${outputDir}`);
  }
}

/**
 * Get all knowledge graphs for a user
 */
async function getUserKnowledgeGraphs(uid: string): Promise<NodeBasedKnowledgeGraph[]> {
  const db = getFirestore();
  const kgCollection = db
    .collection('users')
    .doc(uid)
    .collection('knowledgeGraphs');

  const snapshot = await kgCollection.get();
  return snapshot.docs.map(doc => doc.data() as NodeBasedKnowledgeGraph);
}

/**
 * Export ConceptGraphs for a specific user
 */
async function exportUserConceptGraphs(
  uid: string,
  outputDir: string,
  exportOptions: GraphMLExportOptions = {}
): Promise<ExportStats> {
  log.info(`Exporting ConceptGraphs for user: ${uid}`);

  const stats: ExportStats = {
    totalGraphs: 0,
    successfulExports: 0,
    failedExports: 0,
    outputDirectory: outputDir,
    errors: [],
  };

  // Create user-specific subdirectory
  const userOutputDir = path.join(outputDir, uid, 'conceptGraphs');
  ensureOutputDirectory(userOutputDir);

  try {
    const graphs = await getUserGraphs(uid);
    stats.totalGraphs = graphs.length;
    log.info(`Found ${graphs.length} ConceptGraphs to export`);

    for (const graph of graphs) {
      try {
        log.debug(`Exporting ConceptGraph: ${graph.id}`);

        // Fetch learning goal if available (pass full object to get milestones)
        const goals = await getGoalsByGraphId(uid, graph.id);
        const learningGoal = goals.length > 0 ? goals[0] : null;

        // Convert to NodeBasedKnowledgeGraph (pass full LearningGoal object to include milestones)
        const conversionResult = convertStoredConceptGraphToNodeBased(graph, {
          includeLessons: true,
          includeMetadata: true,
          includeFlashCards: true,
          learningGoal: learningGoal || undefined,
        });

        // Export to GraphML (now accepts NodeBasedKnowledgeGraph directly)
        const graphmlXml = exportGraphML(conversionResult.nodeBasedGraph, exportOptions);

        // Save to file
        const filename = `${graph.id}.graphml`;
        const filepath = path.join(userOutputDir, filename);
        fs.writeFileSync(filepath, graphmlXml, 'utf-8');

        stats.successfulExports++;
        log.info(`Exported ConceptGraph to: ${filepath}`, {
          nodesCreated: conversionResult.stats.nodesCreated,
          relationshipsCreated: conversionResult.stats.relationshipsCreated,
        });
      } catch (error) {
        stats.failedExports++;
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        stats.errors.push({
          graphId: graph.id,
          userId: uid,
          error: errorMessage,
          source: 'conceptGraph',
        });
        log.error(`Failed to export ConceptGraph ${graph.id}`, { error: errorMessage });
      }
    }
  } catch (error) {
    log.error(`Error fetching ConceptGraphs for user ${uid}`, {
      error: error instanceof Error ? error.message : String(error),
    });
    stats.errors.push({
      graphId: 'N/A',
      userId: uid,
      error: error instanceof Error ? error.message : 'Failed to fetch ConceptGraphs',
      source: 'conceptGraph',
    });
  }

  return stats;
}

/**
 * Export KnowledgeGraphs for a specific user
 */
async function exportUserKnowledgeGraphs(
  uid: string,
  outputDir: string,
  exportOptions: GraphMLExportOptions = {}
): Promise<ExportStats> {
  log.info(`Exporting KnowledgeGraphs for user: ${uid}`);

  const stats: ExportStats = {
    totalGraphs: 0,
    successfulExports: 0,
    failedExports: 0,
    outputDirectory: outputDir,
    errors: [],
  };

  // Create user-specific subdirectory
  const userOutputDir = path.join(outputDir, uid, 'knowledgeGraphs');
  ensureOutputDirectory(userOutputDir);

  try {
    const graphs = await getUserKnowledgeGraphs(uid);
    stats.totalGraphs = graphs.length;
    log.info(`Found ${graphs.length} KnowledgeGraphs to export`);

    for (const graph of graphs) {
      try {
        log.debug(`Exporting KnowledgeGraph: ${graph.id}`);

        // Export to GraphML (graph is already in NodeBasedKnowledgeGraph format)
        const graphmlXml = exportGraphML(graph, exportOptions);

        // Save to file
        const filename = `${graph.id}.graphml`;
        const filepath = path.join(userOutputDir, filename);
        fs.writeFileSync(filepath, graphmlXml, 'utf-8');

        stats.successfulExports++;
        log.info(`Exported KnowledgeGraph to: ${filepath}`, {
          nodes: Object.keys(graph.nodes || {}).length,
          relationships: graph.relationships?.length || 0,
        });
      } catch (error) {
        stats.failedExports++;
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        stats.errors.push({
          graphId: graph.id,
          userId: uid,
          error: errorMessage,
          source: 'knowledgeGraph',
        });
        log.error(`Failed to export KnowledgeGraph ${graph.id}`, { error: errorMessage });
      }
    }
  } catch (error) {
    log.error(`Error fetching KnowledgeGraphs for user ${uid}`, {
      error: error instanceof Error ? error.message : String(error),
    });
    stats.errors.push({
      graphId: 'N/A',
      userId: uid,
      error: error instanceof Error ? error.message : 'Failed to fetch KnowledgeGraphs',
      source: 'knowledgeGraph',
    });
  }

  return stats;
}

/**
 * Export all graphs (ConceptGraphs and KnowledgeGraphs) for a specific user
 */
async function exportUserGraphs(
  uid: string,
  outputDir: string,
  exportOptions: GraphMLExportOptions = {}
): Promise<ExportStats> {
  const totalStats: ExportStats = {
    totalGraphs: 0,
    successfulExports: 0,
    failedExports: 0,
    outputDirectory: outputDir,
    errors: [],
  };

  const numericKeys: Array<keyof Omit<ExportStats, 'errors' | 'outputDirectory'>> = [
    'totalGraphs',
    'successfulExports',
    'failedExports',
  ];

  // Export ConceptGraphs
  const conceptGraphStats = await exportUserConceptGraphs(uid, outputDir, exportOptions);
  totalStats.errors.push(...conceptGraphStats.errors);
  for (const key of numericKeys) {
    totalStats[key] += conceptGraphStats[key];
  }

  // Export KnowledgeGraphs
  const knowledgeGraphStats = await exportUserKnowledgeGraphs(uid, outputDir, exportOptions);
  totalStats.errors.push(...knowledgeGraphStats.errors);
  for (const key of numericKeys) {
    totalStats[key] += knowledgeGraphStats[key];
  }

  return totalStats;
}

/**
 * Main export function
 */
async function main() {
  // Load environment variables
  dotenv.config({ path: path.join(__dirname, '..', '..', '.env') });

  const userId = process.argv[2]; // Optional user ID argument
  const outputDirArg = process.argv[3]; // Optional output directory argument

  // Determine output directory
  const outputDir = outputDirArg
    ? path.resolve(outputDirArg)
    : path.join(process.cwd(), 'graphml-exports');

  log.info('Starting GraphML export (ConceptGraphs and KnowledgeGraphs)...');
  log.info(`Mode: ${userId ? `Single user (${userId})` : 'All users'}`);
  log.info(`Output directory: ${outputDir}`);
  log.info('ConceptGraphs will be exported to {outputDir}/{userId}/conceptGraphs/');
  log.info('KnowledgeGraphs will be exported to {outputDir}/{userId}/knowledgeGraphs/');

  // Ensure output directory exists
  ensureOutputDirectory(outputDir);

  const totalStats: ExportStats = {
    totalGraphs: 0,
    successfulExports: 0,
    failedExports: 0,
    outputDirectory: outputDir,
    errors: [],
  };

  // Export options (can be customized)
  const exportOptions: GraphMLExportOptions = {
    includeEmbeddings: false, // Set to true if embeddings are available
    includeMetadata: true,
    simplified: false,
  };

  const numericKeys: Array<keyof Omit<ExportStats, 'errors' | 'outputDirectory'>> = [
    'totalGraphs',
    'successfulExports',
    'failedExports',
  ];

  if (userId) {
    // Export graphs for specific user
    const stats = await exportUserGraphs(userId, outputDir, exportOptions);
    totalStats.errors.push(...stats.errors);
    for (const key of numericKeys) {
      totalStats[key] += stats[key];
    }
  } else {
    // Export graphs for all users
    const userIds = await getAllUserIds();
    log.info(`Found ${userIds.length} users to process`);

    for (const uid of userIds) {
      const stats = await exportUserGraphs(uid, outputDir, exportOptions);
      totalStats.errors.push(...stats.errors);
      for (const key of numericKeys) {
        totalStats[key] += stats[key];
      }
    }
  }

  // Print summary
  log.info('Export Summary', {
    outputDirectory: totalStats.outputDirectory,
    totalGraphsProcessed: totalStats.totalGraphs,
    successfulExports: totalStats.successfulExports,
    failedExports: totalStats.failedExports,
  });

  if (totalStats.errors.length > 0) {
    log.error(`Export completed with ${totalStats.errors.length} errors`);
    totalStats.errors.forEach((error, index) => {
      const source = error.source ? ` [${error.source}]` : '';
      log.error(`Error ${index + 1}: Graph ${error.graphId} (User: ${error.userId})${source}`, {
        error: error.error,
      });
    });
  } else {
    log.info('Export completed successfully!');
  }

  log.info(`GraphML files saved to: ${totalStats.outputDirectory}`);
  log.info('Files can be opened in Gephi, yEd, or Cytoscape for visualization.');
}

// Run the script
main().catch(error => {
  log.error('Fatal error', {
    error: error instanceof Error ? error.message : String(error),
  });
  process.exit(1);
});

