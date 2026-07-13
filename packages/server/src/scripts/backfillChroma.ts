/**
 * Backfill / seed Chroma vector index for existing NodeBased knowledge graphs.
 *
 * This populates the 'knowledge_nodes' collection so that cross-graph semantic
 * search works for:
 *   - semanticEdges on /learning-paths (Dashboard clustering / viz)
 *   - relatedConcepts in Q&A
 *   - crossGraphPriors inside generated lessons (<connect> sections)
 *
 * Why needed:
 * - New graphs/nodes are auto-embedded on create/update (via NodeMutationService
 *   and explicit upserts after explain/answer mutations).
 * - Existing graphs created before the vector layer (or before fixes) have no
 *   embeddings.
 *
 * Usage (from packages/server):
 *   # Keys loaded via the kflow .env convention (import '../config/env.js').
 *   npx tsx src/scripts/backfillChroma.ts [uid]
 *
 *   # Or:
 *   pnpm run backfill:chroma [uid]
 *
 * Default uid = 'dev-user-001'.
 * Uses dynamic import('@almadar/server') to initialize so the *same* module
 * instance is seen by @almadar-io/knowledge (prevents "not initialized" errors
 * due to pnpm module duplication).
 */

// Load env exactly like the server does (multiple .env* files from server/app/cwd roots,
// respecting command-line overrides, and FB_* -> FIREBASE_* mapping).
// This pulls CHROMA_HOST, OPENAI_API_KEY, FB_* creds etc. per the kflow convention.
import '../config/env.js';
import { createLogger } from '@almadar/logger';

// Initialize Firebase using a dynamic import with the *same specifier* that
// @almadar-io/knowledge uses internally (via getFirestoreDb / getDb).
// This ensures we initialize the exact module instance that reindexGraph etc. will see.
// Static named imports can resolve to a different copy in pnpm workspaces.
const almadarServer = await import('@almadar/server');
almadarServer.initializeFirebase();
(almadarServer.getFirestore() as any).settings({
  ignoreUndefinedProperties: true,
  databaseId: process.env.FB_DB_ID,
});

// Import knowledge *dynamically* and *after* we have initialized the server module.
// This + the auto-init safety net in @almadar/server's getApp (for dev) prevents
// "not initialized" errors caused by pnpm resolving different copies of the
// @almadar-server package (and its firebase-admin dep) for the script vs. inside knowledge.

const log = createLogger('kflow:server:scripts:backfillChroma');

async function main() {
  const uid = process.argv[2] || 'dev-user-001';
  log.info(`Chroma backfill for uid=${uid}`);

  // Dynamic import after initialization to ensure the right module instance
  const { KnowledgeGraphAccessLayer } = await import('@almadar-io/knowledge/server');
  const access = new KnowledgeGraphAccessLayer();
  const db = almadarServer.getFirestore() as any;

  const snapshot = await db
    .collection('users')
    .doc(uid)
    .collection('knowledgeGraphs')
    .select('id')
    .get();

  const graphIds = snapshot.docs.map((d) => d.id);
  log.info(`Found ${graphIds.length} graph(s) in knowledgeGraphs`);

  let totalEmbedded = 0;
  let succeeded = 0;
  let failed = 0;

  for (const graphId of graphIds) {
    try {
      log.debug(`Reindexing ${graphId} ...`);
      const result = await access.reindexGraph(uid, graphId);
      log.info(`Reindexed graph`, { graphId, embeddedNodes: result.embedded });
      totalEmbedded += result.embedded;
      succeeded++;
    } catch (err: any) {
      log.error(`Failed to reindex ${graphId}`, {
        error: err?.message || String(err),
      });
      failed++;
    }
  }

  log.info('Backfill complete', {
    graphsProcessed: succeeded,
    graphsFailed: failed,
    totalNodesEmbedded: totalEmbedded,
  });
  log.info('Reload the Dashboard (or /learning-paths) to see semanticEdges affecting graph visualization.');
}

main().catch((e) => {
  log.error('Backfill script crashed', {
    error: e instanceof Error ? e.message : String(e),
  });
  process.exit(1);
});
