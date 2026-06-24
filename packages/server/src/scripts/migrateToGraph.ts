/**
 * Migration script: Firestore domain collections → @almadar-io/knowledge graph nodes
 *
 * Reads from the OLD Firestore collections (userProgress, enrollments, goals,
 * placementTests, achievements, preferences) and writes them into the graph via
 * the StudentDataService helpers from @almadar-io/knowledge >=0.2.1.
 *
 * This script is IDEMPOTENT: re-running it is safe — it upserts, never duplicates.
 *
 * DO NOT EXECUTE — coordinator runs this with live Firestore credentials.
 *
 * Usage:
 *   npx tsx src/scripts/migrateToGraph.ts [uid]   # migrate single user
 *   npx tsx src/scripts/migrateToGraph.ts          # migrate all users
 */

import * as dotenv from 'dotenv';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import { getFirestore } from '@almadar/server';
import {
  migrateUserProgressDoc,
  migrateEnrollmentDoc,
  migrateSubmissionDoc,
  migrateAchievementDoc,
  migratePreferencesDoc,
  KnowledgeGraphAccessLayer,
} from '@almadar-io/knowledge/server';

const accessLayer = new KnowledgeGraphAccessLayer();

async function migrateUser(uid: string, sourceGraphId: string): Promise<void> {
  const db = getFirestore();
  console.log(`\n--- Migrating user ${uid} (source graph ${sourceGraphId}) ---`);

  // 1. userProgress
  const progressSnap = await db.collection('users').doc(uid).collection('userProgress').get();
  for (const doc of progressSnap.docs) {
    const { nodes } = migrateUserProgressDoc(doc.data(), uid);
    for (const node of nodes) {
      await accessLayer.upsertProgress(uid, sourceGraphId, uid, doc.id, { ...node.properties, graphId: sourceGraphId || undefined });
    }
  }
  console.log(`  ✓ Progress: ${progressSnap.size} records`);

  // 2. enrollments (collectionGroup)
  const enrollmentsSnap = await db
    .collectionGroup('enrollments')
    .where('studentId', '==', uid)
    .get();
  for (const doc of enrollmentsSnap.docs) {
    const { nodes } = migrateEnrollmentDoc(doc.data(), uid);
    for (const node of nodes) {
      await accessLayer.upsertEnrollment(uid, sourceGraphId, uid, { ...node.properties, sourceGraphId: sourceGraphId || undefined });
    }
  }
  console.log(`  ✓ Enrollments: ${enrollmentsSnap.size} records`);

  // 3. placement tests (placementTests/{uid}/tests)
  const testsSnap = await db.collection('placementTests').doc(uid).collection('tests').get();
  for (const doc of testsSnap.docs) {
    const { nodes } = migrateSubmissionDoc(doc.data(), uid);
    for (const node of nodes) {
      await accessLayer.recordSubmission(uid, sourceGraphId, uid, doc.id, {
        answers: node.properties.answers,
        score: node.properties.score,
        maxScore: node.properties.maxScore,
        percentage: node.properties.percentage,
        passed: node.properties.passed,
        attempts: node.properties.attempts,
        submittedAt: node.properties.submittedAt,
        sourceGraphId: sourceGraphId || undefined,
      });
    }
  }
  console.log(`  ✓ Placement tests: ${testsSnap.size} records`);

  // 4. achievements (users/{uid}/achievements)
  const achievementsSnap = await db.collection('users').doc(uid).collection('achievements').get();
  for (const doc of achievementsSnap.docs) {
    const { nodes } = migrateAchievementDoc(doc.data(), uid);
    for (const node of nodes) {
      await accessLayer.awardAchievement(uid, {
        achievementType: node.properties.achievementType,
        name: node.properties.name,
        description: node.properties.description,
        icon: node.properties.icon,
        unlockedAt: node.properties.unlockedAt,
        progress: node.properties.progress,
      });
    }
  }
  console.log(`  ✓ Achievements: ${achievementsSnap.size} records`);

  // 5. preferences (users/{uid}/preferences/settings)
  const prefsDoc = await db.collection('users').doc(uid).collection('preferences').doc('settings').get();
  if (prefsDoc.exists) {
    const { nodes } = migratePreferencesDoc(prefsDoc.data()!, uid);
    for (const node of nodes) {
      await accessLayer.setPreferences(uid, {
        dailyLessonGoal: node.properties.dailyLessonGoal,
        learningStyle: node.properties.learningStyle,
        timePerWeek: node.properties.timePerWeek,
        interests: node.properties.interests,
        dailyGoalStartDate: node.properties.dailyGoalStartDate,
      });
    }
    console.log(`  ✓ Preferences migrated`);
  }
}

async function getUserIdsAndGraphIds(): Promise<Array<{ uid: string; graphId: string }>> {
  const db = getFirestore();
  const snap = await db.collection('users').get();
  return snap.docs.map(d => ({ uid: d.id, graphId: d.id }));
}

async function main(): Promise<void> {
  const targetUid = process.argv[2];
  const targetGraphId = process.argv[3] ?? targetUid ?? '';

  if (targetUid) {
    await migrateUser(targetUid, targetGraphId);
  } else {
    const entries = await getUserIdsAndGraphIds();
    console.log(`Found ${entries.length} users to migrate`);
    for (const { uid, graphId } of entries) {
      await migrateUser(uid, graphId).catch((err) => {
        console.error(`Failed to migrate user ${uid}:`, err);
      });
    }
  }

  console.log('\nMigration complete.');
}

main().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
