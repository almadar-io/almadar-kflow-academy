/**
 * Migration: per-user goals registry (`goals:${uid}`) → LearningGoal nodes inside their path graph.
 *
 * Goals used to be stored in a synthetic per-user "goals graph" (`goals:${uid}`) that lived in the
 * same `users/{uid}/knowledgeGraphs` collection as real learning paths — so it leaked into the
 * learning-paths / jump-back-in listings. Goals now live as `LearningGoal` nodes INSIDE their own
 * path graph (the model @almadar-io/knowledge already reads). This moves every registry goal into
 * the path graph named by its `graphId`, then deletes the registry.
 *
 * Goals whose `graphId` is empty or points at a non-existent graph are ORPHANS — they cannot be
 * placed and are reported (and, with --apply, dropped together with the registry). Review the
 * dry-run orphan list before applying.
 *
 * Targets the named database from FB_DB_ID (e.g. "kflow"). DRY-RUN by default.
 * When --apply, every user's graphs are backed up to a JSON file before any write.
 *
 * Usage (run from packages/server):
 *   npx tsx src/scripts/migrateGoalsRegistryToPathGraphs.ts <uid>            # dry-run one user
 *   npx tsx src/scripts/migrateGoalsRegistryToPathGraphs.ts <uid> --apply    # apply one user
 *   npx tsx src/scripts/migrateGoalsRegistryToPathGraphs.ts --all            # dry-run ALL users
 *   npx tsx src/scripts/migrateGoalsRegistryToPathGraphs.ts --all --apply    # apply ALL users
 */
import * as dotenv from 'dotenv';
dotenv.config();
process.env.FIREBASE_PROJECT_ID ??= process.env.FB_PROJECT_ID;
process.env.FIREBASE_CLIENT_EMAIL ??= process.env.FB_CLIENT_EMAIL;
process.env.FIREBASE_PRIVATE_KEY ??= process.env.FB_PRIVATE_KEY;

import * as fs from 'fs';
import { initializeFirebase, getFirestore } from '@almadar/server';
import { createLogger } from '@almadar/logger';
import { KnowledgeGraphAccessLayer } from '@almadar-io/knowledge/server';
import type { GraphNode, GraphNodeOf } from '@almadar-io/knowledge';
import type { DocumentData, Firestore } from 'firebase-admin/firestore';
import { invalidateLearningPaths, invalidateJumpBackIn } from '../services/cacheInvalidation';

const log = createLogger('kflow:server:scripts:migrateGoalsRegistryToPathGraphs');

const GOALS_GRAPH = (uid: string) => `goals:${uid}`;
const kgal = new KnowledgeGraphAccessLayer();

interface Stats {
  users: number;
  registries: number;
  goals: number;
  moved: number;
  orphanNoGraphId: number;
  orphanMissingGraph: number;
  registriesDeleted: number;
  failed: number;
  orphans: Array<{ uid: string; goalId: string; title: string; reason: string }>;
}
const newStats = (): Stats => ({
  users: 0, registries: 0, goals: 0, moved: 0,
  orphanNoGraphId: 0, orphanMissingGraph: 0, registriesDeleted: 0, failed: 0, orphans: [],
});

function isLearningGoalNode(node: GraphNode): node is GraphNodeOf<'LearningGoal'> {
  return node.type === 'LearningGoal';
}

async function backupUser(db: Firestore, uid: string, file: string): Promise<number> {
  const refs = await db.collection('users').doc(uid).collection('knowledgeGraphs').listDocuments();
  const out: Record<string, DocumentData> = {};
  for (const ref of refs) {
    const d = (await ref.get()).data();
    if (d) out[ref.id] = d;
  }
  fs.writeFileSync(
    file,
    JSON.stringify({ uid, db: process.env.FB_DB_ID, at: new Date().toISOString(), count: Object.keys(out).length, graphs: out })
  );
  return Object.keys(out).length;
}

async function graphExists(db: Firestore, uid: string, graphId: string): Promise<boolean> {
  const snap = await db.collection('users').doc(uid).collection('knowledgeGraphs').doc(graphId).get();
  return snap.exists;
}

async function processUser(db: Firestore, uid: string, apply: boolean, agg: Stats, verbose: boolean): Promise<void> {
  const registryId = GOALS_GRAPH(uid);
  if (!(await graphExists(db, uid, registryId))) return;
  agg.registries++;

  let goals: GraphNodeOf<'LearningGoal'>[];
  try {
    const nodes = await kgal.getNodesByType(uid, registryId, 'LearningGoal');
    goals = nodes.filter(isLearningGoalNode);
  } catch (err) {
    agg.failed++;
    log.error(`Cannot read registry ${registryId} for ${uid}`, {
      error: err instanceof Error ? err.message : String(err),
    });
    return;
  }
  agg.goals += goals.length;

  let placed = 0;
  for (const node of goals) {
    const graphId = (node.properties.customMetadata?.graphId as string | undefined) ?? '';
    const title = node.properties.name ?? '(untitled)';

    if (!graphId) {
      agg.orphanNoGraphId++;
      agg.orphans.push({ uid, goalId: node.id, title, reason: 'no graphId' });
      continue;
    }
    if (!(await graphExists(db, uid, graphId))) {
      agg.orphanMissingGraph++;
      agg.orphans.push({ uid, goalId: node.id, title, reason: `graph ${graphId} missing` });
      continue;
    }

    if (apply) {
      const existing = await kgal.getNode(uid, graphId, node.id);
      const payload = { id: node.id, type: 'LearningGoal' as const, properties: node.properties };
      if (existing) {
        await kgal.updateNode(uid, graphId, node.id, payload);
      } else {
        await kgal.createNode(uid, graphId, payload);
      }
    }
    placed++;
    agg.moved++;
    if (verbose) log.debug(`${apply ? 'Moved' : 'Would move'} goal "${title}" → graph ${graphId}`);
  }

  // Only delete the registry once every placeable goal has been moved.
  if (apply) {
    await kgal.deleteGraph(uid, registryId);
    agg.registriesDeleted++;
    // The learning-paths / jump-back-in / graphQuery caches were computed while
    // the registry still existed (and the path graphs lacked their goal node).
    await invalidateLearningPaths(uid);
    await invalidateJumpBackIn(uid);
  }
  if (verbose) {
    log.info(`Migrated ${placed}/${goals.length} goals for ${uid}`, {
      total: goals.length,
      placed,
      orphan: goals.length - placed,
      registryDeleted: apply,
    });
  }
}

async function main() {
  const args = process.argv.slice(2);
  const apply = args.includes('--apply');
  const all = args.includes('--all');
  const positional = args.filter(a => !a.startsWith('--'));
  const uidArg = positional[0];
  if (!all && !uidArg) {
    log.error('usage: <uid> [--apply]  |  --all [--apply]');
    process.exit(1);
  }

  initializeFirebase();
  const db = getFirestore();
  if (process.env.FB_DB_ID) db.settings({ ignoreUndefinedProperties: true, databaseId: process.env.FB_DB_ID });

  const uids = all
    ? (await db.collection('users').listDocuments()).map(r => r.id)
    : [uidArg];

  let backupDir = '';
  if (apply) {
    const ts = new Date().toISOString().replace(/[:.]/g, '-');
    backupDir = `/home/osamah/kflow-goals-migration-backup-${ts}`;
    fs.mkdirSync(backupDir, { recursive: true });
  }

  log.info(`${apply ? 'APPLY' : 'DRY-RUN'}`, {
    database: process.env.FB_DB_ID || '(default)',
    usersCount: uids.length,
    backupsDir: backupDir || undefined,
  });

  const agg = newStats();
  const verbose = !all;

  for (const uid of uids) {
    if (apply) await backupUser(db, uid, `${backupDir}/${uid}.json`);
    try {
      await processUser(db, uid, apply, agg, verbose);
    } catch (err) {
      agg.failed++;
      log.error(`Failed to process user ${uid}`, {
        error: err instanceof Error ? err.message : String(err),
      });
    }
    agg.users++;
  }

  log.info('Migration summary', {
    users: agg.users,
    goalsRegistriesFound: agg.registries,
    goalsInRegistries: agg.goals,
    goalsMoved: agg.moved,
    orphansNoGraphId: agg.orphanNoGraphId,
    orphansGraphMissing: agg.orphanMissingGraph,
    registriesDeleted: apply ? agg.registriesDeleted : agg.registries,
    failed: agg.failed,
  });

  if (agg.orphans.length > 0) {
    log.warn(`${agg.orphans.length} orphan goal(s) cannot be placed${apply ? ' and were dropped with their registry' : ''}`);
    for (const o of agg.orphans.slice(0, 50)) {
      log.debug(`Orphan goal: [${o.uid}] "${o.title}" (${o.goalId}) — ${o.reason}`);
    }
    if (agg.orphans.length > 50) {
      log.warn(`... and ${agg.orphans.length - 50} more orphans`);
    }
  }

  if (apply) log.info(`Backups saved to: ${backupDir}`);
  if (!apply && (agg.moved > 0 || agg.registries > 0)) {
    log.info('Re-run with --apply to write the changes.');
  }

  process.exit(0);
}

main().catch(e => {
  log.error('Fatal error', {
    error: e instanceof Error ? e.message : String(e),
  });
  process.exit(1);
});
