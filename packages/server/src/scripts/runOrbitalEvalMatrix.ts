/**
 * Wave F eval harness — sweeps the corpus built by runOrbitalEvalCorpus.ts
 * through the real builder generation path per provider, measuring
 * speed/validity/routing (docs/Almadar_Kflow_Sdk_Gaps.md, Phase 5).
 *
 * Usage:
 *   npx tsx src/scripts/runOrbitalEvalMatrix.ts [corpusPath]
 *   pnpm run eval:orbital-matrix
 */
import '../config/env.js';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';
import { AlmadarClient, AlmadarError } from '@almadar/sdk/client';
import type { GenerateMeta, GenerateOptions, GenerateResult } from '@almadar/sdk/client';
import { getOrganismsForType, getVisualizationCapabilities } from '@almadar-io/knowledge/server';
import type { InteractiveOrbitalType } from '@almadar-io/knowledge';
import { buildPrompt } from '../operations/generateInteractiveOrbital';
import { config } from '../config/env';
import type { Concept } from '../types/concept';

// ── Corpus row shape — mirrors what runOrbitalEvalCorpus.ts writes ─────────

interface CorpusMarker {
  type: InteractiveOrbitalType;
  description: string;
}

interface CorpusRow {
  id: string;
  branch: string;
  leaf: string;
  concept: Concept;
  expectedTypes: InteractiveOrbitalType[];
  markers: CorpusMarker[];
  primaryMarker: CorpusMarker | null;
  error?: string;
}

interface CorpusFile {
  generatedAt: string;
  rows: CorpusRow[];
}

// ── Provider matrix ──────────────────────────────────────────────────────

interface ProviderCell {
  key: string;
  provider: string;
  model: string;
  /** false = probe only (first corpus row of each branch), not a full sweep. */
  full: boolean;
}

const PROVIDERS: ProviderCell[] = [
  { key: 'deepseek', provider: 'deepseek', model: 'deepseek-v4-flash', full: true },
  { key: 'qwen-2.5-7b', provider: 'openrouter', model: 'qwen/qwen-2.5-7b-instruct', full: true },
  { key: 'gemma-4', provider: 'openrouter', model: 'google/gemma-4-26b-a4b-it', full: false },
];

const CALL_TIMEOUT_MS = 150_000;
const OVERALL_BUDGET_MS = 75 * 60 * 1000;

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const ARTIFACT_ROOT = resolve(SCRIPT_DIR, '../../../../e2e/.artifacts/eval');
const DEFAULT_CORPUS_PATH = resolve(ARTIFACT_ROOT, 'corpus.json');

// ── Result shapes ────────────────────────────────────────────────────────

interface CellResult {
  rowId: string;
  branch: string;
  leaf: string;
  type: InteractiveOrbitalType | null;
  providerKey: string;
  ok: boolean;
  durationMs: number;
  orbitals: number | null;
  meta: GenerateMeta | null;
  errorCode: number | null;
  errorMessage: string | null;
}

interface CellArtifact {
  rowId: string;
  providerKey: string;
  type: InteractiveOrbitalType | null;
  branch: string;
  leaf: string;
  ok: boolean;
  durationMs: number;
  appId: string | null;
  schema: GenerateResult['schema'] | null;
  meta: GenerateMeta | null;
  errorCode: number | null;
  errorMessage: string | null;
}

interface BranchAggregate {
  count: number;
  okCount: number;
  okRate: number;
  p50DurationMs: number | null;
  p95DurationMs: number | null;
}

interface ProviderAggregate extends BranchAggregate {
  providerKey: string;
  perBranch: Record<string, BranchAggregate>;
}

// ── Helpers ──────────────────────────────────────────────────────────────

function percentile(sortedAscending: number[], p: number): number | null {
  if (sortedAscending.length === 0) return null;
  const idx = Math.min(sortedAscending.length - 1, Math.floor((p / 100) * sortedAscending.length));
  return sortedAscending[idx];
}

function branchAggregate(cellsInBranch: CellResult[]): BranchAggregate {
  const durations = cellsInBranch.map((c) => c.durationMs).sort((a, b) => a - b);
  const okCount = cellsInBranch.filter((c) => c.ok).length;
  return {
    count: cellsInBranch.length,
    okCount,
    okRate: cellsInBranch.length > 0 ? okCount / cellsInBranch.length : 0,
    p50DurationMs: percentile(durations, 50),
    p95DurationMs: percentile(durations, 95),
  };
}

function aggregateForProvider(providerKey: string, cellsForProvider: CellResult[]): ProviderAggregate {
  const overall = branchAggregate(cellsForProvider);
  const branches = [...new Set(cellsForProvider.map((c) => c.branch))];
  const perBranch: Record<string, BranchAggregate> = {};
  for (const branch of branches) {
    perBranch[branch] = branchAggregate(cellsForProvider.filter((c) => c.branch === branch));
  }
  return { providerKey, ...overall, perBranch };
}

type GenerateOutcome =
  | { kind: 'ok'; result: GenerateResult }
  | { kind: 'timeout' }
  | { kind: 'error'; errorCode: number | null; errorMessage: string };

/** AlmadarClient.generate() has no AbortSignal in GenerateOptions — race against a timer instead. */
async function generateWithTimeout(client: AlmadarClient, options: GenerateOptions, timeoutMs: number): Promise<GenerateOutcome> {
  const genPromise: Promise<GenerateOutcome> = (async (): Promise<GenerateOutcome> => {
    try {
      const result = await client.generate(options);
      return { kind: 'ok', result };
    } catch (error: unknown) {
      if (error instanceof AlmadarError) {
        return { kind: 'error', errorCode: error.code, errorMessage: error.message };
      }
      if (error instanceof Error) {
        return { kind: 'error', errorCode: null, errorMessage: error.message };
      }
      return { kind: 'error', errorCode: null, errorMessage: String(error) };
    }
  })();

  const timeoutPromise = new Promise<GenerateOutcome>((resolvePromise) => {
    setTimeout(() => resolvePromise({ kind: 'timeout' }), timeoutMs);
  });

  return Promise.race([genPromise, timeoutPromise]);
}

function writeCellArtifact(runDir: string, rowId: string, providerKey: string, artifact: CellArtifact): void {
  writeFileSync(join(runDir, `${rowId}.${providerKey}.json`), JSON.stringify(artifact, null, 2));
}

// ── Per-cell run ─────────────────────────────────────────────────────────

async function runCell(
  client: AlmadarClient,
  row: CorpusRow,
  providerCell: ProviderCell,
  capabilityTypeSet: Set<string>,
  runDir: string,
  runId: string,
): Promise<CellResult> {
  if (row.primaryMarker === null) {
    console.log(`⚠️  MARKER ABSENT — skipping generation row=${row.id} provider=${providerCell.key}`);
    return {
      rowId: row.id, branch: row.branch, leaf: row.leaf, type: null, providerKey: providerCell.key,
      ok: false, durationMs: 0, orbitals: null, meta: null, errorCode: null, errorMessage: 'markerAbsent',
    };
  }

  const type = row.primaryMarker.type;
  if (!capabilityTypeSet.has(type)) {
    console.log(`⚠️  LESSON ROUTING INVALID — row=${row.id} provider=${providerCell.key} type="${type}" not in capability roster`);
    return {
      rowId: row.id, branch: row.branch, leaf: row.leaf, type, providerKey: providerCell.key,
      ok: false, durationMs: 0, orbitals: null, meta: null, errorCode: null, errorMessage: 'lessonRoutingInvalid',
    };
  }

  const stdAllowList = getOrganismsForType(type);
  const appId = `kflow-eval-${runId}-${row.id}-${providerCell.key}`;

  console.log(`[${providerCell.key}] ${row.id} type=${type} starting...`);
  const startedAt = Date.now();

  const outcome = await generateWithTimeout(client, {
    prompt: buildPrompt({ type, concept: row.concept, markerDescription: row.primaryMarker.description }),
    endUserId: row.id,
    appId,
    provider: providerCell.provider,
    model: providerCell.model,
    catalogMode: 'subset',
    stdAllowList,
  }, CALL_TIMEOUT_MS);

  const durationMs = Date.now() - startedAt;

  if (outcome.kind === 'timeout') {
    console.log(`⏱  [${providerCell.key}] ${row.id} TIMED OUT after ${durationMs}ms`);
    const errorMessage = `timeout after ${CALL_TIMEOUT_MS}ms`;
    writeCellArtifact(runDir, row.id, providerCell.key, {
      rowId: row.id, providerKey: providerCell.key, type, branch: row.branch, leaf: row.leaf,
      ok: false, durationMs, appId, schema: null, meta: null, errorCode: null, errorMessage,
    });
    return { rowId: row.id, branch: row.branch, leaf: row.leaf, type, providerKey: providerCell.key, ok: false, durationMs, orbitals: null, meta: null, errorCode: null, errorMessage };
  }

  if (outcome.kind === 'error') {
    const { errorCode, errorMessage } = outcome;
    console.log(`💥 [${providerCell.key}] ${row.id} FAILED after ${durationMs}ms: ${errorMessage}`);
    writeCellArtifact(runDir, row.id, providerCell.key, {
      rowId: row.id, providerKey: providerCell.key, type, branch: row.branch, leaf: row.leaf,
      ok: false, durationMs, appId, schema: null, meta: null, errorCode, errorMessage,
    });
    return { rowId: row.id, branch: row.branch, leaf: row.leaf, type, providerKey: providerCell.key, ok: false, durationMs, orbitals: null, meta: null, errorCode, errorMessage };
  }

  const { schema, meta, appId: resultAppId } = outcome.result;
  const orbitals = schema.orbitals.length;
  const firstOrganism = meta?.organisms[0]?.name ?? '(none)';
  console.log(`✅ [${providerCell.key}] ${row.id} done in ${durationMs}ms tier=${meta?.tier ?? '(no-meta)'} organism=${firstOrganism}`);

  writeCellArtifact(runDir, row.id, providerCell.key, {
    rowId: row.id, providerKey: providerCell.key, type, branch: row.branch, leaf: row.leaf,
    ok: true, durationMs, appId: resultAppId ?? appId, schema, meta: meta ?? null, errorCode: null, errorMessage: null,
  });

  return { rowId: row.id, branch: row.branch, leaf: row.leaf, type, providerKey: providerCell.key, ok: true, durationMs, orbitals, meta: meta ?? null, errorCode: null, errorMessage: null };
}

// ── Main ─────────────────────────────────────────────────────────────────

async function main() {
  const corpusPathArg = process.argv[2];
  const corpusPath = corpusPathArg ? resolve(corpusPathArg) : DEFAULT_CORPUS_PATH;

  const corpusFile = JSON.parse(readFileSync(corpusPath, 'utf8')) as CorpusFile;
  const rows = corpusFile.rows;
  if (!Array.isArray(rows) || rows.length === 0) {
    throw new Error(`corpus at ${corpusPath} has no rows — harness-level failure`);
  }

  const capabilities = getVisualizationCapabilities();
  if (capabilities.length === 0) {
    throw new Error('getVisualizationCapabilities() returned an empty roster — harness-level failure');
  }
  const capabilityTypeSet = new Set(capabilities.map((c) => c.type));
  console.log(`Capability roster: ${[...capabilityTypeSet].join(', ')}`);

  const apiKey = config.almadar.apiKey;
  if (!apiKey) {
    throw new Error('ALMADAR_API_KEY environment variable is not set');
  }
  const client = new AlmadarClient({ apiKey, baseUrl: config.almadar.baseUrl });

  const runId = Date.now().toString(36);
  const runDir = resolve(ARTIFACT_ROOT, `matrix-${runId}`);
  mkdirSync(runDir, { recursive: true });

  console.log(`\n${'='.repeat(70)}`);
  console.log(`Orbital eval matrix — runId=${runId} corpus=${corpusPath} rows=${rows.length}`);
  console.log(`${'='.repeat(70)}\n`);

  const overallDeadline = Date.now() + OVERALL_BUDGET_MS;
  const cells: CellResult[] = [];

  for (const providerCell of PROVIDERS) {
    let targetRows = rows;
    if (!providerCell.full) {
      const seenBranches = new Set<string>();
      const probeRows: CorpusRow[] = [];
      for (const row of rows) {
        if (!seenBranches.has(row.branch)) {
          seenBranches.add(row.branch);
          probeRows.push(row);
        }
      }
      targetRows = probeRows;
      console.log(`[${providerCell.key}] PROBE mode (task-shape probe, not a sweep) — covering rows: ${probeRows.map((r) => r.id).join(', ')}`);
    }

    for (const row of targetRows) {
      if (Date.now() > overallDeadline) {
        console.log(`⏳ BUDGET EXCEEDED (${OVERALL_BUDGET_MS}ms) — skipping remaining cell row=${row.id} provider=${providerCell.key}`);
        cells.push({
          rowId: row.id, branch: row.branch, leaf: row.leaf, type: row.primaryMarker?.type ?? null,
          providerKey: providerCell.key, ok: false, durationMs: 0, orbitals: null, meta: null,
          errorCode: null, errorMessage: 'budget-skipped',
        });
        continue;
      }

      const cellResult = await runCell(client, row, providerCell, capabilityTypeSet, runDir, runId);
      cells.push(cellResult);
    }
  }

  const aggregates = PROVIDERS.map((p) => aggregateForProvider(p.key, cells.filter((c) => c.providerKey === p.key)));

  const matrixPath = join(runDir, 'matrix.json');
  writeFileSync(matrixPath, JSON.stringify({
    runId,
    generatedAt: new Date().toISOString(),
    corpusPath,
    providers: PROVIDERS,
    cells,
    aggregates,
  }, null, 2));

  console.table(cells.map((c) => ({
    provider: c.providerKey,
    row: c.rowId,
    type: c.type ?? '(none)',
    ok: c.ok,
    durationMs: c.durationMs,
    error: c.errorMessage ?? '',
  })));

  console.log(JSON.stringify({
    runId,
    matrixPath,
    totalCells: cells.length,
    okCells: cells.filter((c) => c.ok).length,
    aggregates,
  }));
}

main().catch((e) => {
  console.error('Fatal error:', e);
  process.exit(1);
});
