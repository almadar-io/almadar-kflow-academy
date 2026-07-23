import { getFirestore } from '@almadar/server';
import { createLogger } from '@almadar/logger';
import type { CompanionPersonaDTO } from '@kflow-academy/shared';

const log = createLogger('kflow:server:companionPersonaService');

const WIKI_UA = 'KFlowAcademy/1.0 (https://kflow.academy)';
const WIKI_TIMEOUT_MS = 6000;
const REGISTRY_DOC = 'registry';

/**
 * Curated registry of historical educator figures — the deterministic source
 * of truth for companion personas. Each name is a canonical English Wikipedia
 * article title (guaranteed to have a Wikimedia Commons portrait). The companion
 * cycles through these daily so the learner sees a fresh mentor each day.
 */
const COMPANION_FIGURES = [
  'Socrates',
  'Aristotle',
  'Plato',
  'Confucius',
  'Hypatia',
  'Avicenna',
  'Galileo Galilei',
  'Marie Curie',
  'Ada Lovelace',
  'Albert Einstein',
] as const;

interface WikiPage {
  missing?: '' | boolean;
  description?: string;
  extract?: string;
  thumbnail?: { source?: string };
}
interface WikiQueryResponse {
  query?: { pages?: Record<string, WikiPage> };
}

interface CachedEntry {
  persona: CompanionPersonaDTO;
  bio: string;
}
interface RegistryDoc {
  entries: CachedEntry[];
  cachedAt: number;
}

async function fetchWikiPersona(name: string): Promise<{ description: string; portraitUrl?: string; bio: string }> {
  const title = encodeURIComponent(name.trim());
  const url =
    'https://en.wikipedia.org/w/api.php?action=query&format=json&redirects=1' +
    '&prop=pageimages|description|extracts&explaintext=1&exintro=1' +
    '&piprop=thumbnail&pithumbsize=240&titles=' +
    title;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), WIKI_TIMEOUT_MS);
  try {
    const res = await fetch(url, { headers: { 'User-Agent': WIKI_UA }, signal: ctrl.signal });
    if (!res.ok) return { description: name, bio: '' };
    const data = (await res.json()) as WikiQueryResponse;
    const pages = data.query?.pages;
    if (!pages) return { description: name, bio: '' };
    const page = Object.values(pages)[0];
    if (!page || page.missing !== undefined) return { description: name, bio: '' };
    const extract = typeof page.extract === 'string' ? page.extract.trim() : '';
    return {
      description: page.description ?? (extract ? extract.split('.')[0] : name),
      portraitUrl: page.thumbnail?.source,
      bio: extract,
    };
  } catch (e) {
    log.debug('fetchWikiPersona miss', { name, error: e instanceof Error ? e.message : String(e) });
    return { description: name, bio: '' };
  } finally {
    clearTimeout(timer);
  }
}

let registryCache: CachedEntry[] | null = null;

async function loadRegistry(): Promise<CachedEntry[]> {
  if (registryCache) return registryCache;

  const ref = getFirestore().collection('companion-personas').doc(REGISTRY_DOC);
  const cached = await ref.get();
  if (cached.exists) {
    const doc = cached.data() as RegistryDoc;
    if (doc.entries?.length > 0) {
      registryCache = doc.entries;
      log.info('loadRegistry CACHE HIT', { count: doc.entries.length });
      return registryCache;
    }
  }

  log.info('loadRegistry FRESH — fetching all figures from Wikipedia', { count: COMPANION_FIGURES.length });
  const results = await Promise.all(
    COMPANION_FIGURES.map(async (name) => {
      const wiki = await fetchWikiPersona(name);
      const entry: CachedEntry = {
        persona: {
          name,
          description: wiki.description,
          portraitUrl: wiki.portraitUrl,
        },
        bio: wiki.bio,
      };
      return entry;
    }),
  );

  // Keep only figures that resolved with a portrait
  const valid = results.filter((e) => e.persona.portraitUrl);
  if (valid.length === 0) {
    log.error('loadRegistry: no figures resolved with portraits');
    return COMPANION_FIGURES.map((name) => ({
      persona: { name, description: name, portraitUrl: undefined },
      bio: '',
    }));
  }

  const doc: RegistryDoc = { entries: valid, cachedAt: Date.now() };
  await ref.set(doc).catch((e) =>
    log.warn('companion-persona registry write failed', { error: e instanceof Error ? e.message : String(e) }),
  );
  registryCache = valid;
  log.info('loadRegistry cached', { count: valid.length, names: valid.map((e) => e.persona.name) });
  return valid;
}

/** Deterministic daily rotation index. */
function dayIndex(total: number): number {
  const epochDays = Math.floor(Date.now() / (24 * 60 * 60 * 1000));
  return epochDays % total;
}

/**
 * Return the companion persona for today. Cycles through the curated registry
 * of historical educator figures — one per UTC day — so the learner sees a
 * fresh mentor daily while the identity stays stable within a session.
 */
export async function getCompanionPersona(): Promise<CompanionPersonaDTO> {
  const entries = await loadRegistry();
  const persona = entries[dayIndex(entries.length)].persona;
  log.info('getCompanionPersona', { name: persona.name, hasPortrait: !!persona.portraitUrl });
  return persona;
}

/** Load the cached full bio for today's persona, grounding chat replies. */
export async function loadCompanionBio(): Promise<{ name: string; description: string; bio: string }> {
  const entries = await loadRegistry();
  const entry = entries[dayIndex(entries.length)];
  return { name: entry.persona.name, description: entry.persona.description, bio: entry.bio };
}
