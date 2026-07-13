import { jest, describe, beforeEach, it, expect } from '@jest/globals';
import type { OrbitalSchema } from '@almadar/core';
import type { AlmadarClient } from '@almadar/sdk/client';
import {
  generateInteractiveOrbital,
  type GenerateInteractiveOrbitalDependencies,
} from '../../operations/generateInteractiveOrbital';

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
  let generateMock: jest.Mock<() => Promise<{ schema: OrbitalSchema; appId?: string }>>;
  let deps: GenerateInteractiveOrbitalDependencies;

  beforeEach(() => {
    process.env.ALMADAR_API_KEY = 'sk_test_key';
    process.env.ALMADAR_BASE_URL = 'http://localhost:3999';
    generateMock = jest.fn(async () => ({ schema: sampleSchema, appId: 'test-app-id' }));
    deps = {
      createClient: () =>
        ({ generate: generateMock }) as unknown as AlmadarClient,
    };
  });

  it('should return schema from SDK generate result for chart', async () => {
    const result = await generateInteractiveOrbital(
      {
        type: 'chart',
        concept,
        markerDescription: 'Bar chart of row vector components.',
      },
      deps,
    );

    expect(result).toEqual(sampleSchema);
    expect(generateMock).toHaveBeenCalledTimes(1);
    const request = generateMock.mock.calls[0][0];
    expect(request.prompt).toContain('Row Vectors');
    expect(request.prompt).toContain('@config.mode');
    expect(request.endUserId).toBe(concept.id);
    expect(request.provider).toBe('deepseek');
    expect(request.model).toBe('deepseek-chat');
    expect(request.stdAllowList).toEqual(['learning-math-lab']);
    expect(request.catalogMode).toBe('subset');
  });

  it('should return schema from SDK generate result for simulation', async () => {
    const result = await generateInteractiveOrbital(
      {
        type: 'simulation',
        concept,
        markerDescription: 'Projectile motion preset.',
      },
      deps,
    );

    expect(result).toEqual(sampleSchema);
    const request = generateMock.mock.calls[0][0];
    expect(request.prompt).toContain('Row Vectors');
    expect(request.prompt).toContain('@config.mode');
    expect(request.stdAllowList).toEqual(['learning-physics-lab']);
    expect(request.catalogMode).toBe('subset');
  });

  it.each([
    ['math', ['learning-math-lab']],
    ['physics', ['learning-physics-lab']],
    ['biology', ['learning-biology-lab']],
    ['chemistry', ['learning-chemistry-lab']],
    ['probability', ['learning-probability-lab']],
  ] as const)(
    'should map %s to its field-scoped lab allow-list',
    async (type, expectedAllowList) => {
      const result = await generateInteractiveOrbital(
        { type, concept, markerDescription: 'test' },
        deps,
      );
      expect(result).toEqual(sampleSchema);
      const request = generateMock.mock.calls[0][0];
      expect(request.prompt).toContain('Row Vectors');
      expect(request.prompt).toContain('@config.mode');
      expect(request.stdAllowList).toEqual(expectedAllowList);
      expect(request.catalogMode).toBe('subset');
    },
  );

  it('should throw when SDK generate rejects', async () => {
    generateMock.mockRejectedValueOnce(new Error('Generation failed'));

    await expect(
      generateInteractiveOrbital(
        {
          type: 'chart',
          concept,
          markerDescription: 'A chart.',
        },
        deps,
      ),
    ).rejects.toThrow('Generation failed');
  });

  it('should throw when ALMADAR_API_KEY is missing', async () => {
    delete process.env.ALMADAR_API_KEY;

    await expect(
      generateInteractiveOrbital(
        {
          type: 'chart',
          concept,
          markerDescription: 'A chart.',
        },
        deps,
      ),
    ).rejects.toThrow('ALMADAR_API_KEY environment variable is not set');
  });
});
