import { getFirestore } from '@almadar/server';
import { createLogger } from '@almadar/logger';

const log = createLogger('kflow:server:conceptIconService');
const UA = 'KFlowAcademy/1.0 (https://kflow.academy)';
const TIMEOUT_MS = 6000;
const API = 'https://api.iconify.design';

/** devicon slug overrides for concepts whose canonical slug isn't the literal name. */
const DEVICON_SLUG_OVERRIDES: Record<string, string> = {
  'c++': 'cpp', 'cpp': 'cpp', 'c#': 'csharp', 'csharp': 'csharp',
  'nodejs': 'nodejs', 'node': 'nodejs', 'dotnet': 'dotnet', '.net': 'dotnet',
  'golang': 'go', 'typescript': 'typescript', 'javascript': 'javascript',
  'objective-c': 'objectivec',
};

/** Perceptual luminance threshold (0–255). Icons at/above this are "light" → need a dark tile. */
const LIGHT_THRESHOLD = 170;

export type IconTone = 'themed' | 'dark' | 'light';
export interface ConceptIconResult { icon: string; tone: IconTone; }

interface IconCollection { icons?: Record<string, { body: string }>; aliases?: Record<string, { body: string }>; }
interface SearchResponse { icons?: string[]; }

function cacheKey(label: string): string {
  return label.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 120);
}
function deviconSlug(label: string): string {
  const norm = label.trim().toLowerCase();
  if (DEVICON_SLUG_OVERRIDES[norm]) return DEVICON_SLUG_OVERRIDES[norm];
  return norm.replace(/[^a-z0-9]/g, '');
}

async function exists(url: string): Promise<boolean> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, { method: 'GET', headers: { 'User-Agent': UA }, signal: ctrl.signal });
    return res.ok;
  } catch { return false; } finally { clearTimeout(timer); }
}
async function fetchJson<T>(url: string): Promise<T | null> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, { headers: { 'User-Agent': UA }, signal: ctrl.signal });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch { return null; } finally { clearTimeout(timer); }
}

function hexLuminance(hex: string): number {
  let h = hex.replace('#', '');
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  if (h.length < 6) return 0;
  const r = parseInt(h.slice(0, 2), 16), g = parseInt(h.slice(2, 4), 16), b = parseInt(h.slice(4, 6), 16);
  return 0.299 * r + 0.587 * g + 0.114 * b;
}

/**
 * Classify an icon's color tone so the client can pick a contrasting circle background:
 * - `themed`: uses currentColor (adapts to text color).
 * - `dark`: predominantly dark colors (or default-black, no fill) → needs a light tile.
 * - `light`: predominantly light colors → needs a dark tile.
 */
function classifyTone(body: string): IconTone {
  if (/currentColor/i.test(body)) return 'themed';
  const hexes = [...body.matchAll(/#[0-9a-fA-F]{6}\b/g)].map((m) => m[0]);
  if (hexes.length === 0) return 'dark';
  const avg = hexes.reduce((s, h) => s + hexLuminance(h), 0) / hexes.length;
  return avg >= LIGHT_THRESHOLD ? 'light' : 'dark';
}

async function fetchBody(iconId: string): Promise<string | null> {
  const [prefix, name] = iconId.split(':');
  if (!prefix || !name) return null;
  const data = await fetchJson<IconCollection>(`${API}/${prefix}.json?icons=${encodeURIComponent(name)}`);
  return data?.icons?.[name]?.body ?? data?.aliases?.[name]?.body ?? null;
}

/**
 * Resolve a concept to an Iconify icon id (real brand logo via devicon, else a relevance
 * search), and classify its color tone so the client can render it on a contrasting
 * background. Cached per topic in Firestore (hits and misses). Returns { icon, tone } or null.
 */
export async function getConceptIcon(label: string): Promise<ConceptIconResult | null> {
  const term = label.trim();
  const key = cacheKey(term);
  if (!key) return null;
  const ref = getFirestore().collection('concept-icons').doc(key);
  const cached = await ref.get();
  if (cached.exists) {
    const c = cached.data() as { icon?: string | null; tone?: IconTone };
    if (!c.icon) return null;
    return { icon: c.icon, tone: c.tone ?? 'dark' };
  }

  let iconId: string | null = null;
  const slug = deviconSlug(term);
  if (slug && await exists(`${API}/devicon/${slug}.svg`)) iconId = `devicon:${slug}`;
  if (!iconId) {
    const data = await fetchJson<SearchResponse>(`${API}/search?query=${encodeURIComponent(term)}&limit=1`);
    iconId = data?.icons?.[0] ?? null;
  }

  let result: ConceptIconResult | null = null;
  if (iconId) {
    const body = await fetchBody(iconId);
    result = body ? { icon: iconId, tone: classifyTone(body) } : null;
  }
  await ref.set({ label: term, icon: result?.icon ?? null, tone: result?.tone ?? null, fetchedAt: Date.now() });
  log.info('getConceptIcon resolved', { label: term, icon: result?.icon, tone: result?.tone });
  return result;
}
