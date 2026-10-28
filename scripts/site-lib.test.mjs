import { test } from 'node:test';
import assert from 'node:assert/strict';
import { locatedSource } from './site-lib.mjs';

test('the source path is read from the `orb behaviors which` line', () => {
  const line = '/w/node_modules/@almadar-io/behaviors/behaviors/lolo/kflow/organisms/std-kflow.lolo (@almadar-io/behaviors@0.16.203)\n';
  assert.equal(locatedSource(line), '/w/node_modules/@almadar-io/behaviors/behaviors/lolo/kflow/organisms/std-kflow.lolo');
});

test('a path with spaces keeps them', () => {
  assert.equal(locatedSource('/my work/std-kflow.lolo (@almadar-io/behaviors@1.0.0)'), '/my work/std-kflow.lolo');
});

test('a resolve failure is refused, not read as a path', () => {
  assert.throws(() => locatedSource("behavior/resolve: Behavior 'std-nope' not found in [\"@almadar-io/behaviors@0.16.203\"]."), /not a located behavior/);
});

test('a line without the package suffix is refused', () => {
  assert.throws(() => locatedSource('/w/std-kflow.lolo'), /not a located behavior/);
});
