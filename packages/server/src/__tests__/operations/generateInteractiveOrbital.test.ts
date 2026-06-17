import { jest, describe, beforeEach, it, expect } from '@jest/globals';
import type { OrbitalSchema } from '@almadar/core';

const { generateInteractiveOrbital } = await import(
  '../../operations/generateInteractiveOrbital'
);

function makeStream(chunks: string[]): ReadableStream<Uint8Array> {
  let index = 0;
  return new ReadableStream({
    pull(controller) {
      if (index < chunks.length) {
        controller.enqueue(new TextEncoder().encode(chunks[index]));
        index += 1;
      } else {
        controller.close();
      }
    },
  });
}

function sseEvent(type: string, data: Record<string, unknown>): string {
  return `data: ${JSON.stringify({ type, ...data })}\n\n`;
}

const sampleSchema: OrbitalSchema = {
  name: 'TestApp',
  version: '1.0.0',
  orbitals: [
    {
      name: 'Chart',
      entity: { name: 'Row', fields: [] },
      traits: [],
      pages: [],
    },
  ],
};

const concept = {
  id: 'c1',
  name: 'Row Vectors',
  description: 'A row vector is a horizontal sequence of numbers.',
  parents: [],
  children: [],
  layer: 1,
};

describe('generateInteractiveOrbital', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('should return schema from complete event', async () => {
    global.fetch = jest.fn(async () => ({
      ok: true,
      body: makeStream([
        sseEvent('start', { threadId: 't1' }),
        sseEvent('schema_update', { schema: sampleSchema }),
        sseEvent('complete', { schema: sampleSchema, schemaGenerated: true }),
      ]),
    })) as unknown as typeof fetch;

    const result = await generateInteractiveOrbital({
      type: 'chart',
      concept,
      markerDescription: 'Bar chart of row vector components.',
    });

    expect(result).toEqual(sampleSchema);
    expect(global.fetch).toHaveBeenCalledTimes(1);
    const request = (global.fetch as jest.Mock).mock.calls[0][1] as {
      body: string;
    };
    const body = JSON.parse(request.body);
    expect(body.stdAllowList).toEqual(['std-graphs']);
    expect(body.catalogMode).toBe('subset');
  });

  it('should fall back to last schema_update if complete has no schema', async () => {
    global.fetch = jest.fn(async () => ({
      ok: true,
      body: makeStream([
        sseEvent('schema_update', { schema: sampleSchema }),
        sseEvent('complete', { schemaGenerated: true }),
      ]),
    })) as unknown as typeof fetch;

    const result = await generateInteractiveOrbital({
      type: 'simulation',
      concept,
      markerDescription: 'Projectile motion preset.',
    });

    expect(result).toEqual(sampleSchema);
    const request = (global.fetch as jest.Mock).mock.calls[0][1] as {
      body: string;
    };
    const body = JSON.parse(request.body);
    expect(body.stdAllowList).toEqual([
      'ui-simulation-canvas',
      'ui-simulation-controls',
      'ui-simulator-board',
    ]);
  });

  it('should throw when builder returns an error event', async () => {
    global.fetch = jest.fn(async () => ({
      ok: true,
      body: makeStream([
        sseEvent('error', { error: 'Generation failed' }),
      ]),
    })) as unknown as typeof fetch;

    await expect(
      generateInteractiveOrbital({
        type: 'chart',
        concept,
        markerDescription: 'A chart.',
      }),
    ).rejects.toThrow('Generation failed');
  });

  it('should throw on non-ok response', async () => {
    global.fetch = jest.fn(async () => ({
      ok: false,
      status: 400,
      text: async () => 'Bad request',
    })) as unknown as typeof fetch;

    await expect(
      generateInteractiveOrbital({
        type: 'chart',
        concept,
        markerDescription: 'A chart.',
      }),
    ).rejects.toThrow('Builder API returned 400: Bad request');
  });
});
