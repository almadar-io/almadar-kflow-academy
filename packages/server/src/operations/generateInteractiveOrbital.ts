/**
 * Generate an interactive visualization or simulation orbital via the
 * `@almadar/sdk` AlmadarClient, targeting the Studio agent endpoint
 * exposed by apps/builder.
 */

import type { OrbitalSchema } from '@almadar/core';
import { AlmadarClient } from '@almadar/sdk/client';
import type { GenerateMeta, GenerateStreamEvent } from '@almadar/sdk/client';
import { getOrganismsForType, getPinTargetForType, getModeMenuForOrganism } from '@almadar-io/knowledge/server';
import type { InteractiveOrbitalType } from '@almadar-io/knowledge';
import { config } from '../config/env';
import type { Concept } from '../types/concept';

export type { InteractiveOrbitalType };

export interface GenerateInteractiveOrbitalOptions {
  type: InteractiveOrbitalType;
  concept: Concept;
  markerDescription: string;
  appId?: string;
  /** Pin to the type's deterministic factory target (regenerate turns only — see locked policy). */
  pin?: boolean;
  onEvent?: (phase: string) => void;
}

export interface GenerateInteractiveOrbitalResult {
  schema: OrbitalSchema;
  appId?: string;
  meta?: GenerateMeta;
}

export function buildPrompt(options: GenerateInteractiveOrbitalOptions): string {
  const { type, concept, markerDescription } = options;
  const label = `${type} visualization`;
  const hasDescription = typeof concept.description === 'string' && concept.description.length > 0;

  const modeMenu = (() => {
    const target = getPinTargetForType(type);
    if (!target) return null;
    return getModeMenuForOrganism(target.organism);
  })();

  const lines = [
    `Create a single interactive ${label} for a lesson about "${concept.name}".`,
    '',
    ...(hasDescription ? [`Concept description: ${concept.description}`] : []),
    `Learner context: ${markerDescription}`,
    '',
    'Requirements:',
    '- Compose the result as one Orbital schema using ONLY the allowed std behaviors.',
    ...(modeMenu
      ? [`- Set the "@config.${modeMenu.knob}" knob to the specific visualization that matches the learner context: ${modeMenu.values.join(', ')}`]
      : []),
    '- Keep the UI focused on the learning goal: no navigation, no authentication, no complex app chrome.',
    '- Use realistic, pedagogically useful data.',
    '- Return a valid, compilable OrbitalSchema.',
  ];

  return lines.join('\n');
}

function phaseForEvent(event: GenerateStreamEvent): string | null {
  switch (event.type) {
    case 'start':
      return 'Opening workspace';
    case 'orbital_added':
      return 'Orbital built';
    case 'generation_meta':
      return `Tier: ${event.data.tier}`;
    case 'complete':
      return 'Finalizing';
    default:
      return null;
  }
}

export interface GenerateInteractiveOrbitalDependencies {
  createClient?: (baseUrl: string, apiKey: string) => AlmadarClient;
}

export async function generateInteractiveOrbital(
  options: GenerateInteractiveOrbitalOptions,
  deps: GenerateInteractiveOrbitalDependencies = {},
): Promise<GenerateInteractiveOrbitalResult> {
  const { type, concept, appId, pin } = options;

  // Family allowlist — base + lab organisms for this type, from @almadar/std.
  // Derived at runtime so new organisms appear automatically.
  const stdAllowList = getOrganismsForType(type);
  if (stdAllowList.length === 0) {
    throw new Error(`No learning organisms found for interactive orbital type "${type}" — capabilities/type drift`);
  }

  const apiKey = config.almadar.apiKey;
  if (!apiKey) {
    throw new Error('ALMADAR_API_KEY environment variable is not set');
  }
  const baseUrl = config.almadar.baseUrl;

  const client = deps.createClient
    ? deps.createClient(baseUrl, apiKey)
    : new AlmadarClient({ apiKey, baseUrl });

  const pinTarget = pin ? getPinTargetForType(type) : null;

  const { schema, appId: resultAppId, meta } = await client.generate({
    prompt: buildPrompt(options),
    endUserId: concept.id,
    appId,
    provider: 'deepseek',
    model: 'deepseek-v4-flash',
    catalogMode: 'subset',
    stdAllowList,
    ...(pinTarget ? { pin: pinTarget } : {}),
    onEvent: options.onEvent
      ? (event) => {
          const phase = phaseForEvent(event);
          if (phase) options.onEvent?.(phase);
        }
      : undefined,
  });

  return { schema, appId: resultAppId, meta };
}
