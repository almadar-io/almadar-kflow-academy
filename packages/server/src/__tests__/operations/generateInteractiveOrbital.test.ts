import { jest, describe, beforeEach, it, expect } from '@jest/globals';
import type { OrbitalSchema } from '@almadar/core';
import type { AlmadarClient, GenerateOptions, GenerateResult } from '@almadar/sdk/client';
import { getPinTargetForType, getModeMenuForOrganism } from '@almadar-io/knowledge/server';
import { config } from '../../config/env';
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
  let generateMock: jest.Mock<(input: GenerateOptions) => Promise<GenerateResult>>;
  let deps: GenerateInteractiveOrbitalDependencies;

  beforeEach(() => {
    config.almadar.apiKey = 'sk_test_key';
    config.almadar.baseUrl = 'http://localhost:3999';
    generateMock = jest.fn(async () => ({ schema: sampleSchema, appId: 'test-app-id' }));
    deps = {
      createClient: () =>
        ({ generate: generateMock }) as unknown as AlmadarClient,
    };
  });

  it('should return schema from SDK generate result for math', async () => {
    const result = await generateInteractiveOrbital(
      {
        type: 'math',
        concept,
        markerDescription: 'Bar chart of row vector components.',
      },
      deps,
    );

    expect(result.schema).toEqual(sampleSchema);
    expect(generateMock).toHaveBeenCalledTimes(1);
    const request = generateMock.mock.calls[0][0];
    expect(request.prompt).toContain('Row Vectors');
    expect(request.prompt).toContain('@config.mode');
    expect(request.endUserId).toBe(concept.id);
    expect(request.provider).toBe('deepseek');
    expect(request.model).toBe('deepseek-v4-flash');
    expect(request.stdAllowList).toEqual(['learning-math', 'learning-math-lab']);
    expect(request.catalogMode).toBe('subset');
  });

  it.each([
    ['math', ['learning-math', 'learning-math-lab']],
    ['physics', ['learning-physics', 'learning-physics-lab']],
    ['biology', ['learning-biology', 'learning-biology-lab']],
    ['chemistry', ['learning-chemistry', 'learning-chemistry-lab']],
    ['probability', ['learning-probability', 'learning-probability-lab']],
    ['algorithms', ['learning-algorithms']],
  ] as const)(
    'should map %s to its family (base + lab, where present) allow-list',
    async (type, expectedAllowList) => {
      const result = await generateInteractiveOrbital(
        { type, concept, markerDescription: 'test' },
        deps,
      );
      expect(result.schema).toEqual(sampleSchema);
      const request = generateMock.mock.calls[0][0];
      expect(request.prompt).toContain('Row Vectors');
      expect(request.stdAllowList).toEqual(expectedAllowList);
      expect(request.catalogMode).toBe('subset');
    },
  );

  it('prompt contains only the requested type\'s mode values', async () => {
    const physicsMenu = getModeMenuForOrganism(getPinTargetForType('physics')!.organism)!;
    await generateInteractiveOrbital(
      { type: 'physics', concept, markerDescription: 'Projectile motion preset.' },
      deps,
    );
    const request = generateMock.mock.calls[0][0];
    for (const value of physicsMenu.values) {
      expect(request.prompt).toContain(value);
    }
    expect(request.prompt).not.toContain('coordinate-plane');
  });

  it('omits the concept description line when description is empty', async () => {
    const conceptWithoutDescription = { ...concept, description: '' };
    await generateInteractiveOrbital(
      { type: 'math', concept: conceptWithoutDescription, markerDescription: 'test' },
      deps,
    );
    const request = generateMock.mock.calls[0][0];
    expect(request.prompt).not.toContain('undefined');
  });

  it('includes pin when options.pin is true and a pin target exists', async () => {
    await generateInteractiveOrbital(
      { type: 'math', concept, markerDescription: 'test', pin: true },
      deps,
    );
    const request = generateMock.mock.calls[0][0];
    expect(request.pin).toEqual(getPinTargetForType('math'));
  });

  it('omits pin when options.pin is not set', async () => {
    await generateInteractiveOrbital(
      { type: 'math', concept, markerDescription: 'test' },
      deps,
    );
    const request = generateMock.mock.calls[0][0];
    expect(request.pin).toBeUndefined();
  });

  it('omits pin when options.pin is true but the type has no deterministic pin target', async () => {
    expect(getPinTargetForType('algorithms')).toBeNull();
    await generateInteractiveOrbital(
      { type: 'algorithms', concept, markerDescription: 'test', pin: true },
      deps,
    );
    const request = generateMock.mock.calls[0][0];
    expect(request.pin).toBeUndefined();
  });

  it('should throw when SDK generate rejects', async () => {
    generateMock.mockRejectedValueOnce(new Error('Generation failed'));

    await expect(
      generateInteractiveOrbital(
        {
          type: 'math',
          concept,
          markerDescription: 'A chart.',
        },
        deps,
      ),
    ).rejects.toThrow('Generation failed');
  });

  it('should throw when ALMADAR_API_KEY is missing', async () => {
    config.almadar.apiKey = '';

    await expect(
      generateInteractiveOrbital(
        {
          type: 'math',
          concept,
          markerDescription: 'A chart.',
        },
        deps,
      ),
    ).rejects.toThrow('ALMADAR_API_KEY environment variable is not set');
  });
});
