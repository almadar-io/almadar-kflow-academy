/**
 * Read-only inspection: dump a user's knowledgeGraphs so we can see what makes the
 * "Untitled Learning Path" / "Learning Goal" entries corrupt vs. healthy.
 *
 * Usage: npx tsx src/scripts/inspectGraphs.ts <uid> [graphId]
 */
import * as dotenv from 'dotenv';
dotenv.config(); // run from packages/server so .env resolves from cwd

// Mirror server.ts: map the app's FB_* creds onto the FIREBASE_* names initializeFirebase reads.
process.env.FIREBASE_PROJECT_ID ??= process.env.FB_PROJECT_ID;
process.env.FIREBASE_CLIENT_EMAIL ??= process.env.FB_CLIENT_EMAIL;
process.env.FIREBASE_PRIVATE_KEY ??= process.env.FB_PRIVATE_KEY;

import { getFirestore, initializeFirebase } from '@almadar/server';
import { getNodeBasedKnowledgeGraph } from '@almadar-io/knowledge/server';

initializeFirebase();
getFirestore().settings({ ignoreUndefinedProperties: true, databaseId: process.env.FB_DB_ID });

function deriveTitle(graph: Awaited<ReturnType<typeof getNodeBasedKnowledgeGraph>>): string {
  if (!graph || !graph.nodes) return 'Untitled Learning Path';
  const goalIds = graph.nodeTypes?.LearningGoal ?? [];
  let title = 'Untitled Learning Path';
  if (goalIds.length > 0) {
    const g = graph.nodes[goalIds[0]];
    if (g?.type === 'LearningGoal') title = (g.properties.name as string) || title;
  }
  if (title === 'Untitled Learning Path' && graph.seedConceptId) {
    const seed = graph.nodes[graph.seedConceptId];
    if (seed?.type === 'Concept') title = (seed.properties.name as string) || title;
  }
  return title;
}

async function main() {
  const [uid, graphId] = process.argv.slice(2);
  if (!uid) { console.error('Usage: inspectGraphs.ts <uid> [graphId]'); process.exit(1); }
  const db = getFirestore();
  const ids = graphId
    ? [graphId]
    : (await db.collection('users').doc(uid).collection('knowledgeGraphs').select('id').get()).docs.map(d => d.id);

  console.log(`\nUser ${uid} — ${ids.length} graph doc(s)\n`);
  for (const id of ids) {
    const g = await getNodeBasedKnowledgeGraph(uid, id).catch(e => { console.log(`  ${id}: LOAD ERROR ${e?.message}`); return null; });
    if (!g) { console.log(`  ${id}: <null / not loadable>`); continue; }
    const nt = g.nodeTypes ?? {};
    const typeCounts = Object.fromEntries(Object.entries(nt).map(([k, v]) => [k, Array.isArray(v) ? v.length : 0]).filter(([, n]) => (n as number) > 0));
    const conceptCount = (nt.Concept?.length ?? 0);
    const seedNode = g.seedConceptId ? g.nodes?.[g.seedConceptId] : undefined;
    const seedOk = !!seedNode;
    const seedName = seedNode?.type === 'Concept' ? seedNode.properties.name : null;
    const goalNode = nt.LearningGoal?.length ? g.nodes?.[nt.LearningGoal[0]] : undefined;
    const goalName = goalNode?.type === 'LearningGoal' ? goalNode.properties.name : null;
    console.log(`  ${id}`);
    console.log(`    title=${JSON.stringify(deriveTitle(g))}  concepts=${conceptCount}  seedConceptId=${g.seedConceptId ?? 'NONE'} seedResolves=${seedOk}`);
    console.log(`    seedName=${JSON.stringify(seedName)}  goalNodeName=${JSON.stringify(goalName)}`);
    console.log(`    version=${g.version} nodeTypes=${JSON.stringify(typeCounts)} nodes=${g.nodes ? Object.keys(g.nodes).length : 'MISSING'}`);
  }
  console.log('');
  process.exit(0);
}
main().catch(e => { console.error(e); process.exit(1); });
