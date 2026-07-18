// Clear the per-concept originator-persona cache (concept-personas).
// Useful after a bad generation gets locked in (e.g. the mount-loop wrote degraded
// personas concurrently). Safe: docs regenerate lazily on next chat open.
//
// Usage (from packages/server):  npx tsx src/scripts/clearConceptPersonas.ts
import '../config/env.js';

const almadarServer = await import('@almadar/server');
almadarServer.initializeFirebase();
const db = almadarServer.getFirestore();

const snap = await db.collection('concept-personas').get();
let n = 0;
for (const d of snap.docs) {
  await d.ref.delete();
  n++;
}
console.log(`Deleted ${n} concept-personas cache docs.`);
process.exit(0);
