// E2E test: verify generation profiling (Server-Timing + [PROFILE] phases) fires
// on the explain and expand generation routes in DEV mode.
//
// Prerequisites (same as flows.mjs):
//   ALLOW_DEV_AUTH_BYPASS=true PORT=3001 npm run dev:server
//   VITE_ALLOW_DEV_AUTH_BYPASS=true npm run dev:client
//   npm run test:e2e:profiling
//
// The test creates a throwaway graph + goal, expands a layer, explains a concept,
// and asserts that each response carries a `Server-Timing` header with the
// expected phase entries (llm-call/llm-stream, graph-load, etc.).
//
// Skip with E2E_SKIP_PROFILING=true.
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const BASE = process.env.E2E_BASE_URL || 'http://localhost:3000';
const ART = join(dirname(fileURLToPath(import.meta.url)), '.artifacts');
mkdirSync(ART, { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

const assert = (c, m) => { if (!c) throw new Error(m); };
const shot = (n) => page.screenshot({ path: join(ART, `${n}.png`) }).catch(() => {});

const results = [];
const check = async (name, fn) => {
  try { const d = await fn(); results.push({ name, pass: true, detail: d || '' }); }
  catch (e) { results.push({ name, pass: false, detail: String(e?.message || e).slice(0, 300) }); await shot(`FAIL-${name.replace(/\W+/g, '_')}`); }
};

if (process.env.E2E_SKIP_PROFILING === 'true') {
  console.log(JSON.stringify({ app: 'kflow', passed: 0, total: 0, skipped: true, results: [] }, null, 2));
  await browser.close();
  process.exit(0);
}

// Navigate to the base URL so the browser has an origin for same-origin fetch.
await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 15000 }).catch(() => {});

// ── Helper: fetch JSON and capture the Server-Timing header ──────────────────

async function apiCall(path, opts = {}) {
  const r = await page.request.fetch(`${BASE}${path}`, {
    method: opts.method || 'GET',
    headers: { 'Content-Type': 'application/json', ...(opts.headers || {}) },
    data: opts.body ? JSON.stringify(opts.body) : undefined,
    timeout: 120000,
  });
  const text = await r.text();
  let json;
  try { json = JSON.parse(text); } catch { json = null; }
  const headers = r.headers();
  return { status: r.status(), serverTiming: headers['server-timing'] || '', json, text: text.slice(0, 500) };
}

// ── Health check ─────────────────────────────────────────────────────────────

await check('server is reachable (health)', async () => {
  const res = await apiCall('/api/health');
  assert(res.status === 200, `health check failed: ${res.status} ${res.text}`);
  return 'ok';
});

// ── Step 1: Create a throwaway graph with a goal ─────────────────────────────

let graphId = '';

await check('create graph with goal (learning-path generation)', async () => {
  const res = await apiCall('/api/learning/goals/with-graph', {
    method: 'POST',
    body: {
      anchorAnswer: 'Understand basic thermodynamics for engineering',
      questionAnswers: [],
      seedConceptName: 'Thermodynamics',
      manualGoal: {
        title: 'Engineering Thermodynamics Fundamentals',
        description: 'Learn the core principles of thermodynamics for engineering applications.',
        type: 'skill_mastery',
        target: 'Engineering Thermodynamics',
      },
    },
  });
  assert(res.status === 200, `create-goal failed: ${res.status} ${res.text}`);
  assert(res.json?.graphId, `missing graphId in response: ${res.text}`);
  graphId = res.json.graphId;
  // Goal creation uses the kflow LLM path — Server-Timing may or may not carry
  // phases depending on whether the timingMiddleware is installed. Just verify
  // the call succeeded.
  return `graphId=${graphId}`;
});

// ── Step 2: Expand (generate a concept layer) ────────────────────────────────

let expandConceptId = '';

await check('expand graph (concept layer generation) — Server-Timing phases', async () => {
  assert(graphId, 'no graph from step 1');
  const res = await apiCall(`/api/graph-operations/${graphId}/expand`, {
    method: 'POST',
    body: { numConcepts: 3 },
  });
  assert(res.status === 200, `expand failed: ${res.status} ${res.text}`);
  // The expand response includes new concepts in mutations or content.
  const concepts = res.json?.content?.concepts;
  if (Array.isArray(concepts) && concepts.length > 0) {
    expandConceptId = concepts[0].name || '';
  }
  // Verify Server-Timing header is present and carries at least the LLM phase.
  assert(res.serverTiming, `no Server-Timing header on expand response (profiling middleware may not be installed)`);
  assert(/llm[-_]?(call|stream)/i.test(res.serverTiming), `Server-Timing missing LLM phase: "${res.serverTiming}"`);
  return `serverTiming: ${res.serverTiming.slice(0, 200)}`;
});

// ── Step 3: Explain a concept (lesson generation) ────────────────────────────

await check('explain concept (lesson generation) — Server-Timing phases', async () => {
  assert(graphId, 'no graph from step 1');
  // Fetch a concept node id from the graph to explain.
  const conceptsRes = await apiCall(`/api/graph-queries/${graphId}/concepts`);
  assert(conceptsRes.status === 200, `concepts query failed: ${conceptsRes.status}`);
  const conceptList = conceptsRes.json?.concepts || [];
  assert(conceptList.length > 0, 'no concepts found in graph to explain');
  const targetNodeId = conceptList[0].id || conceptList[0].conceptId || expandConceptId;
  assert(targetNodeId, 'could not resolve a concept node id');

  const res = await apiCall(`/api/graph-operations/${graphId}/explain`, {
    method: 'POST',
    body: { targetNodeId, simple: true },
  });
  assert(res.status === 200, `explain failed: ${res.status} ${res.text}`);
  // Verify profiling phases in the Server-Timing header.
  assert(res.serverTiming, `no Server-Timing header on explain response`);
  // The explain handler records phases like explain:graph-load, explain:operation (which wraps the LLM call).
  // At minimum, we expect an LLM timing entry and a total.
  assert(/total/i.test(res.serverTiming), `Server-Timing missing total phase: "${res.serverTiming}"`);
  // Either llm-call (non-stream) or llm-stream should be present since the explain operation calls the LLM.
  const hasLlmPhase = /llm/i.test(res.serverTiming) || /explain:operation/i.test(res.serverTiming);
  assert(hasLlmPhase, `Server-Timing missing LLM/explain-operation phase: "${res.serverTiming}"`);
  return `serverTiming: ${res.serverTiming.slice(0, 200)}`;
});

// ── Step 4: Verify read queries also carry Server-Timing ─────────────────────

await check('read query (graph summary) carries Server-Timing', async () => {
  assert(graphId, 'no graph from step 1');
  const res = await apiCall(`/api/graph-queries/${graphId}/summary`);
  assert(res.status === 200, `summary failed: ${res.status} ${res.text}`);
  assert(res.serverTiming, `no Server-Timing header on summary response`);
  assert(/total/i.test(res.serverTiming), `Server-Timing missing total: "${res.serverTiming}"`);
  return `serverTiming: ${res.serverTiming.slice(0, 120)}`;
});

// ── Report ───────────────────────────────────────────────────────────────────

const passed = results.filter((r) => r.pass).length;
console.log(JSON.stringify({ app: 'kflow', suite: 'profiling', passed, total: results.length, results }, null, 2));
await browser.close();
process.exit(passed === results.length ? 0 : 1);
