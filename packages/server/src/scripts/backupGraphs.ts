/**
 * Back up a user's knowledgeGraphs (raw docs) to a JSON file before a migration.
 * Usage: npx tsx src/scripts/backupGraphs.ts <uid> <outFile>
 */
import * as dotenv from 'dotenv';
dotenv.config();
process.env.FIREBASE_PROJECT_ID ??= process.env.FB_PROJECT_ID;
process.env.FIREBASE_CLIENT_EMAIL ??= process.env.FB_CLIENT_EMAIL;
process.env.FIREBASE_PRIVATE_KEY ??= process.env.FB_PRIVATE_KEY;

import * as fs from 'fs';
import { initializeFirebase, getFirestore } from '@almadar/server';

async function main() {
  const [uid, outFile] = process.argv.slice(2);
  if (!uid || !outFile) { console.error('usage: backupGraphs.ts <uid> <outFile>'); process.exit(1); }
  initializeFirebase();
  const db = getFirestore();
  if (process.env.FB_DB_ID) db.settings({ ignoreUndefinedProperties: true, databaseId: process.env.FB_DB_ID });

  const refs = await db.collection('users').doc(uid).collection('knowledgeGraphs').listDocuments();
  const out: Record<string, FirebaseFirestore.DocumentData> = {};
  for (const ref of refs) {
    const d = (await ref.get()).data();
    if (d) out[ref.id] = d;
  }
  fs.writeFileSync(outFile, JSON.stringify({ uid, db: process.env.FB_DB_ID, at: new Date().toISOString(), count: Object.keys(out).length, graphs: out }));
  console.log(`Backed up ${Object.keys(out).length} graphs → ${outFile} (${(fs.statSync(outFile).size / 1024 / 1024).toFixed(1)} MB)`);
  process.exit(0);
}
main().catch(e => { console.error(e); process.exit(1); });
