/**
 * Companion eval CLI runner.
 *
 * Runs companion evals against the user's real Firestore + Chroma data.
 * Usage:
 *   EVAL_UID=oofpNpiPMCVrtDuixMvyyMpXAOL2 npx tsx src/scripts/runCompanionEvals.ts
 *   EVAL_UID=... PROVIDER=openrouter MODEL=qwen/qwen-2.5-7b-instruct npx tsx src/scripts/runCompanionEvals.ts
 *
 * The model ladder: starts at the given model (or cheapest OpenRouter model),
 * and if any eval fails due to tool-calling errors, escalates to the next
 * model in the ladder until reaching deepseek-chat (the current production model).
 */

import { KnowledgeGraphAccessLayer, runCompanionAnalysis } from '@almadar-io/knowledge/server';
import { allCompanionEvals } from '@almadar-io/knowledge/evals';
import type { CompanionEvalConfig, CompanionEvalResult } from '@almadar-io/knowledge/evals';
import { initializeFirebase, getFirestore } from '@almadar/server';
import { listUserGraphIds } from '../utils/listUserGraphIds';
import type { KflowAgentConfig } from '@almadar-io/knowledge/server';

process.env.FIREBASE_PROJECT_ID ??= process.env.FB_PROJECT_ID;
process.env.FIREBASE_CLIENT_EMAIL ??= process.env.FB_CLIENT_EMAIL;
process.env.FIREBASE_PRIVATE_KEY ??= process.env.FB_PRIVATE_KEY;

initializeFirebase();
try { getFirestore().settings({ ignoreUndefinedProperties: true, databaseId: process.env.FB_DB_ID }); } catch { /* already set */ }

const uid: string | undefined = process.env.EVAL_UID;
if (!uid) {
  console.error('ERROR: EVAL_UID environment variable is required.');
  console.error('Find your uid in the server logs: grep "auth:verified" /tmp/kflow-server.log');
  process.exit(1);
}
const USER_UID: string = uid;

const accessLayer = new KnowledgeGraphAccessLayer();

const agentConfig: KflowAgentConfig = {
  accessLayer,
  uid: USER_UID,
  listGraphIds: () => listUserGraphIds(USER_UID),
};

const MODEL_LADDER: Array<{ provider: string; model: string; label: string }> = [
  { provider: 'openrouter', model: 'qwen/qwen-2.5-7b-instruct', label: 'Qwen 2.5 7B (cheapest)' },
  { provider: 'openrouter', model: 'meta-llama/llama-3.2-3b-instruct:free', label: 'Llama 3.2 3B (free)' },
  { provider: 'openrouter', model: 'google/gemini-flash-1.5', label: 'Gemini Flash 1.5' },
  { provider: 'openrouter', model: 'qwen/qwen-2.5-72b-instruct', label: 'Qwen 2.5 72B' },
  { provider: 'deepseek', model: 'deepseek-chat', label: 'DeepSeek Chat (production)' },
];

function formatTable(results: CompanionEvalResult[]): string {
  const nameWidth = Math.max(...results.map(r => r.evalName.length), 20);
  const lines: string[] = [];
  lines.push('');
  lines.push(`${'Eval'.padEnd(nameWidth)}  ${'Pass'.padEnd(6)}  ${'Score'.padEnd(6)}  ${'Latency'.padEnd(8)}  ${'Tokens'.padEnd(12)}  Details`);
  lines.push(`${'─'.repeat(nameWidth)}  ${'─'.repeat(6)}  ${'─'.repeat(6)}  ${'─'.repeat(8)}  ${'─'.repeat(12)}  ${'─'.repeat(30)}`);

  for (const r of results) {
    const pass = r.success ? '✅' : '❌';
    const score = `${(r.score * 100).toFixed(0)}%`;
    const latency = `${(r.latencyMs / 1000).toFixed(1)}s`;
    const tokens = `${r.promptTokens}+${r.completionTokens}`;
    const failedAssertions = r.assertions.filter((a: { passed: boolean }) => !a.passed).map((a: { detail?: string; name: string }) => a.detail ?? a.name).join('; ');
    lines.push(`${r.evalName.padEnd(nameWidth)}  ${pass.padEnd(6)}  ${score.padEnd(6)}  ${latency.padEnd(8)}  ${tokens.padEnd(12)}  ${failedAssertions || 'all passed'}`);
  }

  const allPass = results.every(r => r.success);
  const totalTime = (results.reduce((s, r) => s + r.latencyMs, 0) / 1000).toFixed(1);
  const totalPrompt = results.reduce((s: number, r: CompanionEvalResult) => s + r.promptTokens, 0);
  const totalCompletion = results.reduce((s: number, r: CompanionEvalResult) => s + r.completionTokens, 0);
  lines.push('');
  lines.push(`Overall: ${allPass ? '✅ ALL PASS' : '❌ SOME FAILED'} | ${results.length} evals | ${totalTime}s total | ${totalPrompt}+${totalCompletion} tokens`);
  return lines.join('\n');
}

async function runModelLadder() {
  console.log(`\n${'='.repeat(80)}`);
  console.log(`Companion Eval Runner — uid=${USER_UID}`);
  console.log(`${'='.repeat(80)}\n`);

  const graphIds = await listUserGraphIds(USER_UID);
  console.log(`User has ${graphIds.length} knowledge graphs: ${graphIds.slice(0, 5).join(', ')}${graphIds.length > 5 ? '...' : ''}\n`);

  const startModelIdx = (() => {
    const provider = process.env.PROVIDER;
    const model = process.env.MODEL;
    if (provider && model) {
      const idx = MODEL_LADDER.findIndex(m => m.provider === provider && m.model === model);
      if (idx >= 0) return idx;
      console.log(`Custom model: ${provider}/${model} (not in ladder, running standalone)`);
      MODEL_LADDER.length = 0;
      MODEL_LADDER.push({ provider, model, label: `${provider}/${model}` });
      return 0;
    }
    return 0;
  })();

  for (let i = startModelIdx; i < MODEL_LADDER.length; i++) {
    const runConfig = MODEL_LADDER[i];
    console.log(`\n${'─'.repeat(60)}`);
    console.log(`  Rung ${i + 1}/${MODEL_LADDER.length}: ${runConfig.label}`);
    console.log(`  provider=${runConfig.provider}  model=${runConfig.model}`);
    console.log(`${'─'.repeat(60)}\n`);

    const evalConfig: CompanionEvalConfig = {
      uid: USER_UID,
      agentConfig,
      provider: runConfig.provider as CompanionEvalConfig['provider'],
      model: runConfig.model,
      locale: process.env.LOCALE ?? 'en',
    };

    const results: CompanionEvalResult[] = [];
    let hadToolError = false;

    for (const evalSpec of allCompanionEvals) {
      process.stdout.write(`  Running ${evalSpec.name}... `);
      try {
        const result = await evalSpec.run(evalConfig);
        results.push(result);
        console.log(result.success ? '✅' : '❌');
        if (result.error) {
          console.log(`    error: ${result.error}`);
          if (result.error.includes('tool') || result.error.includes('function')) {
            hadToolError = true;
          }
        }
      } catch (e) {
        console.log('💥');
        console.log(`    ${e instanceof Error ? e.message : String(e)}`);
        hadToolError = true;
        results.push({
          evalName: evalSpec.name,
          success: false,
          score: 0,
          latencyMs: 0,
          promptTokens: 0,
          completionTokens: 0,
          costFormatted: '',
          toolCalls: [],
          suggestion: null,
          trajectory: null,
          reply: null,
          error: e instanceof Error ? e.message : String(e),
          assertions: [],
        });
      }
    }

    console.log(formatTable(results));

    const allPass = results.every(r => r.success);
    if (allPass) {
      console.log(`\n✅ ${runConfig.label} passed all evals. This model works for the companion.\n`);
      process.exit(0);
    }

    if (hadToolError && i < MODEL_LADDER.length - 1) {
      console.log(`\n⚠️  Tool-calling errors detected. Escalating to next model: ${MODEL_LADDER[i + 1].label}\n`);
      continue;
    }

    console.log(`\n❌ ${runConfig.label} failed some evals (non-tool errors or assertion failures).`);
    if (i < MODEL_LADDER.length - 1) {
      console.log(`   Escalating to next model: ${MODEL_LADDER[i + 1].label}\n`);
      continue;
    }

    console.log(`\n❌ All models in the ladder failed. The production model (deepseek-chat) is required.\n`);
    process.exit(1);
  }
}

runModelLadder().catch(e => {
  console.error('Fatal error:', e);
  process.exit(1);
});
