/**
 * Pin-probe: generate one app through the real SDK pin path (zero-LLM keystone)
 * for a given organism + knob set, printing appId / meta / timing. Used by the
 * Wave G verification loop to materialize a workspace app for headed probes.
 *
 * Usage: tsx src/scripts/runPinProbe.ts <organism> '<knobsJson>' [prompt]
 */
import './../config/env.js';
import { config } from '../config/env.js';
import { AlmadarClient } from '@almadar/sdk/client';
import type { JsonValue } from '@almadar/core';

type KnobValue = string | number | boolean;

/** argv carries arbitrary JSON; the SDK's `pin.knobs` takes scalars only. Reject
 *  anything else here rather than widening the SDK contract to match the input. */
function parseKnobs(raw: string): Record<string, KnobValue> {
  const parsed: JsonValue = JSON.parse(raw);
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    throw new Error('knobsJson must be a JSON object');
  }
  const knobs: Record<string, KnobValue> = {};
  for (const [key, value] of Object.entries(parsed)) {
    if (typeof value !== 'string' && typeof value !== 'number' && typeof value !== 'boolean') {
      throw new Error(`knob "${key}" must be a string, number or boolean`);
    }
    knobs[key] = value;
  }
  return knobs;
}

async function main(): Promise<void> {
  const organism = process.argv[2];
  const knobs = process.argv[3] ? parseKnobs(process.argv[3]) : undefined;
  const prompt = process.argv[4] ?? `Learning app on ${organism}`;
  if (!organism) {
    console.error('usage: runPinProbe.ts <organism> <knobsJson> [prompt]');
    process.exit(2);
  }
  const apiKey = config.almadar.apiKey;
  if (!apiKey) {
    console.error('Missing ALMADAR_API_KEY');
    process.exit(2);
  }
  const client = new AlmadarClient({ apiKey, baseUrl: config.almadar.baseUrl });
  const knobSlug = knobs ? Object.values(knobs).join('-').replace(/[^a-z0-9-]/gi, '') : 'default';
  const appId = `kflow-pinprobe-${organism.replace('learning-', '')}-${knobSlug}`;
  const started = Date.now();
  const result = await client.generate({
    prompt,
    appId,
    catalogMode: 'subset',
    stdAllowList: [organism],
    pin: { organism, knobs },
    endUserId: 'wave-g-pin-probe',
  });
  const durationMs = Date.now() - started;
  console.log(
    JSON.stringify(
      {
        appId,
        durationMs,
        meta: result.meta ?? null,
        orbitals: result.schema?.orbitals?.length ?? 0,
      },
      null,
      2,
    ),
  );
}

void (async () => {
  try {
    await main();
  } catch (error: unknown) {
    if (error instanceof Error) {
      const details = Object.fromEntries(Object.entries(error).filter(([k]) => k !== 'stack'));
      console.error('💥 pin-probe failed:', error.message, JSON.stringify(details, null, 2));
    } else {
      console.error('💥 pin-probe failed:', String(error));
    }
    process.exit(1);
  }
})();
