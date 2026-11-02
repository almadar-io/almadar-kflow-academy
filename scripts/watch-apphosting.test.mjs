import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildVerdict, rolloutVerdict } from './watch-apphosting.mjs';

test('build: FAILED fails with the logs link; READY passes; anything else waits', () => {
  const failed = buildVerdict({ name: 'b1', state: 'FAILED', error: { code: 13 }, buildLogsUri: 'https://logs' });
  assert.equal(failed.kind, 'fail');
  assert.match(failed.reason, /FAILED.*https:\/\/logs/);
  assert.equal(buildVerdict({ name: 'b1', state: 'READY' }).kind, 'ok');
  assert.equal(buildVerdict({ name: 'b1', state: 'BUILDING' }).kind, 'wait');
  assert.equal(buildVerdict(undefined).kind, 'wait');
});

test('rollout: FAILED fails; SUCCEEDED passes; a superseded commit passes; a bare CANCELLED fails', () => {
  assert.equal(rolloutVerdict({ name: 'r1', state: 'FAILED' }).kind, 'fail');
  assert.equal(rolloutVerdict({ name: 'r1', state: 'SUCCEEDED' }).kind, 'ok');
  assert.equal(rolloutVerdict({ name: 'r1', state: 'CANCELLED' }, 'b2').kind, 'ok');
  assert.equal(rolloutVerdict({ name: 'r1', state: 'CANCELLED' }).kind, 'fail');
  assert.equal(rolloutVerdict(undefined, 'b2').kind, 'ok');
  assert.equal(rolloutVerdict(undefined).kind, 'wait');
  assert.equal(rolloutVerdict({ name: 'r1', state: 'PROGRESSING' }).kind, 'wait');
});
