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
    expect(request.endUserId).toBe(concept.id);
    expect(request.provider).toBe('deepseek');
    expect(request.model).toBe('deepseek-chat');
    expect(request.stdAllowList).toEqual([
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
    ]);
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
    expect(request.stdAllowList).toEqual([
      'learning-physics-lab',
      'ui-physics-canvas',
      'ui-learning-canvas',
    ]);
    expect(request.catalogMode).toBe('subset');
  });

  it.each([
    ['math', ['learning-math-lab', 'ui-math-canvas', 'ui-learning-canvas']],
    ['physics', ['learning-physics-lab', 'ui-physics-canvas', 'ui-learning-canvas']],
    ['biology', ['learning-biology-lab', 'ui-biology-canvas', 'ui-learning-canvas']],
    ['chemistry', ['learning-chemistry-lab', 'ui-chemistry-canvas', 'ui-learning-canvas']],
    ['probability', ['learning-probability-lab', 'ui-math-canvas', 'ui-learning-canvas']],
  ] as const)(
    'should map %s to its field-scoped lab allow-list',
    async (type, expectedAllowList) => {
      const result = await generateInteractiveOrbital(
        { type, concept, markerDescription: 'test' },
        deps,
      );
      expect(result).toEqual(sampleSchema);
      const request = generateMock.mock.calls[0][0];
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
