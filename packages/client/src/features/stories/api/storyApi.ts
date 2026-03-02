/**
 * API client for story-browsing, series-browsing, and progress-tracking endpoints.
 * Communicates with the Orbital-compiled Express server.
 */

const COMPILED_SERVER = import.meta.env.VITE_COMPILED_API_URL || 'http://localhost:3030';

async function sendEvent(
  trait: string,
  event: string,
  payload?: Record<string, unknown>,
  authToken?: string,
): Promise<Record<string, unknown>> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }

  const res = await fetch(`${COMPILED_SERVER}/api/${trait}/events`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ event, payload }),
  });

  if (!res.ok) {
    throw new Error(`API error: ${res.status} ${res.statusText}`);
  }

  return res.json();
}

export const storyApi = {
  /** Fetch all stories (public, no auth needed) */
  listStories: () => sendEvent('story-browsing', 'INIT'),

  /** Fetch single story by ID (public) */
  getStory: (storyId: string) => sendEvent('story-browsing', 'SELECT', { storyId }),

  /** Fetch all series (public) */
  listSeries: () => sendEvent('series-browsing', 'INIT'),

  /** Fetch single series by ID (public) */
  getSeries: (seriesId: string) => sendEvent('series-browsing', 'SELECT', { seriesId }),

  /** Fetch user progress (requires auth) */
  getUserProgress: (authToken: string) =>
    sendEvent('progress-tracking', 'INIT', undefined, authToken),

  /** Save progress for a story (requires auth) */
  saveProgress: (
    authToken: string,
    storyId: string,
    score: number,
    completed: boolean,
  ) =>
    sendEvent('progress-tracking', 'SAVE_PROGRESS', { storyId, score, completed }, authToken),
};
