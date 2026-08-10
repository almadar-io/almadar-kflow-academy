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

async function main(): Promise<void> {
  const organism = process.argv[2];
  const knobs = process.argv[3] ? (JSON.parse(process.argv[3]) as Record<string, unknown>) : undefined;
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

main().catch((error: unknown) => {
  if (error instanceof Error) {
    const details = Object.fromEntries(
      Object.entries(error as unknown as Record<string, unknown>).filter(([k]) => k !== 'stack'),
    );
    console.error('💥 pin-probe failed:', error.message, JSON.stringify(details, null, 2));
  } else {
    console.error('💥 pin-probe failed:', String(error));
  }
  process.exit(1);
});
