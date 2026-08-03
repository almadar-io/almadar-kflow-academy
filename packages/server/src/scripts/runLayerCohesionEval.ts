import { KnowledgeGraphAccessLayer } from '@almadar-io/knowledge/server';
import { layerCohesionEval, resetGraphPool } from '@almadar-io/knowledge/evals';
import { initializeFirebase, getFirestore } from '@almadar/server';
import { listUserGraphIds } from '../utils/listUserGraphIds';

async function main() {
  process.env.FIREBASE_PROJECT_ID ??= process.env.FB_PROJECT_ID;
  process.env.FIREBASE_CLIENT_EMAIL ??= process.env.FB_CLIENT_EMAIL;
  process.env.FIREBASE_PRIVATE_KEY ??= process.env.FB_PRIVATE_KEY;
  initializeFirebase();
  getFirestore().settings({ ignoreUndefinedProperties: true, databaseId: process.env.FB_DB_ID });

  const uid = process.env.EVAL_UID!;
  if (!uid) { console.error('EVAL_UID required'); process.exit(1); }
  const accessLayer = new KnowledgeGraphAccessLayer();
  const graphIds = await listUserGraphIds(uid);
  console.log(`Graphs: ${graphIds.length}`);

  const provider = (process.env.PROVIDER ?? 'deepseek') as 'deepseek' | 'openrouter';
  const model = process.env.MODEL ?? 'deepseek-v4-flash';
  console.log(`Model: ${provider}/${model}`);

  const graphOffset = parseInt(process.env.GRAPH_OFFSET ?? '6', 10);
  console.log(`Graph offset: ${graphOffset}`);
  resetGraphPool();
  const config = { uid, accessLayer, graphIds, provider, model, layerCohesionGraphOffset: graphOffset };
  console.log('Running layer cohesion eval (3 layers)...\n');

  const result = await layerCohesionEval.run(config);

  console.log(`\n${'='.repeat(60)}`);
  console.log(`Result: ${result.success ? '✅ PASS' : '❌ FAIL'} | Score: ${(result.score * 100).toFixed(0)}%`);
  console.log(`Latency: ${(result.latencyMs / 1000).toFixed(1)}s | Tokens: ${result.promptTokens}+${result.completionTokens}`);
  if (result.error) console.log(`Error: ${result.error}`);
  console.log(`\nAssertions:`);
  for (const a of result.assertions) {
    console.log(`  ${a.passed ? '✅' : '❌'} ${a.name}${a.detail ? ` — ${a.detail}` : ''}`);
  }
  if (result.output) console.log(`\nOutput:`, JSON.stringify(result.output, null, 2));
}

main().catch(e => { console.error('Fatal:', e); process.exit(1); });
