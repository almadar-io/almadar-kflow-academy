/**
 * Graph-operation eval CLI runner — tests model capability on expand/explain/goal.
 *
 * Runs graph-operation evals against the user's real Firestore data, walking up
 * a model ladder from cheapest to strongest. If a model fails on structural
 * validity (JSON parse, missing fields), it escalates to the next rung.
 *
 * Usage:
 *   EVAL_UID=oofpNpiPMCVrtDuixMvyyMpXAOL2 npx tsx src/scripts/runGraphOperationEvals.ts
 *   EVAL_UID=... PROVIDER=openrouter MODEL=qwen/qwen3.7-flash npx tsx src/scripts/runGraphOperationEvals.ts
 *
 * The model ladder (prices from OpenRouter, Aug 2026):
 *   Rung 1: Qwen3.7 Flash          — $0.03/M in, $0.13/M out (cheapest, vision-capable)
 *   Rung 2: Qwen3 30B A3B          — $0.05/M in, $0.19/M out (MoE, non-thinking)
 *   Rung 3: Gemma 4 26B A4B        — $0.07/M in, $0.34/M out (MoE 25.2B/3.8B active)
 *   Rung 4: DeepSeek V4 Flash      — $0.14/M in, $0.28/M out (baseline, direct API)
 */

import { KnowledgeGraphAccessLayer } from '@almadar-io/knowledge/server';
import { allGraphOperationEvals, resetGraphPool } from '@almadar-io/knowledge/evals';
import type {
  GraphOperationEvalConfig,
  GraphOperationEvalResult,
} from '@almadar-io/knowledge/evals';
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
  console.error('ERROR: EVAL_UID environment variable is required.');
  console.error('Find your uid in the server logs: grep "auth:verified" /tmp/kflow-server.log');
  process.exit(1);
}

const USER_UID: string = uid;
const accessLayer = new KnowledgeGraphAccessLayer();

const MODEL_LADDER: Array<{
  provider: 'openrouter' | 'deepseek';
  model: string;
  label: string;
}> = [
  { provider: 'openrouter', model: 'qwen/qwen3-30b-a3b-instruct-2507', label: 'Qwen3 30B A3B ($0.05/M)' },
  { provider: 'deepseek', model: 'deepseek-v4-flash', label: 'DeepSeek V4 Flash (baseline, $0.14/M)' },
];

function formatTable(results: GraphOperationEvalResult[]): string {
  const nameWidth = Math.max(...results.map(r => r.evalName.length), 20);
  const lines: string[] = [];
  lines.push('');
  lines.push(
    `${'Eval'.padEnd(nameWidth)}  ${'Pass'.padEnd(6)}  ${'Score'.padEnd(6)}  ${'Latency'.padEnd(8)}  ${'Domain'.padEnd(20)}  Details`,
  );
  lines.push(
    `${'─'.repeat(nameWidth)}  ${'─'.repeat(6)}  ${'─'.repeat(6)}  ${'─'.repeat(8)}  ${'─'.repeat(20)}  ${'─'.repeat(40)}`,
  );

  for (const r of results) {
    const pass = r.success ? '✅' : '❌';
    const score = `${(r.score * 100).toFixed(0)}%`;
    const latency = `${(r.latencyMs / 1000).toFixed(1)}s`;
    const domain = (r.output as { domain?: string } | undefined)?.domain ?? '-';
    const failed = r.assertions
      .filter(a => !a.passed)
      .map(a => a.detail ?? a.name)
      .join('; ');
    lines.push(
      `${r.evalName.padEnd(nameWidth)}  ${pass.padEnd(6)}  ${score.padEnd(6)}  ${latency.padEnd(8)}  ${domain.slice(0, 20).padEnd(20)}  ${failed || 'all passed'}`,
    );
  }

  const allPass = results.every(r => r.success);
  const totalTime = (results.reduce((s, r) => s + r.latencyMs, 0) / 1000).toFixed(1);
  const totalPrompt = results.reduce((s, r) => s + r.promptTokens, 0);
  const totalCompletion = results.reduce((s, r) => s + r.completionTokens, 0);
  lines.push('');
  lines.push(
    `Overall: ${allPass ? '✅ ALL PASS' : '❌ SOME FAILED'} | ${results.length} evals | ${totalTime}s total | ${totalPrompt}+${totalCompletion} tokens`,
  );
  return lines.join('\n');
}

async function runModelLadder() {
  console.log(`\n${'='.repeat(80)}`);
  console.log(`Graph Operation Eval Runner — uid=${USER_UID}`);
  console.log(`${'='.repeat(80)}\n`);

  const graphIds = await listUserGraphIds(USER_UID);
  console.log(
    `User has ${graphIds.length} knowledge graphs: ${graphIds.slice(0, 5).join(', ')}${graphIds.length > 5 ? '...' : ''}\n`,
  );

  if (graphIds.length === 0) {
    console.error('❌ User has no graphs. Create at least one graph with concepts before running evals.');
    process.exit(1);
  }

  // Check if a custom model was specified via env vars.
  const startModelIdx = (() => {
    const provider = process.env.PROVIDER as 'openrouter' | 'deepseek' | undefined;
    const model = process.env.MODEL;
    if (provider && model) {
      const idx = MODEL_LADDER.findIndex(m => m.provider === provider && m.model === model);
      if (idx >= 0) return idx;
      console.log(`Custom model: ${provider}/${model} (not in ladder, running standalone)\n`);
      MODEL_LADDER.length = 0;
      MODEL_LADDER.push({ provider, model, label: `${provider}/${model}` });
      return 0;
    }
    return 0;
  })();

  for (let i = startModelIdx; i < MODEL_LADDER.length; i++) {
    const runConfig = MODEL_LADDER[i];
    // Reset the graph pool so each model starts fresh (pool may have been mutated by prior model's expand operations).
    resetGraphPool();
    console.log(`\n${'─'.repeat(60)}`);
    console.log(`  Rung ${i + 1}/${MODEL_LADDER.length}: ${runConfig.label}`);
    console.log(`  provider=${runConfig.provider}  model=${runConfig.model}`);
    console.log(`${'─'.repeat(60)}\n`);

    const evalConfig: GraphOperationEvalConfig = {
      uid: USER_UID,
      accessLayer,
      graphIds,
      provider: runConfig.provider,
      model: runConfig.model,
    };

    const results: GraphOperationEvalResult[] = [];
    let hadStructuralError = false;

    for (const evalSpec of allGraphOperationEvals) {
      process.stdout.write(`  Running ${evalSpec.name}... `);
      try {
        const result = await evalSpec.run(evalConfig);
        results.push(result);
        console.log(result.success ? '✅' : '❌');
        if (result.error) {
          console.log(`    error: ${result.error}`);
          if (
            result.error.includes('JSON') ||
            result.error.includes('parse') ||
            result.error.includes('schema') ||
            result.error.includes('validate')
          ) {
            hadStructuralError = true;
          }
        }
      } catch (e) {
        console.log('💥');
        const msg = e instanceof Error ? e.message : String(e);
        console.log(`    ${msg}`);
        hadStructuralError = true;
        results.push({
          evalName: evalSpec.name,
          success: false,
          score: 0,
          latencyMs: 0,
          promptTokens: 0,
          completionTokens: 0,
          costFormatted: '',
          error: msg,
          assertions: [],
        });
      }
    }

    console.log(formatTable(results));

    const passCount = results.filter(r => r.success).length;
    const allPass = passCount === results.length;
    const scoreAvg =
      results.reduce((s, r) => s + r.score, 0) / results.length;

    if (allPass) {
      console.log(
        `\n✅ ${runConfig.label} passed all ${results.length} evals (avg score ${(scoreAvg * 100).toFixed(0)}%).`,
      );
      console.log(`   This model is viable for graph operations.\n`);
    } else {
      console.log(
        `\n⚠️  ${runConfig.label}: ${passCount}/${results.length} passed (avg score ${(scoreAvg * 100).toFixed(0)}%).`,
      );
    }

    if (allPass) {
      // Don't exit — run all models so we get a full comparison.
      continue;
    }

    if (hadStructuralError && i < MODEL_LADDER.length - 1) {
      console.log(
        `   Structural errors detected. Escalating to: ${MODEL_LADDER[i + 1].label}\n`,
      );
      continue;
    }

    if (i < MODEL_LADDER.length - 1) {
      console.log(`   Escalating to: ${MODEL_LADDER[i + 1].label}\n`);
      continue;
    }

    console.log(
      `\n❌ All models in the ladder failed. The baseline (deepseek-v4-flash) is required.\n`,
    );
  }

  console.log(`\n${'='.repeat(80)}`);
  console.log('Model ladder evaluation complete.');
  console.log(`${'='.repeat(80)}\n`);
}

runModelLadder().catch(e => {
  console.error('Fatal error:', e);
  process.exit(1);
});
