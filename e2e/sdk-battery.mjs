// E2E test: sweep EVERY type reported by GET /api/visualization-capabilities through
// POST /api/generate-interactive-orbital, so type coverage can never hardcode-drift
// again.
//
// Run the server in dev with the auth bypass and a real SDK API key:
//   ALLOW_DEV_AUTH_BYPASS=true npm run dev:server
//   npm run test:e2e:sdk-battery
//
// Set E2E_SKIP_SDK=true to skip this test when the SDK backend is unavailable.
// API-only (no browser needed): dev auth bypass grants the fixed dev viewer to any
// request with no Authorization header, so a plain node fetch straight at the
// server is sufficient and simpler than a Playwright same-origin trick.
import { mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const BASE = process.env.E2E_SERVER_URL || 'http://localhost:3001';
const ART = join(dirname(fileURLToPath(import.meta.url)), '.artifacts', 'battery');
mkdirSync(ART, { recursive: true });

const REQUEST_TIMEOUT_MS = 120_000;
const TOTAL_BUDGET_MS = 20 * 60 * 1000;

// Taxonomy-stratified default concept per known type. Any capability whose `type`
// is NOT in this map still gets covered — see `conceptForCapability` below, which
// derives a generic concept from the capability's own description rather than
// silently skipping it.
const CONCEPT_BY_TYPE = {
  algorithms: {
    concept: {
      id: 'e2e-bat-algorithms',
      name: 'Binary Search',
      description: 'Searching a sorted array by halving',
    },
    markerDescription: 'Step-through of binary search for an intro CS lesson',
  },
  math: {
    concept: {
      id: 'e2e-bat-math',
      name: 'Pythagorean Theorem',
      description: 'The relation between the sides of a right triangle',
    },
    markerDescription: 'Geometry lesson deriving a² + b² = c² from a right triangle',
  },
  physics: {
    concept: {
      id: 'e2e-bat-physics',
      name: 'Projectile Motion',
      description: 'Motion of a launched object under gravity',
    },
    markerDescription: 'Physics lesson on the trajectory of a projectile under gravity',
  },
  biology: {
    concept: {
      id: 'e2e-bat-biology',
      name: 'Photosynthesis',
      description: 'How plants convert light energy into chemical energy',
    },
    markerDescription: 'Middle school biology lesson on photosynthesis',
  },
  chemistry: {
    concept: {
      id: 'e2e-bat-chemistry',
      name: 'Acid-Base Titration',
      description: 'Determining concentration via a neutralization reaction',
    },
    markerDescription: 'Chemistry lesson walking through an acid-base titration',
  },
  probability: {
    concept: {
      id: 'e2e-bat-probability',
      name: "Bayes' Theorem",
      description: 'Updating a probability estimate given new evidence',
    },
    markerDescription: "Probability lesson deriving and applying Bayes' theorem",
  },
};

/** Derive a generic concept for a capability type not in CONCEPT_BY_TYPE — never filter it out. */
function conceptForCapability(capability) {
  const known = CONCEPT_BY_TYPE[capability.type];
  if (known) return known;
  return {
    concept: {
      id: `e2e-bat-${capability.type}`,
      name: capability.organism || capability.type,
      description: capability.description,
    },
    markerDescription: `Coverage probe for the "${capability.type}" visualization capability`,
  };
}

const results = [];
const check = async (name, fn) => {
  try {
    const d = await fn();
    results.push({ name, pass: true, detail: d || '' });
    return { pass: true, detail: d };
  } catch (e) {
    const detail = String(e?.message || e).slice(0, 300);
    results.push({ name, pass: false, detail });
    return { pass: false, detail };
  }
};

async function fetchJson(path, opts = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), opts.timeoutMs || REQUEST_TIMEOUT_MS);
  try {
    const r = await fetch(`${BASE}${path}`, {
      method: opts.method || 'GET',
      headers: { 'Content-Type': 'application/json', ...(opts.headers || {}) },
      body: opts.body ? JSON.stringify(opts.body) : undefined,
      signal: controller.signal,
    });
    const text = await r.text();
    let json;
    try { json = JSON.parse(text); } catch { json = null; }
    return { status: r.status, json, text: text.slice(0, 500) };
  } finally {
    clearTimeout(timer);
  }
}

if (process.env.E2E_SKIP_SDK === 'true') {
  console.log(JSON.stringify({ app: 'kflow', passed: 0, total: 0, skipped: true, results: [] }, null, 2));
  process.exit(0);
}

// ── Discover the type roster from the server itself. FAIL LOUD if this is
//    unreachable or empty — falling back to a hardcoded list is exactly the
//    hardcode-drift bug this battery exists to prevent. ──────────────────────
let capabilities = [];
const capCheck = await check('visualization-capabilities reachable and non-empty', async () => {
  const response = await fetchJson('/api/visualization-capabilities');
  if (response.status !== 200) {
    throw new Error(`GET /api/visualization-capabilities returned ${response.status}: ${response.text}`);
  }
  const list = response.json?.capabilities;
  if (!Array.isArray(list) || list.length === 0) {
    throw new Error(`capabilities list is empty or missing: ${response.text}`);
  }
  capabilities = list;
  return `${list.length} capabilities: ${list.map((c) => c.type).join(', ')}`;
});

const summary = [];

if (capCheck.pass) {
  const startedAt = Date.now();
  for (const capability of capabilities) {
    const { type } = capability;
    const elapsed = Date.now() - startedAt;
    if (elapsed > TOTAL_BUDGET_MS) {
      summary.push({ type, status: 'budget-exceeded', orbitals: 0, durationMs: 0, appId: null, cached: null });
      results.push({
        name: `generate-interactive-orbital type=${type}`,
        pass: false,
        detail: `budget-exceeded: cumulative battery time ${elapsed}ms exceeded ${TOTAL_BUDGET_MS}ms before this type could run`,
      });
      continue;
    }

    const { concept, markerDescription } = conceptForCapability(capability);
    const reqStart = Date.now();
    let entry = { type, status: 'error', orbitals: 0, durationMs: 0, appId: null, cached: null };

    await check(`generate-interactive-orbital type=${type}`, async () => {
      const response = await fetchJson('/api/generate-interactive-orbital', {
        method: 'POST',
        body: { type, concept, markerDescription },
      });
      const durationMs = Date.now() - reqStart;
      entry.durationMs = durationMs;
      entry.status = response.status;

      writeFileSync(join(ART, `${type}.json`), JSON.stringify(response.json ?? { status: response.status, text: response.text }, null, 2));

      if (response.status !== 200) {
        throw new Error(`expected 200, got ${response.status}: ${response.text}`);
      }

      const schema = response.json?.schema;
      if (!schema || typeof schema !== 'object') {
        throw new Error(`response missing schema: ${response.text}`);
      }
      if (typeof schema.name !== 'string' || schema.name.length === 0) {
        throw new Error('schema.name is missing');
      }
      if (!Array.isArray(schema.orbitals) || schema.orbitals.length === 0) {
        throw new Error('schema.orbitals is empty or missing');
      }

      entry.orbitals = schema.orbitals.length;
      entry.appId = response.json.appId ?? null;
      entry.cached = response.json.cached ?? null;

      return `status=200, name="${schema.name}", orbitals=${schema.orbitals.length}, appId=${entry.appId}, cached=${entry.cached}, durationMs=${durationMs}`;
    });

    summary.push(entry);
  }
}

writeFileSync(join(ART, 'summary.json'), JSON.stringify(summary, null, 2));

// console.table-style summary to stdout.
if (summary.length > 0) {
  console.table(summary.map((s) => ({
    type: s.type,
    status: s.status,
    orbitals: s.orbitals,
    durationMs: s.durationMs,
    appId: s.appId,
    cached: s.cached,
  })));
}

const passed = results.filter((r) => r.pass).length;
console.log(JSON.stringify({ app: 'kflow', passed, total: results.length, skipped: 0, results, summary }, null, 2));
process.exit(passed === results.length ? 0 : 1);
