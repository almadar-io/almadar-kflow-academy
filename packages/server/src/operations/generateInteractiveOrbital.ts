/**
 * Generate an interactive visualization or simulation orbital via the
 * `@almadar/sdk` AlmadarClient, targeting the Studio agent endpoint
 * exposed by apps/builder.
 */

import type { OrbitalSchema } from '@almadar/core';
import { AlmadarClient } from '@almadar/sdk/client';
import type { Concept } from '../types/concept';

export type InteractiveOrbitalType =
  | 'chart'
  | 'simulation'
  | 'math'
  | 'physics'
  | 'biology'
  | 'chemistry'
  | 'probability';

export interface GenerateInteractiveOrbitalOptions {
  type: InteractiveOrbitalType;
  concept: Concept;
  markerDescription: string;
}

const CATALOG: Record<
  InteractiveOrbitalType,
  { stdAllowList: string[]; catalogMode: 'subset' }
> = {
  chart: {
    stdAllowList: [
      'std-graphs',
      'std-graphs-bar',
      'std-graphs-line',
      'std-graphs-pie',
      'std-graphs-donut',
      'std-graphs-area',
      'std-graphs-scatter',
      'std-graphs-histogram',
      'ui-line-chart',
      'ui-sparkline',
      'ui-chart-legend',
      'ui-stats-grid',
      'ui-stat-card',
      'ui-animated-counter',
      'ui-trend-indicator',
    ],
    catalogMode: 'subset',
  },
  simulation: {
    stdAllowList: [
      'learning-physics-lab',
      'ui-physics-canvas',
      'ui-learning-canvas',
    ],
    catalogMode: 'subset',
  },
  math: {
    stdAllowList: [
      'learning-math-lab',
      'ui-math-canvas',
      'ui-learning-canvas',
    ],
    catalogMode: 'subset',
  },
  physics: {
    stdAllowList: [
      'learning-physics-lab',
      'ui-physics-canvas',
      'ui-learning-canvas',
    ],
    catalogMode: 'subset',
  },
  biology: {
    stdAllowList: [
      'learning-biology-lab',
      'ui-biology-canvas',
      'ui-learning-canvas',
    ],
    catalogMode: 'subset',
  },
  chemistry: {
    stdAllowList: [
      'learning-chemistry-lab',
      'ui-chemistry-canvas',
      'ui-learning-canvas',
    ],
    catalogMode: 'subset',
  },
  probability: {
    stdAllowList: [
      'learning-probability-lab',
      'ui-math-canvas',
      'ui-learning-canvas',
    ],
    catalogMode: 'subset',
  },
};

function buildPrompt(options: GenerateInteractiveOrbitalOptions): string {
  const { type, concept, markerDescription } = options;
  const label =
    type === 'chart'
      ? 'chart visualization'
      : type === 'simulation'
        ? 'physics simulation'
        : `${type} visualization`;
  return `Create a single interactive ${label} for a lesson about "${concept.name}".

Concept description: ${concept.description}
Learner context: ${markerDescription}

Requirements:
- Compose the result as one Orbital schema using ONLY the allowed std behaviors.
- For field-scoped "learning-*-lab" organisms, set the \\"@config.mode\\" knob to the specific visualization that matches the learner context (e.g. function-plot, wave, cell, molecule, dice, etc.).
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
