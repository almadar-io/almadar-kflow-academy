/**
 * Generate an interactive visualization or simulation orbital via the
 * `@almadar/sdk` AlmadarClient, targeting the Studio agent endpoint
 * exposed by apps/builder.
 */

import type { OrbitalSchema } from '@almadar/core';
import { AlmadarClient } from '@almadar/sdk/client';
import { getLearningOrganisms } from '@almadar-io/knowledge/server';
import type { Concept } from '../types/concept';

export type InteractiveOrbitalType =
  | 'algorithms'
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

function buildPrompt(options: GenerateInteractiveOrbitalOptions): string {
  const { type, concept, markerDescription } = options;
  const label = `${type} visualization`;
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

  // Dynamic allowlist — all learning organisms from @almadar/std.
  // Derived at runtime so new organisms appear automatically.
  const stdAllowList = getLearningOrganisms();

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
    model: 'deepseek-v4-flash',
    catalogMode: 'subset',
    stdAllowList,
  });

  return schema;
}
