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
import { KnowledgeGraphAccessLayer } from '@almadar-io/knowledge/server';
import type { GraphNode, GraphNodeOf } from '@almadar-io/knowledge';
import type { DocumentData, Firestore } from 'firebase-admin/firestore';
import { invalidateLearningPaths, invalidateJumpBackIn } from '../services/cacheInvalidation';

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

async function processUser(db: Firestore, uid: string, apply: boolean, agg: Stats, log: boolean): Promise<void> {
  const registryId = GOALS_GRAPH(uid);
  if (!(await graphExists(db, uid, registryId))) return;
  agg.registries++;

  let goals: GraphNodeOf<'LearningGoal'>[];
  try {
    const nodes = await kgal.getNodesByType(uid, registryId, 'LearningGoal');
    goals = nodes.filter(isLearningGoalNode);
  } catch (err) {
    agg.failed++;
    console.error(`  ${uid}: cannot read registry ${registryId}:`, err instanceof Error ? err.message : err);
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
    if (log) console.log(`  ${apply ? 'moved' : 'would move'} goal "${title}" → graph ${graphId}`);
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
  if (log) {
    console.log(`  ${uid}: ${goals.length} goals — ${placed} ${apply ? 'moved' : 'movable'}, ${goals.length - placed} orphan; registry ${apply ? 'deleted' : 'would delete'}`);
  }
}

async function main() {
  const args = process.argv.slice(2);
  const apply = args.includes('--apply');
  const all = args.includes('--all');
  const positional = args.filter(a => !a.startsWith('--'));
  const uidArg = positional[0];
  if (!all && !uidArg) {
    console.error('usage: <uid> [--apply]  |  --all [--apply]');
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

  console.log(`\n${apply ? '🟢 APPLY' : '🔎 DRY-RUN'}  db=${process.env.FB_DB_ID || '(default)'}  users=${uids.length}${apply ? `  backups→ ${backupDir}` : ''}\n`);

  const agg = newStats();
  const verbose = !all;

  for (const uid of uids) {
    if (apply) await backupUser(db, uid, `${backupDir}/${uid}.json`);
    try {
      await processUser(db, uid, apply, agg, verbose);
    } catch (err) {
      agg.failed++;
      console.error(`  ${uid}: failed —`, err instanceof Error ? err.message : err);
    }
    agg.users++;
  }

  console.log(`\n━━ summary (${agg.users} users) ━━`);
  console.log(`  goals registries found: ${agg.registries}`);
  console.log(`  goals in registries: ${agg.goals}`);
  console.log(`  goals ${apply ? 'moved into path graphs' : 'movable into path graphs'}: ${agg.moved}`);
  console.log(`  orphans (no graphId): ${agg.orphanNoGraphId}`);
  console.log(`  orphans (graph missing): ${agg.orphanMissingGraph}`);
  console.log(`  registries ${apply ? 'deleted' : 'to delete'}: ${apply ? agg.registriesDeleted : agg.registries}`);
  if (agg.failed) console.log(`  failed: ${agg.failed}`);
  if (agg.orphans.length > 0) {
    console.log(`\n  ⚠️  ${agg.orphans.length} orphan goal(s) cannot be placed${apply ? ' and were dropped with their registry' : ''}:`);
    for (const o of agg.orphans.slice(0, 50)) {
      console.log(`     - [${o.uid}] "${o.title}" (${o.goalId}) — ${o.reason}`);
    }
    if (agg.orphans.length > 50) console.log(`     … and ${agg.orphans.length - 50} more`);
  }
  if (apply) console.log(`\n  backups: ${backupDir}`);
  if (!apply && (agg.moved > 0 || agg.registries > 0)) console.log(`\n  Re-run with --apply to write the changes.`);
  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
