/**
 * Migration: legacy ConceptGraph ({concepts, layers, relationships}) → NodeBasedKnowledgeGraph
 * ({nodes, nodeTypes, version}). Legacy graphs render as "Untitled Learning Path" because the
 * node-based loader can't read their shape — this converts them in place (reusing the canonical
 * @almadar-io/knowledge converter), preserving the real content. Also fixes new-schema graphs
 * whose LearningGoal node is named the literal placeholder "Learning Goal".
 *
 * Targets the named database from FB_DB_ID (e.g. "kflow"). DRY-RUN by default.
 * When --apply, every user's graphs are backed up to a JSON file before any write.
 *
 * Usage (run from packages/server):
 *   npx tsx src/scripts/migrateConceptGraphsToNodeBased.ts <uid> [graphId]   # dry-run one user
 *   npx tsx src/scripts/migrateConceptGraphsToNodeBased.ts <uid> --apply     # apply one user
 *   npx tsx src/scripts/migrateConceptGraphsToNodeBased.ts --all             # dry-run ALL users
 *   npx tsx src/scripts/migrateConceptGraphsToNodeBased.ts --all --apply     # apply ALL users
 */
import * as dotenv from 'dotenv';
import { createLogger } from '@almadar/logger';
dotenv.config();
process.env.FIREBASE_PROJECT_ID ??= process.env.FB_PROJECT_ID;
process.env.FIREBASE_CLIENT_EMAIL ??= process.env.FB_CLIENT_EMAIL;
process.env.FIREBASE_PRIVATE_KEY ??= process.env.FB_PRIVATE_KEY;

const logger = createLogger('kflow:server:scripts:migrateConceptGraphsToNodeBased');

import * as fs from 'fs';
import { initializeFirebase, getFirestore } from '@almadar/server';
import {
  convertStoredConceptGraphToNodeBased,
  saveNodeBasedKnowledgeGraph,
  extractLearningPathSummary,
  type StoredConceptGraph,
} from '@almadar-io/knowledge/server';
import type { NodeBasedKnowledgeGraph } from '@almadar-io/knowledge';
import type { DocumentData, Firestore } from 'firebase-admin/firestore';

type Klass = 'new' | 'legacy' | 'empty';
function classify(data: DocumentData): Klass {
  if (data.nodes && data.nodeTypes) return 'new';
  const concepts = data.concepts;
  if (concepts && Object.keys(concepts).length > 0) return 'legacy';
  return 'empty';
}

interface Stats { users: number; new: number; legacy: number; empty: number; converted: number; failed: number; titleFixed: number; emptyIds: string[]; }
const newStats = (): Stats => ({ users: 0, new: 0, legacy: 0, empty: 0, converted: 0, failed: 0, titleFixed: 0, emptyIds: [] });

async function backupUser(db: Firestore, uid: string, file: string): Promise<number> {
  const refs = await db.collection('users').doc(uid).collection('knowledgeGraphs').listDocuments();
  const out: Record<string, DocumentData> = {};
  for (const ref of refs) { const d = (await ref.get()).data(); if (d) out[ref.id] = d; }
  fs.writeFileSync(file, JSON.stringify({ uid, db: process.env.FB_DB_ID, at: new Date().toISOString(), count: Object.keys(out).length, graphs: out }));
  return Object.keys(out).length;
}

/** Migrate one user; returns per-user (converted, titleFixed). `log` controls per-graph verbosity. */
async function processUser(db: Firestore, uid: string, apply: boolean, agg: Stats, log: boolean): Promise<{ total: number; legacy: number; converted: number; titleFixed: number }> {
  const col = db.collection('users').doc(uid).collection('knowledgeGraphs');
  const refs = await col.listDocuments();
  let converted = 0, titleFixed = 0, legacy = 0;

  for (const ref of refs) {
    const data = (await ref.get()).data();
    if (!data) continue;
    const k = classify(data);
    agg[k]++;

    if (k === 'new') {
      const graph = data as NodeBasedKnowledgeGraph;
      if (extractLearningPathSummary(graph).title === 'Learning Goal') {
        const goalId = graph.nodeTypes?.LearningGoal?.[0];
        const goalNode = goalId ? graph.nodes[goalId] : undefined;
        const seedNode = graph.seedConceptId ? graph.nodes[graph.seedConceptId] : undefined;
        const seedName = seedNode?.type === 'Concept' ? seedNode.properties.name : undefined;
        if (goalNode?.type === 'LearningGoal' && seedName) {
          goalNode.properties.name = seedName;
          if (graph.name === 'Learning Goal') graph.name = seedName;
          if (log) logger.info(`TITLEFIX ${ref.id}`, { from: 'Learning Goal', to: seedName });
          if (apply) await saveNodeBasedKnowledgeGraph(uid, graph);
          agg.titleFixed++; titleFixed++;
        } else if (log) {
          logger.info(`TITLEFIX ${ref.id}`, { status: 'cannot fix (no goal node or seed name)' });
        }
      }
      continue;
    }
    if (k === 'empty') {
      agg.emptyIds.push(`${uid}/${ref.id}`);
      if (log) logger.info(`EMPTY ${ref.id}`, { seedConceptId: JSON.stringify(data.seedConceptId) });
      continue;
    }

    // legacy → convert
    try {
      const result = convertStoredConceptGraphToNodeBased(data as StoredConceptGraph);
      const title = extractLearningPathSummary(result.nodeBasedGraph).title;
      if (log) logger.info(`LEGACY ${ref.id}`, { to: title, nodesCreated: result.stats.nodesCreated });
      if (apply) await saveNodeBasedKnowledgeGraph(uid, result.nodeBasedGraph);
      agg.converted++; converted++; legacy++;
    } catch (e) {
      agg.failed++;
      logger.error(`FAIL ${uid}/${ref.id}`, { error: (e as Error).message });
    }
  }
  return { total: refs.length, legacy, converted, titleFixed };
}

async function main() {
  const args = process.argv.slice(2);
  const apply = args.includes('--apply');
  const all = args.includes('--all');
  const positional = args.filter(a => !a.startsWith('--'));
  const uidArg = positional[0];
  const onlyGraph = positional[1]; // only meaningful for a single uid; ignored in --all
  if (!all && !uidArg) { logger.error('usage: <uid> [graphId] [--apply]  |  --all [--apply]'); process.exit(1); }

  initializeFirebase();
  const db = getFirestore();
  if (process.env.FB_DB_ID) db.settings({ ignoreUndefinedProperties: true, databaseId: process.env.FB_DB_ID });

  const uids = all
    ? (await db.collection('users').listDocuments()).map(r => r.id)
    : [uidArg];

  let backupDir = '';
  if (apply) {
    const ts = new Date().toISOString().replace(/[:.]/g, '-');
    backupDir = `/home/osamah/kflow-migration-backup-${ts}`;
    fs.mkdirSync(backupDir, { recursive: true });
  }

  logger.info(apply ? 'APPLY' : 'DRY-RUN', { db: process.env.FB_DB_ID || '(default)', userCount: uids.length, backupDir });

  const agg = newStats();
  const verbose = !all; // per-graph detail only for a single user; per-user summary for --all

  for (const uid of uids) {
    if (onlyGraph && !all) {
      // single-graph mode kept for convenience (one user, one graph)
      const data = (await db.collection('users').doc(uid).collection('knowledgeGraphs').doc(onlyGraph).get()).data();
      if (!data) { logger.info(`  ${uid}/${onlyGraph}: not found`); break; }
    }
    if (apply) await backupUser(db, uid, `${backupDir}/${uid}.json`);
    const before = { c: agg.converted, t: agg.titleFixed };
    const r = await processUser(db, uid, apply, agg, verbose);
    agg.users++;
    if (all && r.total > 0) {
      logger.info(`User ${uid}`, { graphCount: r.total, legacy: r.legacy, titleFix: r.titleFixed });
    }
    void before;
  }

  logger.info('Summary', {
    users: agg.users,
    alreadyNewSchema: agg.new,
    converted: agg.converted,
    failed: agg.failed,
    titleFixed: agg.titleFixed,
    empty: agg.empty
  });
  if (apply) logger.info('Backups saved', { dir: backupDir });
  if (!apply && (agg.converted > 0 || agg.titleFixed > 0)) logger.info('Re-run with --apply to write the changes');
  process.exit(0);
}
main().catch(e => { logger.error('Fatal error', { error: e instanceof Error ? e.message : String(e) }); process.exit(1); });
