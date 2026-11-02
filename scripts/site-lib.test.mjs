import { test } from 'node:test';
import assert from 'node:assert/strict';
import { locatedSource, platformPackage } from './site-lib.mjs';

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

const candidates = [
  { name: '@almadar/orb-darwin-arm64', os: ['darwin'], cpu: ['arm64'] },
  { name: '@almadar/orb-linux-x64', os: ['linux'], cpu: ['x64'] },
  { name: '@almadar/orb-linux-arm64', os: ['linux'], cpu: ['arm64'] },
];

test('the orb binary package is the one whose declared os and cpu match', () => {
  assert.equal(platformPackage(candidates, 'linux', 'x64'), '@almadar/orb-linux-x64');
  assert.equal(platformPackage(candidates, 'darwin', 'arm64'), '@almadar/orb-darwin-arm64');
});

test('CONTROL a matching os with another cpu is not picked', () => {
  assert.equal(platformPackage(candidates, 'linux', 'arm64'), '@almadar/orb-linux-arm64');
  assert.notEqual(platformPackage(candidates, 'linux', 'arm64'), '@almadar/orb-linux-x64');
});

test('a platform no package declares is refused', () => {
  assert.throws(() => platformPackage(candidates, 'win32', 'x64'), /no orb binary package declares win32-x64/);
});

test('two packages declaring the same platform are refused', () => {
  const twice = [...candidates, { name: '@almadar/orb-linux-x64-musl', os: ['linux'], cpu: ['x64'] }];
  assert.throws(() => platformPackage(twice, 'linux', 'x64'), /2 orb binary packages declare linux-x64/);
});
