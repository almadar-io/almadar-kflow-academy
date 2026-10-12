import { test } from 'node:test';
import assert from 'node:assert/strict';
import { findOrganism } from './site-lib.mjs';

test('the organism is found only under an organisms folder', () => {
  const files = ['kflow/atoms/std-kflow-site.orb', 'kflow/organisms/std-kflow-site.orb', 'kflow/organisms/std-kflow.orb'];
  assert.equal(findOrganism(files, 'std-kflow-site'), 'kflow/organisms/std-kflow-site.orb');
  assert.equal(findOrganism(files, 'std-kflow'), 'kflow/organisms/std-kflow.orb');
  assert.equal(findOrganism(files, 'std-missing'), undefined);
});
