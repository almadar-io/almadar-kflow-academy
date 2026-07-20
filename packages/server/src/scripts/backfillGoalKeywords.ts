/**
 * One-time backfill: generate `keywords` for LearningGoal nodes that lack them, so
 * topical/acronym queries (e.g. "JVM" → Java path) find existing paths. Uses the LLM
 * to infer 3-8 domain search terms from each goal's title + description + concepts.
 *
 *   pnpm exec tsx src/scripts/backfillGoalKeywords.ts <uid>
 *
 * Updating the node via accessLayer.updateNode re-embeds the goal (keywords folded in).
 * Idempotent: skips goals that already carry keywords.
 */
import '../config/env.js';
import { createLogger } from '@almadar/logger';
const almadarServer = await import('@almadar/server');
almadarServer.initializeFirebase();
almadarServer.getFirestore();
const { KnowledgeGraphAccessLayer } = await import('@almadar-io/knowledge/server');
const { callLLM, extractJSONArray } = await import('../services/llm.js');

const log = createLogger('kflow:server:scripts:backfillGoalKeywords');
const access = new KnowledgeGraphAccessLayer();
const db = almadarServer.getFirestore();

const uid = process.argv[2];
if (!uid) { console.error('usage: backfillGoalKeywords.ts <uid>'); process.exit(1); }

const snap = await db.collection('users').doc(uid).collection('knowledgeGraphs').get();
const graphIds = snap.docs.map((d: { id: string }) => d.id);
console.log(`uid ${uid}: ${graphIds.length} graphs`);

let updated = 0, skipped = 0, failed = 0;
for (const graphId of graphIds) {
  const graph = await access.getGraph(uid, graphId);
  const goalIds = graph.nodeTypes.LearningGoal ?? [];
  const conceptNames = (graph.nodeTypes.Concept ?? [])
    .map((id: string) => graph.nodes[id])
    .filter((n) => !!n)
    .map((n) => (n.properties as { name?: string }).name)
    .filter((v): v is string => typeof v === 'string' && v.length > 0)
    .slice(0, 30);

  for (const goalId of goalIds) {
    const goal = graph.nodes[goalId];
    if (!goal) continue;
    const props = goal.properties as { keywords?: string[]; name?: string; description?: string };
    if (Array.isArray(props.keywords) && props.keywords.length > 0) { skipped++; continue; }

    const title = props.name ?? goalId;
    const description = props.description ?? '';
    try {
      const res = await callLLM({
        systemPrompt: 'You tag learning paths with search keywords. Return ONLY a JSON array of 3-8 short lowercase strings — domain terms, acronyms, aliases, and the broader field a learner would type to find this path. Terms need NOT appear in the title or concepts.',
        userPrompt: `Title: ${title}\nDescription: ${description}\nConcepts: ${conceptNames.join(', ')}\n\nReturn the JSON array only.`,
        maxTokens: 200,
      });
      const text = 'content' in res ? res.content : '';
      const arr = extractJSONArray(text).filter((v): v is string => typeof v === 'string' && v.trim().length > 0).map((v) => v.trim().toLowerCase()).slice(0, 8);
      if (arr.length === 0) { failed++; console.log(`  ✗ no keywords parsed: ${title}`); continue; }

      await access.updateNode(uid, graphId, goalId, { properties: { keywords: arr } as never });
      updated++;
      console.log(`  ✓ ${title}  →  [${arr.join(', ')}]`);
    } catch (e) {
      failed++;
      console.log(`  ✗ failed: ${title} — ${e instanceof Error ? e.message : String(e)}`);
    }
  }
}
console.log(`\nDone: updated=${updated} skipped=${skipped} failed=${failed}`);
process.exit(0);
