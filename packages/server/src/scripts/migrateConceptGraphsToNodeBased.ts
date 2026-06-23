/**
 * Migration: legacy ConceptGraph ({concepts, layers, relationships}) → NodeBasedKnowledgeGraph
 * ({nodes, nodeTypes, version}). Legacy graphs render as "Untitled Learning Path" because the
 * node-based loader can't read their shape — this converts them in place (reusing the canonical
 * @almadar-io/knowledge converter), preserving the real content.
 *
 * Targets the named database from FB_DB_ID (e.g. "kflow"). DRY-RUN by default.
 *
 * Usage (run from packages/server):
 *   npx tsx src/scripts/migrateConceptGraphsToNodeBased.ts <uid> [graphId]          # dry-run
 *   npx tsx src/scripts/migrateConceptGraphsToNodeBased.ts <uid> --apply            # write
 */
import * as dotenv from 'dotenv';
dotenv.config();
process.env.FIREBASE_PROJECT_ID ??= process.env.FB_PROJECT_ID;
process.env.FIREBASE_CLIENT_EMAIL ??= process.env.FB_CLIENT_EMAIL;
process.env.FIREBASE_PRIVATE_KEY ??= process.env.FB_PRIVATE_KEY;

import { initializeFirebase, getFirestore } from '@almadar/server';
import {
  convertStoredConceptGraphToNodeBased,
  saveNodeBasedKnowledgeGraph,
  extractLearningPathSummary,
  type StoredConceptGraph,
} from '@almadar-io/knowledge/server';
import type { NodeBasedKnowledgeGraph } from '@almadar-io/knowledge';
import type { DocumentData } from 'firebase-admin/firestore';

type Klass = 'new' | 'legacy' | 'empty';
function classify(data: DocumentData): Klass {
  if (data.nodes && data.nodeTypes) return 'new';
  const concepts = data.concepts;
  if (concepts && Object.keys(concepts).length > 0) return 'legacy';
  return 'empty';
}

async function main() {
  const args = process.argv.slice(2);
  const apply = args.includes('--apply');
  const positional = args.filter(a => !a.startsWith('--'));
  const uid = positional[0];
  const onlyGraph = positional[1];
  if (!uid) { console.error('usage: migrateConceptGraphsToNodeBased.ts <uid> [graphId] [--apply]'); process.exit(1); }

  initializeFirebase();
  const db = getFirestore();
  if (process.env.FB_DB_ID) db.settings({ ignoreUndefinedProperties: true, databaseId: process.env.FB_DB_ID });

  const col = db.collection('users').doc(uid).collection('knowledgeGraphs');
  const refs = onlyGraph ? [col.doc(onlyGraph)] : await col.listDocuments();

  console.log(`\n${apply ? '🟢 APPLY' : '🔎 DRY-RUN'}  db=${process.env.FB_DB_ID || '(default)'}  uid=${uid}  graphs=${refs.length}\n`);
  const stats = { new: 0, legacy: 0, empty: 0, converted: 0, failed: 0, titleFixed: 0 };
  const emptyIds: string[] = [];

  for (const ref of refs) {
    const snap = await ref.get();
    const data = snap.data();
    if (!data) continue;
    const k = classify(data);
    stats[k]++;

    if (k === 'new') {
      // Issue 2: new-schema graphs whose LearningGoal node is named the literal placeholder
      // "Learning Goal" surface that as the path title. Rename the goal node (and the graph's
      // name, if also the placeholder) to the real seed-concept name.
      const graph = data as NodeBasedKnowledgeGraph;
      if (extractLearningPathSummary(graph).title === 'Learning Goal') {
        const goalId = graph.nodeTypes?.LearningGoal?.[0];
        const goalNode = goalId ? graph.nodes[goalId] : undefined;
        const seedNode = graph.seedConceptId ? graph.nodes[graph.seedConceptId] : undefined;
        const seedName = seedNode?.type === 'Concept' ? seedNode.properties.name : undefined;
        if (goalNode?.type === 'LearningGoal' && seedName) {
          goalNode.properties.name = seedName;
          if (graph.name === 'Learning Goal') graph.name = seedName;
          console.log(`  TITLEFIX ${ref.id}  "Learning Goal" → "${seedName}"`);
          if (apply) { await saveNodeBasedKnowledgeGraph(uid, graph); console.log(`            ✓ saved`); }
          stats.titleFixed++;
        } else {
          console.log(`  TITLEFIX ${ref.id}  cannot fix (no goal node or seed name)`);
        }
      }
      continue;
    }
    if (k === 'empty') {
      emptyIds.push(ref.id);
      console.log(`  EMPTY   ${ref.id}  (seedConceptId=${JSON.stringify(data.seedConceptId)}) — no content, candidate for deletion`);
      continue;
    }

    // legacy → convert
    try {
      const result = convertStoredConceptGraphToNodeBased(data as StoredConceptGraph);
      const title = extractLearningPathSummary(result.nodeBasedGraph).title;
      const nodeCount = Object.keys(result.nodeBasedGraph.nodes).length;
      console.log(`  LEGACY  ${ref.id}  → "${title}"  (${result.stats.nodesCreated} nodes, ${result.stats.relationshipsCreated} rels, ${result.stats.layersConverted} layers)`);
      if (apply) {
        await saveNodeBasedKnowledgeGraph(uid, result.nodeBasedGraph);
        console.log(`            ✓ saved (${nodeCount} nodes)`);
      }
      stats.converted++;
    } catch (e) {
      stats.failed++;
      console.log(`  FAIL    ${ref.id}  — ${(e as Error).message}`);
    }
  }

  console.log(`\n━━ summary ━━`);
  console.log(`  already new-schema: ${stats.new}`);
  console.log(`  legacy → ${apply ? 'converted' : 'would convert'}: ${stats.converted}${stats.failed ? `  (failed: ${stats.failed})` : ''}`);
  console.log(`  "Learning Goal" titles ${apply ? 'fixed' : 'would fix'}: ${stats.titleFixed}`);
  console.log(`  empty (no content): ${stats.empty}${emptyIds.length ? `  → ${emptyIds.join(', ')}` : ''}`);
  if (!apply && (stats.converted > 0 || stats.titleFixed > 0)) console.log(`\n  Re-run with --apply to write the changes.`);
  process.exit(0);
}
main().catch(e => { console.error(e); process.exit(1); });
