import { getFirestore } from '@almadar/server';
import { createLogger } from '@almadar/logger';
import { callLLM, extractJSONObject } from './llm';
import type { ConceptPersonaDTO } from '@kflow-academy/shared';

const log = createLogger('kflow:server:conceptPersonaService');

const MAX_HISTORY_TURNS = 8;
const WIKI_UA = 'KFlowAcademy/1.0 (https://kflow.academy)';
const WIKI_TIMEOUT_MS = 6000;
const BIO_CHAR_CAP = 2000;

interface WikiPage {
  missing?: '' | boolean;
  title?: string;
  description?: string;
  extract?: string;
  thumbnail?: { source?: string };
}
interface WikiQueryResponse {
  query?: { pages?: Record<string, WikiPage> };
}

/** Client-facing persona (no heavy bio). */
type PersonaResult = { persona: ConceptPersonaDTO; greeting: string };
/** Server-side full persona incl. the Wikipedia bio used to ground replies. */
interface FullPersona {
  name: string;
  description: string;
  bio: string;
}
interface CachedPersona extends PersonaResult {
  bio: string;
  cachedAt: number;
}

function cacheKey(conceptLabel: string): string {
  return conceptLabel.toLowerCase().replace(/[^a-z0-9_-]+/g, '_').slice(0, 180) || 'concept';
}

/** A concept id leaked through as the label (client bug) — the model can't identify it. */
export function looksLikeId(label: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-/i.test(label) || /^\d+$/.test(label);
}

/**
 * Look up the originator on Wikipedia (one redirect-resolved call): a verified one-line bio,
 * a real Wikimedia Commons portrait, AND the full lead-section biography used to ground the
 * model's in-character replies. Returns {} on any miss — caller keeps the LLM description and
 * renders a monogram avatar. Wikimedia requires a descriptive User-Agent.
 */
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
 * On-the-fly AI persona for a concept: the historically credited originator/pioneer, named by
 * deepseek-chat (v4-flash) then enriched + fact-checked via Wikipedia (real portrait + verified
 * bio + full lead-section biography). Cached per concept so identity is stable and the external
 * calls happen at most once per concept. The client receives the light persona; the full bio
 * stays server-side and grounds every reply.
 */
export async function generatePersona(conceptLabel: string): Promise<PersonaResult> {
  if (looksLikeId(conceptLabel)) {
    log.warn('!! concept-chat received an ID/UUID as conceptLabel — client sent an identifier, not a concept name', { conceptLabel });
  }
  const ref = getFirestore().collection('concept-personas').doc(cacheKey(conceptLabel));
  const cached = await ref.get();
  if (cached.exists) {
    const c = cached.data() as CachedPersona;
    log.info('generatePersona CACHE HIT', { conceptLabel, name: c.persona.name, isId: looksLikeId(conceptLabel) });
    return { persona: c.persona, greeting: c.greeting };
  }

  const resp = await callLLM({
    temperature: 0.3,
    maxTokens: 220,
    systemPrompt:
      'You identify the single most historically credited originator or pioneer of a learning ' +
      'concept, then greet a learner in their voice. Reply ONLY with compact JSON: ' +
      '{"name":<full canonical name as it would title a Wikipedia article, e.g. "Isaac Newton">,' +
      '"description":<one sentence, max ~20 words: who they are + key contribution>,' +
      '"greeting":<one warm first-person sentence, in character, mentioning the concept>}. ' +
      'If no single person is credited, pick the most iconic figure associated with it. ' +
      'Never invent a fictional person.',
    userPrompt: `Concept: ${conceptLabel}`,
  });
  const obj = extractJSONObject(resp.content);
  const name = typeof obj.name === 'string' && obj.name.trim() ? obj.name.trim() : conceptLabel;
  const llmDescription =
    typeof obj.description === 'string' && obj.description.trim()
      ? obj.description.trim()
      : `A pioneer associated with ${conceptLabel}.`;
  const greeting =
    typeof obj.greeting === 'string' && obj.greeting.trim()
      ? obj.greeting.trim()
      : `Hello — I'm ${name}. Ask me anything about ${conceptLabel}.`;

  const wiki = await fetchWikiPersona(name);
  const persona: ConceptPersonaDTO = {
    name,
    description: wiki.description ?? llmDescription,
    portraitUrl: wiki.portraitUrl,
  };
  const result: PersonaResult = { persona, greeting };
  const cachedDoc: CachedPersona = { ...result, bio: wiki.bio ?? '', cachedAt: Date.now() };
  await ref.set(cachedDoc).catch((e) =>
    log.warn('concept-persona cache write failed', { error: e instanceof Error ? e.message : String(e) }),
  );
  log.info('generatePersona FRESH', { conceptLabel, name, hasPortrait: !!persona.portraitUrl, isId: looksLikeId(conceptLabel) });
  return result;
}

/** Load the cached full persona (with bio) for grounding replies; generates if absent. */
export async function loadFullPersona(conceptLabel: string): Promise<FullPersona> {
  const ref = getFirestore().collection('concept-personas').doc(cacheKey(conceptLabel));
  const snap = await ref.get();
  if (snap.exists) {
    const c = snap.data() as CachedPersona;
    return { name: c.persona.name, description: c.persona.description, bio: c.bio };
  }
  await generatePersona(conceptLabel);
  const fresh = await ref.get();
  const c = fresh.data() as CachedPersona;
  return { name: c.persona.name, description: c.persona.description, bio: c.bio };
}

/**
 * Reply in the persona's voice, grounded in the concept + the full Wikipedia biography + recent
 * transcript. deepseek-chat (v4-flash) is reliable on persona *when grounded* by the bio — which
 * is why the biography is injected here rather than trusted to the model's parametric memory.
 */
export async function replyAsPersona(
  full: FullPersona,
  conceptLabel: string,
  history: { role: 'user' | 'assistant'; content: string }[],
  userMessage: string,
): Promise<string> {
  const trimmed = history
    .slice(-MAX_HISTORY_TURNS)
    .map((m) => `${m.role === 'user' ? 'Learner' : full.name}: ${m.content}`)
    .join('\n');
  const resp = await callLLM({
    temperature: 0.6,
    maxTokens: 320,
    systemPrompt:
      `You are ${full.name}. ${full.description}\n\n` +
      `Your biography (factual grounding — Wikipedia):\n${full.bio || '(no biography available)'}\n\n` +
      `A learner is studying "${conceptLabel}". Reply in first person, in character as ${full.name}, ` +
      `warmly and concisely (max ~120 words). Draw on your real life and contributions above. ` +
      `Stay factual to the biography; if asked something outside it, say so plainly rather than invent. ` +
      `Do not break character.`,
    userPrompt: trimmed ? `${trimmed}\nLearner: ${userMessage}` : userMessage,
  });
  const content = typeof resp.content === 'string' ? resp.content.trim() : '';
  return content || `I'm not certain — let's explore ${conceptLabel} together.`;
}
