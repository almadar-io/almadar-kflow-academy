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

// Organism-level allow-list only. almadar-rabit's Coordinator only selects
// top-level organisms (`pick_organism`), and `extraTraits` is no longer
// LLM-writable, so atoms/molecules/variations are not selectable here.
// Keeping the list narrow to real `learning-*` organisms for the baseline.
const CATALOG: Record<
  InteractiveOrbitalType,
  { stdAllowList: string[]; catalogMode: 'subset' }
> = {
  // NOTE: these are the real organism names in @almadar/std's ui/learning
  // registry. Each lab exposes a single orbital with an "@config.mode" knob
  // that selects the specific visualization (function-plot, wave, cell, etc.).
  chart: { stdAllowList: ['learning-math-lab'], catalogMode: 'subset' },
  simulation: { stdAllowList: ['learning-physics-lab'], catalogMode: 'subset' },
  math: { stdAllowList: ['learning-math-lab'], catalogMode: 'subset' },
  physics: { stdAllowList: ['learning-physics-lab'], catalogMode: 'subset' },
  biology: { stdAllowList: ['learning-biology-lab'], catalogMode: 'subset' },
  chemistry: { stdAllowList: ['learning-chemistry-lab'], catalogMode: 'subset' },
  probability: { stdAllowList: ['learning-probability-lab'], catalogMode: 'subset' },
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
- For "learning-*-lab" organisms, set the \\"@config.mode\\" knob to the specific visualization that matches the learner context:
  - learning-math-lab: coordinate-plane, function-plot, vector, geometry, number-line, slope-field, area-integral
  - learning-physics-lab: wave, field, ray, pendulum, circuit
  - learning-biology-lab: cell, organism, ecosystem
  - learning-chemistry-lab: molecule, reaction, periodic
  - learning-probability-lab: distribution, simulation, bayes
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
