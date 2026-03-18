/**
 * Story API Client
 *
 * Dual-source: reads from the main server's knowledge graph (primary)
 * and falls back to the Orbital compiled server for trait-based interactions.
 *
 * Write operations go to the knowledge graph server.
 * Interactive state machine events go to the Orbital server.
 */

import { apiClient } from '../../../services/apiClient';
import { auth } from '../../../config/firebase';

const COMPILED_SERVER = import.meta.env.VITE_COMPILED_API_URL || 'http://localhost:3030';

// ---------------------------------------------------------------------------
// Orbital trait server (interactive state machines)
// ---------------------------------------------------------------------------

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
    throw new Error(`Orbital API error: ${res.status} ${res.statusText}`);
  }

  return res.json();
}

// ---------------------------------------------------------------------------
// Knowledge Graph server (persistence layer)
// ---------------------------------------------------------------------------

async function getAuthToken(): Promise<string | undefined> {
  try {
    const user = auth.currentUser;
    if (!user) return undefined;
    return await user.getIdToken();
  } catch {
    return undefined;
  }
}

export const storyApi = {
  // -------------------------------------------------------------------------
  // Stories - read from knowledge graph, fall back to orbital
  // -------------------------------------------------------------------------

  /** Fetch all stories */
  async listStories(): Promise<Record<string, unknown>> {
    try {
      const result = await apiClient.fetch('/api/content/stories');
      return { entities: result.stories, data: result.stories };
    } catch {
      // Fall back to orbital server
      return sendEvent('story-browsing', 'INIT');
    }
  },

  /** Fetch single story by ID */
  async getStory(storyId: string): Promise<Record<string, unknown>> {
    try {
      const result = await apiClient.fetch(`/api/content/stories/${storyId}`);
      return { entity: result.story, data: result.story };
    } catch {
      return sendEvent('story-browsing', 'SELECT', { storyId });
    }
  },

  // -------------------------------------------------------------------------
  // Series
  // -------------------------------------------------------------------------

  /** Fetch all series */
  async listSeries(): Promise<Record<string, unknown>> {
    try {
      const result = await apiClient.fetch('/api/content/series');
      return { entities: result.series, data: result.series };
    } catch {
      return sendEvent('series-browsing', 'INIT');
    }
  },

  /** Fetch single series by ID */
  async getSeries(seriesId: string): Promise<Record<string, unknown>> {
    try {
      const result = await apiClient.fetch(`/api/content/series/${seriesId}`);
      return { entity: result.series, data: result.series };
    } catch {
      return sendEvent('series-browsing', 'SELECT', { seriesId });
    }
  },

  // -------------------------------------------------------------------------
  // Write operations (dual-write: knowledge graph + orbital)
  // -------------------------------------------------------------------------

  /** Create a new story — writes to both knowledge graph and orbital server */
  async createStory(story: Record<string, unknown>): Promise<Record<string, unknown>> {
    // Write to knowledge graph (primary)
    const result = await apiClient.fetch('/api/content/stories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(story),
    });

    // Sync to orbital compiled server (fire-and-forget)
    sendEvent('story-browsing', 'CREATE', story).catch(() => {
      // Orbital sync failure is non-fatal
    });

    return result;
  },

  /** Update an existing story — writes to both knowledge graph and orbital server */
  async updateStory(storyId: string, updates: Record<string, unknown>): Promise<Record<string, unknown>> {
    const result = await apiClient.fetch(`/api/content/stories/${storyId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });

    // Sync to orbital compiled server (fire-and-forget)
    sendEvent('story-browsing', 'UPDATE', { storyId, ...updates }).catch(() => {});

    return result;
  },

  /** Delete a story — deletes from both knowledge graph and orbital server */
  async deleteStory(storyId: string): Promise<Record<string, unknown>> {
    const result = await apiClient.fetch(`/api/content/stories/${storyId}`, {
      method: 'DELETE',
    });

    // Sync to orbital compiled server (fire-and-forget)
    sendEvent('story-browsing', 'DELETE', { storyId }).catch(() => {});

    return result;
  },

  /** Create a new series — writes to both */
  async createSeries(series: Record<string, unknown>): Promise<Record<string, unknown>> {
    const result = await apiClient.fetch('/api/content/series', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(series),
    });

    sendEvent('series-browsing', 'CREATE', series).catch(() => {});

    return result;
  },

  /** Update a series — writes to both */
  async updateSeries(seriesId: string, updates: Record<string, unknown>): Promise<Record<string, unknown>> {
    const result = await apiClient.fetch(`/api/content/series/${seriesId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });

    sendEvent('series-browsing', 'UPDATE', { seriesId, ...updates }).catch(() => {});

    return result;
  },

  /** Delete a series — deletes from both */
  async deleteSeries(seriesId: string): Promise<Record<string, unknown>> {
    const result = await apiClient.fetch(`/api/content/series/${seriesId}`, {
      method: 'DELETE',
    });

    sendEvent('series-browsing', 'DELETE', { seriesId }).catch(() => {});

    return result;
  },

  // -------------------------------------------------------------------------
  // Progress - knowledge graph with orbital fallback
  // -------------------------------------------------------------------------

  /** Fetch user progress */
  async getUserProgress(authToken?: string): Promise<Record<string, unknown>> {
    try {
      const result = await apiClient.fetch('/api/content/progress');
      return { entities: result.progress, data: result.progress };
    } catch {
      const token = authToken || await getAuthToken();
      if (!token) throw new Error('Not authenticated');
      return sendEvent('progress-tracking', 'INIT', undefined, token);
    }
  },

  /** Save progress for a story — dual-write to knowledge graph and orbital */
  async saveProgress(
    authToken: string | undefined,
    storyId: string,
    score: number,
    completed: boolean,
  ): Promise<Record<string, unknown>> {
    const token = authToken || await getAuthToken();

    // Write to knowledge graph (primary)
    const result = await apiClient.fetch('/api/content/progress', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ storyId, score, completed }),
    });

    // Sync to orbital compiled server (fire-and-forget)
    if (token) {
      sendEvent('progress-tracking', 'SAVE_PROGRESS', { storyId, score, completed }, token).catch(() => {});
    }

    return result;
  },

  // -------------------------------------------------------------------------
  // Orbital-only interactions (state machine events)
  // -------------------------------------------------------------------------

  /** Send an arbitrary event to the orbital trait server */
  sendOrbitalEvent: sendEvent,
};
