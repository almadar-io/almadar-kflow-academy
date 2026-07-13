/**
 * Migration: per-user student registry (`student:${uid}`) → content-graph nodes + Firestore profile.
 *
 * Student data used to live in a synthetic per-user `student:${uid}` graph (in the same
 * `users/{uid}/knowledgeGraphs` collection as real learning paths, so it leaked into listings).
 * As of @almadar-io/knowledge 0.7.1 it lives where it belongs:
 *   - Enrollment / Progress / AssessmentSubmission → INSIDE the content graph they reference
 *     (keyed by `sourceGraphId`), under that graph's OWNER (the student for kflow self-paths,
 *     the mentor for nata course graphs — resolved by probing).
 *   - Student profile / Preferences / Achievements → the plain Firestore profile doc
 *     `users/{uid}/profile/student` (not a graph).
 * Then the `student:${uid}` registry graph is deleted.
 *
 * Nodes whose target graph can't be resolved (no `sourceGraphId`, or the graph exists under
 * neither the student nor the enrollment's `mentorId`) are ORPHANS — reported, and on --apply
 * dropped together with the registry. Review the dry-run orphan list before applying.
 *
 * Targets the named database from FB_DB_ID (e.g. "kflow"). DRY-RUN by default.
 * On --apply every user's graphs + profile are backed up to JSON before any write.
 *
 * Usage (run from packages/server):
 *   npx tsx src/scripts/migrateStudentRegistryToContentGraphs.ts <uid>            # dry-run one user
 *   npx tsx src/scripts/migrateStudentRegistryToContentGraphs.ts <uid> --apply    # apply one user
 *   npx tsx src/scripts/migrateStudentRegistryToContentGraphs.ts --all            # dry-run ALL users
 *   npx tsx src/scripts/migrateStudentRegistryToContentGraphs.ts --all --apply    # apply ALL users
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
import type { DocumentData, Firestore } from 'firebase-admin/firestore';
import { invalidateLearningPaths, invalidateJumpBackIn } from '../services/cacheInvalidation';

const log = createLogger('kflow:server:scripts:migrateStudentRegistryToContentGraphs');

const STUDENT_GRAPH = (uid: string) => `student:${uid}`;
const kgal = new KnowledgeGraphAccessLayer();

interface Orphan { uid: string; kind: string; nodeId: string; reason: string }
interface Stats {
  users: number;
  registries: number;
  enrollments: number; enrollmentsMoved: number;
  progress: number; progressMoved: number;
  submissions: number; submissionsMoved: number;
  profiles: number; preferences: number; achievements: number;
  registriesDeleted: number;
  failed: number;
  orphans: Orphan[];
}
const newStats = (): Stats => ({
  users: 0, registries: 0,
  enrollments: 0, enrollmentsMoved: 0,
  progress: 0, progressMoved: 0,
  submissions: 0, submissionsMoved: 0,
  profiles: 0, preferences: 0, achievements: 0,
  registriesDeleted: 0, failed: 0, orphans: [],
});

async function backupUser(db: Firestore, uid: string, file: string): Promise<void> {
  const refs = await db.collection('users').doc(uid).collection('knowledgeGraphs').listDocuments();
  const graphs: Record<string, DocumentData> = {};
  for (const ref of refs) {
    const d = (await ref.get()).data();
    if (d) graphs[ref.id] = d;
  }
  const profileSnap = await db.collection('users').doc(uid).collection('profile').doc('student').get();
  fs.writeFileSync(file, JSON.stringify({
    uid, db: process.env.FB_DB_ID, at: new Date().toISOString(),
    graphs, profile: profileSnap.data() ?? null,
  }));
}

async function graphExists(db: Firestore, uid: string, graphId: string): Promise<boolean> {
  const snap = await db.collection('users').doc(uid).collection('knowledgeGraphs').doc(graphId).get();
  return snap.exists;
}

/**
 * Where does `graphId` physically live? The student owns their own kflow path graphs; a nata
 * course graph lives under the mentor. Probe student first, then the supplied mentorId.
 */
async function resolveOwner(
  db: Firestore, studentUid: string, graphId: string | undefined, mentorId: string | undefined,
): Promise<string | null> {
  if (!graphId) return null;
  if (await graphExists(db, studentUid, graphId)) return studentUid;
  if (mentorId && await graphExists(db, mentorId, graphId)) return mentorId;
  return null;
}

async function processUser(db: Firestore, uid: string, apply: boolean, agg: Stats, verbose: boolean): Promise<void> {
  const registryId = STUDENT_GRAPH(uid);
  if (!(await graphExists(db, uid, registryId))) return;
  agg.registries++;

  // ── graph-scoped: Enrollment ────────────────────────────────────────────
  const enrollments = await kgal.getNodesByType(uid, registryId, 'Enrollment');
  agg.enrollments += enrollments.length;
  for (const node of enrollments) {
    const p = node.properties;
    const graphId = p.sourceGraphId ?? p.courseId;
    const owner = await resolveOwner(db, uid, graphId, p.mentorId);
    if (!owner || !graphId) {
      agg.orphans.push({ uid, kind: 'Enrollment', nodeId: node.id, reason: graphId ? `graph ${graphId} not found under student or mentor` : 'no sourceGraphId' });
      continue;
    }
    if (apply) await kgal.upsertEnrollment(owner, graphId, uid, p);
    agg.enrollmentsMoved++;
    if (verbose) log.debug(`${apply ? 'Moved' : 'Would move'} enrollment ${node.id} → ${owner}/${graphId}`);
  }

  // ── graph-scoped: Progress ──────────────────────────────────────────────
  const progress = await kgal.getNodesByType(uid, registryId, 'Progress');
  agg.progress += progress.length;
  for (const node of progress) {
    const p = node.properties;
    const graphId = p.graphId ?? p.sourceGraphId;
    const owner = await resolveOwner(db, uid, graphId, undefined);
    if (!owner || !graphId || !p.conceptId) {
      agg.orphans.push({ uid, kind: 'Progress', nodeId: node.id, reason: !p.conceptId ? 'no conceptId' : (graphId ? `graph ${graphId} not found under student` : 'no graphId') });
      continue;
    }
    if (apply) await kgal.upsertProgress(owner, graphId, uid, p.conceptId, p);
    agg.progressMoved++;
    if (verbose) log.debug(`${apply ? 'Moved' : 'Would move'} progress ${node.id} → ${owner}/${graphId}`);
  }

  // ── graph-scoped: AssessmentSubmission ──────────────────────────────────
  const submissions = await kgal.getNodesByType(uid, registryId, 'AssessmentSubmission');
  agg.submissions += submissions.length;
  for (const node of submissions) {
    const p = node.properties;
    const graphId = p.sourceGraphId;
    const owner = await resolveOwner(db, uid, graphId, undefined);
    if (!owner || !graphId || !p.assessmentId) {
      agg.orphans.push({ uid, kind: 'AssessmentSubmission', nodeId: node.id, reason: !p.assessmentId ? 'no assessmentId' : (graphId ? `graph ${graphId} not found under student` : 'no sourceGraphId') });
      continue;
    }
    if (apply) await kgal.recordSubmission(owner, graphId, uid, p.assessmentId, p);
    agg.submissionsMoved++;
    if (verbose) log.debug(`${apply ? 'Moved' : 'Would move'} submission ${node.id} → ${owner}/${graphId}`);
  }

  // ── global → Firestore profile doc ──────────────────────────────────────
  const students = await kgal.getNodesByType(uid, registryId, 'Student');
  for (const node of students) {
    const p = node.properties;
    if (apply) await kgal.upsertProfile(uid, { displayName: p.name, email: p.email, phone: p.phone });
    agg.profiles++;
    if (verbose) log.debug(`${apply ? 'Moved' : 'Would move'} student profile → users/${uid}/profile/student`);
  }
  const prefs = await kgal.getNodesByType(uid, registryId, 'StudentPreferences');
  for (const node of prefs) {
    const { id, createdAt, updatedAt, ...patch } = node.properties;
    if (apply) await kgal.setPreferences(uid, patch);
    agg.preferences++;
  }
  const achievements = await kgal.getNodesByType(uid, registryId, 'Achievement');
  for (const node of achievements) {
    const { id, createdAt, updatedAt, ...rec } = node.properties;
    if (apply) await kgal.awardAchievement(uid, rec);
    agg.achievements++;
  }

  // Delete the registry only after everything placeable has been moved.
  if (apply) {
    await kgal.deleteGraph(uid, registryId);
    agg.registriesDeleted++;
    await invalidateLearningPaths(uid);
    await invalidateJumpBackIn(uid);
  }
  if (verbose) {
    log.info(`Migrated enrollments, progress, and submissions for ${uid}`, {
      enrollmentsMoved: agg.enrollmentsMoved,
      enrollmentsTotal: enrollments.length,
      progressMoved: agg.progressMoved,
      progressTotal: progress.length,
      submissionsMoved: agg.submissionsMoved,
      submissionsTotal: submissions.length,
      registryDeleted: apply,
    });
  }
}

async function main() {
  const args = process.argv.slice(2);
  const apply = args.includes('--apply');
  const all = args.includes('--all');
  const uidArg = args.filter(a => !a.startsWith('--'))[0];
  if (!all && !uidArg) {
    log.error('usage: <uid> [--apply]  |  --all [--apply]');
    process.exit(1);
  }

  initializeFirebase();
  const db = getFirestore();
  if (process.env.FB_DB_ID) db.settings({ ignoreUndefinedProperties: true, databaseId: process.env.FB_DB_ID });

  const uids = all ? (await db.collection('users').listDocuments()).map(r => r.id) : [uidArg];

  let backupDir = '';
  if (apply) {
    const ts = new Date().toISOString().replace(/[:.]/g, '-');
    backupDir = `/home/osamah/kflow-student-migration-backup-${ts}`;
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
    studentRegistriesFound: agg.registries,
    enrollmentsMoved: agg.enrollmentsMoved,
    enrollmentsTotal: agg.enrollments,
    progressMoved: agg.progressMoved,
    progressTotal: agg.progress,
    submissionsMoved: agg.submissionsMoved,
    submissionsTotal: agg.submissions,
    profiles: agg.profiles,
    preferences: agg.preferences,
    achievements: agg.achievements,
    registriesDeleted: apply ? agg.registriesDeleted : agg.registries,
    failed: agg.failed,
  });

  if (agg.orphans.length > 0) {
    log.warn(`${agg.orphans.length} orphan node(s) cannot be placed${apply ? ' and were dropped with their registry' : ''}`);
    for (const o of agg.orphans.slice(0, 50)) {
      log.debug(`Orphan node: [${o.uid}] ${o.kind} ${o.nodeId} — ${o.reason}`);
    }
    if (agg.orphans.length > 50) {
      log.warn(`... and ${agg.orphans.length - 50} more orphans`);
    }
  }

  if (apply) log.info(`Backups saved to: ${backupDir}`);
  if (!apply && agg.registries > 0) {
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
