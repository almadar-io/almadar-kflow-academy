/**
 * Generate an interactive visualization or simulation orbital via the
 * `@almadar/sdk` AlmadarClient, targeting the Studio agent endpoint
 * exposed by apps/builder.
 */

import type { OrbitalSchema } from '@almadar/core';
import { AlmadarClient } from '@almadar/sdk/client';
import type { Concept } from '../types/concept';

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

export interface GenerateInteractiveOrbitalDependencies {
  createClient?: (baseUrl: string, apiKey: string) => AlmadarClient;
}

export async function generateInteractiveOrbital(
  options: GenerateInteractiveOrbitalOptions,
  deps: GenerateInteractiveOrbitalDependencies = {},
): Promise<OrbitalSchema> {
  const { type, concept, markerDescription } = options;
  const { stdAllowList, catalogMode } = CATALOG[type];

  const apiKey = process.env.ALMADAR_API_KEY;
  if (!apiKey) {
    throw new Error('ALMADAR_API_KEY environment variable is not set');
  }
  const baseUrl = process.env.ALMADAR_BASE_URL || 'http://localhost:3003';

  const client = deps.createClient
    ? deps.createClient(baseUrl, apiKey)
    : new AlmadarClient({ apiKey, baseUrl });

  const { schema } = await client.generate({
    prompt: buildPrompt(options),
    endUserId: concept.id,
    provider: 'deepseek',
    model: 'deepseek-chat',
    catalogMode,
    stdAllowList,
  });

  return schema;
}
