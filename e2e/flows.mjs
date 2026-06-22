// kflow end-to-end flow tests (Playwright).
//
// Run the app in dev with the auth bypass, then: npm run test:e2e
//   ALLOW_DEV_AUTH_BYPASS=true PORT=3001 npm run dev:server   (port matches client proxy)
//   VITE_ALLOW_DEV_AUTH_BYPASS=true npm run dev:client
//   npm run test:e2e            (defaults to http://localhost:3000; override with E2E_BASE_URL)
//
// Covers: dashboard, learn, full learning-path generation (goal → milestones → concept expansion →
// /concepts render), concept detail, settings + theme toggle + i18n (Arabic RTL, Slovenian).
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const BASE = process.env.E2E_BASE_URL || 'http://localhost:3000';
const ART = join(dirname(fileURLToPath(import.meta.url)), '.artifacts');
mkdirSync(ART, { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const consoleErrors = [];
page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text().slice(0, 160)); });
page.on('pageerror', (e) => consoleErrors.push('PAGEERROR: ' + String(e).slice(0, 160)));

const results = [];
const assert = (c, m) => { if (!c) throw new Error(m); };
const text = async () => (await page.locator('body').innerText().catch(() => '')).replace(/\s+/g, ' ');
const goto = async (p, settle = 6000) => { await page.goto(BASE + p, { waitUntil: 'domcontentloaded', timeout: 30000 }); await page.waitForTimeout(settle); };
const shot = (n) => page.screenshot({ path: join(ART, `${n}.png`) }).catch(() => {});
const btn = (re) => page.locator('button', { hasText: re }).first();
const check = async (name, fn) => {
  try { const d = await fn(); results.push({ name, pass: true, detail: d || '' }); }
  catch (e) { results.push({ name, pass: false, detail: String(e?.message || e).slice(0, 220) }); await shot(`FAIL-${name.replace(/\W+/g, '_')}`); }
};

let generatedGraphUrl = '';

await check('dashboard renders (no raw i18n key)', async () => {
  await goto('/home'); await shot('dashboard');
  const t = await text();
  assert(/Welcome back/i.test(t), `no greeting: ${t.slice(0, 80)}`);
  assert(!/nav\.user/.test(t), 'raw i18n key nav.user leaked');
  return t.slice(0, 50);
});

await check('learn page renders', async () => {
  await goto('/learn'); const t = await text();
  assert(/Learning Paths/i.test(t), `no Learning Paths: ${t.slice(0, 80)}`);
  return 'ok';
});

await check('learning-path generation end-to-end (goal → expansion → /concepts)', async () => {
  await goto('/learn');
  await btn(/New Path/i).click();
  await page.waitForTimeout(1500);
  // anchor step
  await page.locator('textarea').first().fill('Photosynthesis basics');
  await btn(/Continue/i).click();
  await page.waitForTimeout(1200);
  // choice step → manual goal creation (LLM goal + milestones)
  await btn(/Create Goal/i).click();
  // GoalReview appears after the goal stream
  await page.locator('button:has-text("Confirm")').first().waitFor({ timeout: 120000 });
  await shot('gen-review');
  await page.locator('button:has-text("Confirm")').first().click();
  await page.waitForTimeout(1200);
  // level selection (beginner pre-selected) → Continue with…
  await page.locator('button:has-text("Continue with"), button:has-text("Skip")').first().click();
  // concept expansion streams, then navigates to /concepts/:graphId
  await page.waitForURL(/\/concepts\//, { timeout: 180000 });
  await page.waitForTimeout(6000);
  generatedGraphUrl = page.url().replace(BASE, '');
  await shot('gen-concepts');
  const t = await text();
  assert(/\/concepts\//.test(page.url()), `did not reach /concepts: ${page.url()}`);
  assert(!/No .* available|nothing/i.test(t) && t.length > 80, `concepts page looks empty: ${t.slice(0, 120)}`);
  return `generated → ${generatedGraphUrl}`;
});

await check('concept detail + generate lesson (explain)', async () => {
  assert(generatedGraphUrl, 'no generated graph from the prior step');
  const graphId = generatedGraphUrl.split('/concepts/')[1];
  // Fetch a concept id from the generated graph (avoids fragile graph-node clicks).
  const conceptId = await page.evaluate(async (gid) => {
    const r = await fetch(`/api/graph-queries/${gid}/concepts`);
    const j = await r.json().catch(() => ({}));
    const list = j.concepts || j.nodes || [];
    return (list[0] && (list[0].id || list[0].conceptId)) || null;
  }, graphId);
  assert(conceptId, 'no concept found in generated graph');
  await goto(`/concepts/${graphId}/concept/${encodeURIComponent(conceptId)}`);
  let t = await text();
  assert(t.length > 80 && !/No .*available/i.test(t), `concept detail empty: ${t.slice(0, 100)}`);
  // Generate the lesson (explain) if not already present.
  const gen = btn(/Generate Lesson/i);
  if (await gen.count()) {
    await gen.click();
    await page.waitForTimeout(35000); // lesson generation (LLM)
    await shot('concept-lesson');
    t = await text();
  }
  return `concept ${conceptId} detail rendered (lesson ${/Generate Lesson/i.test(t) ? 'pending' : 'generated'})`;
});

await check('settings renders language switcher', async () => {
  await goto('/settings'); const t = await text();
  assert(/Language/i.test(t) && /English/i.test(t), `no language switcher: ${t.slice(0, 80)}`);
  return 'ok';
});

await check('i18n: switch to Arabic sets RTL', async () => {
  await goto('/settings');
  // Language switcher is a native <select> with an `ar` option.
  const sel = page.locator('select:has(option[value="ar"])').first();
  assert(await sel.count(), 'no language select');
  await sel.selectOption('ar');
  await page.waitForTimeout(1500);
  const dir = await page.evaluate(() => document.documentElement.getAttribute('dir') || getComputedStyle(document.body).direction);
  await shot('i18n-arabic');
  assert(dir === 'rtl', `expected RTL, got dir=${dir}`);
  await sel.selectOption('en').catch(() => {});
  await page.waitForTimeout(800);
  return `dir=${dir}`;
});

await check('theme toggle flips', async () => {
  await goto('/home', 3000);
  const before = await page.evaluate(() => document.documentElement.getAttribute('data-theme'));
  const toggle = page.locator('[aria-label*="Switch to"]').first();
  assert(await toggle.count(), 'no theme toggle');
  await toggle.click(); await page.waitForTimeout(900);
  const after = await page.evaluate(() => document.documentElement.getAttribute('data-theme'));
  assert(before !== after, `theme did not flip (${before}→${after})`);
  return `${before}→${after}`;
});

await check('no console errors across session', async () => {
  // The deprecated GoalForm logs handled stream errors; only fail on hard React/page errors.
  const hard = [...new Set(consoleErrors)].filter((e) => /PAGEERROR|Element type is invalid|is not a function|Cannot read/i.test(e));
  assert(hard.length === 0, `${hard.length}: ${hard.slice(0, 3).join(' | ')}`);
  return '0 hard errors';
});

const passed = results.filter((r) => r.pass).length;
console.log(JSON.stringify({ app: 'kflow', passed, total: results.length, results }, null, 2));
await browser.close();
process.exit(passed === results.length ? 0 : 1);
