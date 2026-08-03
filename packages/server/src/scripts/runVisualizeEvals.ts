/**
 * Run only the interactive visualization evals (g8-g10).
 *
 * Usage:
 *   EVAL_UID=oofp... BUILDER_API_KEY=sk_... npx tsx src/scripts/runVisualizeEvals.ts
 */
import { KnowledgeGraphAccessLayer } from '@almadar-io/knowledge/server';
import {
  visualizeStructureEval,
  visualizeQualityEval,
  orbitalGenerationE2EEval,
  resetGraphPool,
} from '@almadar-io/knowledge/evals';
import type { GraphOperationEvalConfig, GraphOperationEvalResult } from '@almadar-io/knowledge/evals';
import { initializeFirebase, getFirestore } from '@almadar/server';
import { listUserGraphIds } from '../utils/listUserGraphIds';

process.env.FIREBASE_PROJECT_ID ??= process.env.FB_PROJECT_ID;
process.env.FIREBASE_CLIENT_EMAIL ??= process.env.FB_CLIENT_EMAIL;
process.env.FIREBASE_PRIVATE_KEY ??= process.env.FB_PRIVATE_KEY;

initializeFirebase();
try {
  getFirestore().settings({ ignoreUndefinedProperties: true, databaseId: process.env.FB_DB_ID });
} catch { /* already set */ }

const uid = process.env.EVAL_UID;
if (!uid) {
  console.error('ERROR: EVAL_UID required');
  process.exit(1);
}

async function main() {
  const accessLayer = new KnowledgeGraphAccessLayer();
  const graphIds = await listUserGraphIds(uid);
  console.log(`\n${'='.repeat(70)}`);
  console.log(`Interactive Visualization Evals (g8-g10) — uid=${uid}`);
  console.log(`Graphs: ${graphIds.length} | Builder: ${process.env.BUILDER_URL ?? 'http://localhost:3003'}`);
  console.log(`${'='.repeat(70)}\n`);

  const config: GraphOperationEvalConfig = {
    uid,
    accessLayer,
    graphIds,
    provider: 'openrouter',
    model: 'qwen/qwen3-30b-a3b-instruct-2507',
    builderUrl: process.env.BUILDER_URL ?? 'http://localhost:3003',
    builderApiKey: process.env.BUILDER_API_KEY,
  };

  const evals = [visualizeStructureEval, visualizeQualityEval, orbitalGenerationE2EEval];
  const results: GraphOperationEvalResult[] = [];

  for (const evalSpec of evals) {
    resetGraphPool();
    console.log(`\n▶ ${evalSpec.name}`);
    console.log(`  ${evalSpec.description}`);
    process.stdout.write('  Running... ');

    const start = Date.now();
    try {
      const result = await evalSpec.run(config);
      results.push(result);
      const elapsed = ((Date.now() - start) / 1000).toFixed(1);
      console.log(`${result.success ? '✅' : '❌'} (${elapsed}s, score ${(result.score * 100).toFixed(0)}%)`);

      if (result.error) {
        console.log(`  ⚠ ERROR: ${result.error}`);
      }

      console.log(`  Output: ${JSON.stringify(result.output)}`);

      for (const a of result.assertions) {
        console.log(`  ${a.passed ? '✅' : '❌'} ${a.name}${a.detail ? ` — ${a.detail}` : ''}`);
      }

      if (result.promptTokens || result.completionTokens) {
        console.log(`  Tokens: ${result.promptTokens}+${result.completionTokens} | Cost: ${result.costFormatted}`);
      }
    } catch (e) {
      const elapsed = ((Date.now() - start) / 1000).toFixed(1);
      console.log(`💥 (${elapsed}s)`);
      console.log(`  ${e instanceof Error ? e.message : String(e)}`);
      results.push({
        evalName: evalSpec.name, success: false, score: 0,
        latencyMs: Date.now() - start, promptTokens: 0, completionTokens: 0,
        costFormatted: '', error: e instanceof Error ? e.message : String(e), assertions: [],
      });
    }
  }

  // Summary
  console.log(`\n${'='.repeat(70)}`);
  console.log('SUMMARY');
  console.log(`${'='.repeat(70)}`);
  const nameW = Math.max(...results.map(r => r.evalName.length), 25);
  console.log(`${'Eval'.padEnd(nameW)}  Pass   Score   Latency`);
  console.log(`${'─'.repeat(nameW)}  ──────  ──────  ────────`);
  for (const r of results) {
    console.log(
      `${r.evalName.padEnd(nameW)}  ${r.success ? '✅    ' : '❌    '}  ` +
      `${(r.score * 100).toFixed(0).padEnd(5)}%  ${(r.latencyMs / 1000).toFixed(1)}s`,
    );
  }
  const passCount = results.filter(r => r.success).length;
  const avgScore = (results.reduce((s, r) => s + r.score, 0) / results.length * 100).toFixed(0);
  console.log(`\n${passCount}/${results.length} passed | avg score ${avgScore}%`);
}

main().catch(e => {
  console.error('Fatal:', e);
  process.exit(1);
});
