import { getFirestore } from '@almadar/server';
import { createLogger } from '@almadar/logger';

const log = createLogger('kflow:server:conceptImageService');

const WIKI_UA = 'KFlowAcademy/1.0 (https://kflow.academy)';
const WIKI_TIMEOUT_MS = 6000;
const THUMB_SIZE = 240;

interface WikiPage {
  missing?: '' | boolean;
  thumbnail?: { source?: string };
}
interface WikiQueryResponse {
  query?: { pages?: Record<string, WikiPage> };
}

function cacheKey(label: string): string {
  return label.trim().toLowerCase().replace(/\s+/g, '-').slice(0, 120);
}

/**
 * Fetch a representative lead image for a concept/topic from Wikipedia (PageImages API),
 * cached per topic in Firestore so the external call happens at most once per topic. Both
 * hits and misses are cached (misses store url=null) to avoid repeat lookups for topics
 * with no Wikipedia image. Returns the thumbnail URL or null.
 */
export async function getConceptImage(label: string): Promise<string | null> {
  const key = cacheKey(label);
  if (!key) return null;
  const ref = getFirestore().collection('concept-images').doc(key);
  const cached = await ref.get();
  if (cached.exists) {
    return (cached.data() as { url?: string | null }).url ?? null;
  }
  const url = await fetchWikiImage(label);
  await ref.set({ label: label.trim(), url, fetchedAt: Date.now() });
  log.info('getConceptImage fetched', { label, hit: !!url });
  return url;
}

async function fetchWikiImage(label: string): Promise<string | null> {
  const title = encodeURIComponent(label.trim());
  const url =
    'https://en.wikipedia.org/w/api.php?action=query&format=json&redirects=1' +
    '&prop=pageimages&piprop=thumbnail&pithumbsize=' + THUMB_SIZE + '&titles=' + title;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), WIKI_TIMEOUT_MS);
  try {
    const res = await fetch(url, { headers: { 'User-Agent': WIKI_UA }, signal: ctrl.signal });
    if (!res.ok) return null;
    const data = (await res.json()) as WikiQueryResponse;
    const pages = data.query?.pages;
    if (!pages) return null;
    const page = Object.values(pages)[0];
    if (!page || page.missing !== undefined) return null;
    return page.thumbnail?.source ?? null;
  } catch (e) {
    log.debug('fetchWikiImage miss', { label, error: e instanceof Error ? e.message : String(e) });
    return null;
  } finally {
    clearTimeout(timer);
  }
}
