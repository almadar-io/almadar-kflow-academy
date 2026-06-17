/**
 * Generate an interactive visualization or simulation orbital via the builder Rabit API.
 *
 * Kflow sends a narrowed behavior catalog so the builder agent can only compose
 * from std behaviors that make sense for learning content.
 */

import type { OrbitalSchema } from '@almadar/core';
import type { Concept } from '../types/concept';
import { builderConfig } from '../config/builder';

export interface GenerateInteractiveOrbitalOptions {
  type: 'chart' | 'simulation';
  concept: Concept;
  markerDescription: string;
}

const CATALOG: Record<
  GenerateInteractiveOrbitalOptions['type'],
  { stdAllowList: string[]; catalogMode: 'subset' }
> = {
  chart: {
    stdAllowList: ['std-graphs'],
    catalogMode: 'subset',
  },
  simulation: {
    stdAllowList: [
      'ui-simulation-canvas',
      'ui-simulation-controls',
      'ui-simulator-board',
    ],
    catalogMode: 'subset',
  },
};

function buildPrompt(options: GenerateInteractiveOrbitalOptions): string {
  const { type, concept, markerDescription } = options;
  const label = type === 'chart' ? 'chart visualization' : 'simulation';
  return `Create a single interactive ${label} for a lesson about "${concept.name}".

Concept description: ${concept.description}
Learner context: ${markerDescription}

Requirements:
- Compose the result as one Orbital schema using ONLY the allowed std behaviors.
- Keep the UI focused on the learning goal: no navigation, no authentication, no complex app chrome.
- Use realistic, pedagogically useful data.
- Return a valid, compilable OrbitalSchema.`;
}

interface SSEEvent {
  type: string;
  data?: Record<string, unknown>;
}

function parseSSELine(line: string): SSEEvent | null {
  const trimmed = line.trim();
  if (!trimmed.startsWith('data:')) return null;
  const payload = trimmed.slice('data:'.length).trim();
  if (payload === '[DONE]') return { type: 'done' };
  try {
    const parsed = JSON.parse(payload) as Record<string, unknown>;
    return {
      type: typeof parsed.type === 'string' ? parsed.type : 'unknown',
      data: parsed,
    };
  } catch {
    return null;
  }
}

async function readSSESchema(
  response: Response,
): Promise<OrbitalSchema> {
  if (!response.body) {
    throw new Error('Builder response has no body');
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let lastSchema: OrbitalSchema | null = null;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';

      for (const line of lines) {
        const event = parseSSELine(line);
        if (!event) continue;

        if (event.type === 'schema_update' && event.data?.schema) {
          lastSchema = event.data.schema as OrbitalSchema;
        }

        if (event.type === 'complete') {
          const completeSchema = (event.data?.schema ?? lastSchema) as OrbitalSchema | null;
          if (completeSchema) {
            return completeSchema;
          }
          throw new Error('Builder completed without returning a schema');
        }

        if (event.type === 'error') {
          const message =
            typeof event.data?.error === 'string'
              ? event.data.error
              : 'Builder generation failed';
          throw new Error(message);
        }
      }
    }
  } finally {
    reader.releaseLock();
  }

  if (lastSchema) {
    return lastSchema;
  }

  throw new Error('Builder stream ended without a schema');
}

export async function generateInteractiveOrbital(
  options: GenerateInteractiveOrbitalOptions,
): Promise<OrbitalSchema> {
  const { type, concept, markerDescription } = options;
  const { stdAllowList, catalogMode } = CATALOG[type];

  const response = await fetch(`${builderConfig.baseUrl}${builderConfig.apiPath}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message: buildPrompt(options),
      provider: 'deepseek',
      model: 'deepseek-chat',
      stdAllowList,
      catalogMode,
      // Builder requires a non-empty user id header for some paths.
      userType: 'builder',
    }),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => 'Unknown error');
    throw new Error(`Builder API returned ${response.status}: ${text}`);
  }

  return readSSESchema(response);
}
