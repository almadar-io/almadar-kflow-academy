import { getFirestore } from '@almadar/server';
import { createLogger } from '@almadar/logger';
import { callLLM, extractJSONObject } from './llm';
import type { CompanionPersonaDTO } from '@kflow-academy/shared';

const log = createLogger('kflow:server:companionPersonaService');

const WIKI_UA = 'KFlowAcademy/1.0 (https://kflow.academy)';
const WIKI_TIMEOUT_MS = 6000;
const BIO_CHAR_CAP = 2000;
const CACHE_DOC = 'companion-persona';

interface WikiPage {
  missing?: '' | boolean;
  description?: string;
  extract?: string;
  thumbnail?: { source?: string };
}
interface WikiQueryResponse {
  query?: { pages?: Record<string, WikiPage> };
}

interface CachedPersona {
  persona: CompanionPersonaDTO;
  bio: string;
  cachedAt: number;
}

const SYSTEM_PROMPT =
  'You identify the single most iconic historical figure who embodies the spirit of a learning ' +
  'companion — a wise teacher, tutor, or mentor who guides learners through knowledge. ' +
  'Reply ONLY with compact JSON: ' +
  '{"name":<a SPECIFIC REAL HUMAN BEING\'s full canonical name as it would title a Wikipedia article>,' +
  '"description":<one sentence, max ~20 words: who they are + why they embody guided learning>}. ' +
  'HARD RULES: "name" MUST be a real human being known for teaching or mentoring. ' +
  'Prefer classical figures (e.g. Socrates, Aristotle, Confucius) but pick the single best fit. ' +
  'Never invent a fictional person.';

async function fetchWikiPersona(name: string): Promise<{ description?: string; portraitUrl?: string; bio?: string }> {
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
    if (!res.ok) return {};
    const data = (await res.json()) as WikiQueryResponse;
    const pages = data.query?.pages;
    if (!pages) return {};
    const page = Object.values(pages)[0];
    if (!page || page.missing !== undefined) return {};
    const bio = typeof page.extract === 'string' ? page.extract.slice(0, BIO_CHAR_CAP).trim() : undefined;
    return {
      description: page.description ?? (typeof page.extract === 'string' ? page.extract.split('.')[0] : undefined),
      portraitUrl: page.thumbnail?.source,
      bio,
    };
  } catch (e) {
    log.debug('fetchWikiPersona miss', { name, error: e instanceof Error ? e.message : String(e) });
    return {};
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Generate (or load from cache) the companion's stable persona: a historical
 * educator figure named by the LLM, enriched with a real Wikimedia Commons
 * portrait + verified bio. Cached globally (single document) so identity is
 * stable across all users and sessions.
 */
export async function getCompanionPersona(): Promise<CompanionPersonaDTO> {
  const ref = getFirestore().collection('companion-personas').doc(CACHE_DOC);
  const cached = await ref.get();
  if (cached.exists) {
    const c = cached.data() as CachedPersona;
    log.info('getCompanionPersona CACHE HIT', { name: c.persona.name });
    return c.persona;
  }

  const resp = await callLLM({
    temperature: 0.4,
    maxTokens: 200,
    systemPrompt: SYSTEM_PROMPT,
    userPrompt: 'Concept: The ideal learning companion — a wise mentor who guides a curious learner through a knowledge graph.',
  });
  const obj = extractJSONObject(resp.content);
  let name = typeof obj.name === 'string' && obj.name.trim() ? obj.name.trim() : 'Socrates';
  const llmDescription =
    typeof obj.description === 'string' && obj.description.trim()
      ? obj.description.trim()
      : 'A wise mentor guiding your learning journey.';

  const wiki = await fetchWikiPersona(name);
  if (!wiki.portraitUrl) {
    // Retry with a well-known fallback if Wikipedia has no portrait
    name = 'Socrates';
    const fallback = await fetchWikiPersona(name);
    const persona: CompanionPersonaDTO = {
      name,
      description: fallback.description ?? llmDescription,
      portraitUrl: fallback.portraitUrl,
    };
    const cachedDoc: CachedPersona = { persona, bio: fallback.bio ?? '', cachedAt: Date.now() };
    await ref.set(cachedDoc).catch((e) =>
      log.warn('companion-persona cache write failed', { error: e instanceof Error ? e.message : String(e) }),
    );
    log.info('getCompanionPersona FRESH (fallback)', { name: persona.name, hasPortrait: !!persona.portraitUrl });
    return persona;
  }

  const persona: CompanionPersonaDTO = {
    name,
    description: wiki.description ?? llmDescription,
    portraitUrl: wiki.portraitUrl,
  };
  const cachedDoc: CachedPersona = { persona, bio: wiki.bio ?? '', cachedAt: Date.now() };
  await ref.set(cachedDoc).catch((e) =>
    log.warn('companion-persona cache write failed', { error: e instanceof Error ? e.message : String(e) }),
  );
  log.info('getCompanionPersona FRESH', { name: persona.name, hasPortrait: !!persona.portraitUrl });
  return persona;
}

/** Load the cached full bio for grounding chat replies. */
export async function loadCompanionBio(): Promise<{ name: string; description: string; bio: string }> {
  const ref = getFirestore().collection('companion-personas').doc(CACHE_DOC);
  const snap = await ref.get();
  if (snap.exists) {
    const c = snap.data() as CachedPersona;
    return { name: c.persona.name, description: c.persona.description, bio: c.bio };
  }
  await getCompanionPersona();
  const fresh = await ref.get();
  const c = fresh.data() as CachedPersona;
  return { name: c.persona.name, description: c.persona.description, bio: c.bio };
}
