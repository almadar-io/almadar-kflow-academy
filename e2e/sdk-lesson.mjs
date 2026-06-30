// E2E test: generate a lesson via the `@almadar/sdk` powered endpoint.
//
// Run the server in dev with the auth bypass and a real SDK API key:
//   ALLOW_DEV_AUTH_BYPASS=true npm run dev:server
//   npm run test:e2e:sdk-lesson
//
// Set E2E_SKIP_SDK=true to skip this test when the SDK backend is unavailable.

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
  try {
    const d = await fn();
    results.push({ name, pass: true, detail: d || '' });
  } catch (e) {
    results.push({ name, pass: false, detail: String(e?.message || e).slice(0, 220) });
    await shot(`FAIL-${name.replace(/\W+/g, '_')}`);
  }
};

await check('SDK lesson endpoint reachable and authenticated', async () => {
  if (process.env.E2E_SKIP_SDK === 'true') {
    return 'skipped — E2E_SKIP_SDK=true';
  }

  await page.goto(`${BASE}/api/health`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(500);

  const request = {
    type: 'chart',
    concept: {
      name: 'Photosynthesis',
      description: 'How plants convert light energy into chemical energy.',
    },
    markerDescription: 'middle school biology lesson',
  };

  const response = await page.evaluate(async (req) => {
    const r = await fetch('/api/generate-interactive-orbital', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req),
    });
    return {
      status: r.status,
      body: await r.json().catch(() => ({})),
    };
  }, request);

  await shot('sdk-lesson-response');

  assert(response.status === 200, `expected 200, got ${response.status}: ${JSON.stringify(response.body).slice(0, 160)}`);
  const schema = response.body.schema;
  assert(schema && typeof schema === 'object', `response missing schema: ${JSON.stringify(response.body).slice(0, 160)}`);
  assert(Array.isArray(schema.organisms) && schema.organisms.length > 0, 'schema.organisms is empty or missing');
  assert(Array.isArray(schema.behaviors), 'schema.behaviors is missing');
  assert(schema.rootId || schema.root, 'schema has no root/rootId');

  return `status=${response.status}, organisms=${schema.organisms.length}, behaviors=${schema.behaviors.length}`;
});

const skipped = results.filter((r) => r.detail.startsWith('skipped')).length;
const passed = results.filter((r) => r.pass).length;
console.log(JSON.stringify({ app: 'kflow', passed, total: results.length, skipped, results }, null, 2));
await browser.close();
process.exit(passed === results.length ? 0 : 1);
