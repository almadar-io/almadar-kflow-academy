#!/usr/bin/env node
/**
 * Fails CI when Firebase App Hosting does not ship a pushed commit.
 *
 * App Hosting builds a tagged commit outside GitHub (the workflow asks for the
 * rollout), so a failed build never shows up anywhere we look: from 2026-09-23 every server
 * build 401'd on an expired GH_PACKAGES_TOKEN secret and production silently
 * stayed on the 09-19 build. This waits for the build of GITHUB_SHA, then for
 * the rollout that puts it on 100% of traffic, and exits non-zero otherwise.
 *
 * Env: FIREBASE_SERVICE_ACCOUNT (service-account JSON), GITHUB_SHA,
 * APPHOSTING_BACKEND (default kflow-builder-server).
 */
import crypto from 'node:crypto';
import { pathToFileURL } from 'node:url';

const PROJECT = 'kflow-b3a39';
const LOCATION = 'us-central1';
const MINUTE = 60_000;

/** One poll's decision. `wait` keeps polling; `ok`/`fail` end the run. */
export function buildVerdict(build) {
  if (build === undefined) return { kind: 'wait', reason: 'no build for this commit yet' };
  if (build.state === 'READY') return { kind: 'ok' };
  if (build.state === 'FAILED') {
    return { kind: 'fail', reason: `build ${build.name} FAILED (${JSON.stringify(build.error ?? {})}) — logs: ${build.buildLogsUri ?? 'n/a'}` };
  }
  return { kind: 'wait', reason: `build state ${build.state}` };
}

export function rolloutVerdict(rollout, supersededBy) {
  if (rollout === undefined) {
    return supersededBy
      ? { kind: 'ok', reason: `superseded by ${supersededBy} before its rollout started` }
      : { kind: 'wait', reason: 'no rollout for this build yet' };
  }
  if (rollout.state === 'SUCCEEDED') return { kind: 'ok' };
  if (rollout.state === 'FAILED') {
    return { kind: 'fail', reason: `rollout ${rollout.name} FAILED (${JSON.stringify(rollout.error ?? {})})` };
  }
  if (rollout.state === 'CANCELLED' && supersededBy) return { kind: 'ok', reason: `superseded by ${supersededBy}` };
  if (rollout.state === 'CANCELLED') return { kind: 'fail', reason: `rollout ${rollout.name} CANCELLED` };
  return { kind: 'wait', reason: `rollout state ${rollout.state}` };
}

async function accessToken(sa) {
  const now = Math.floor(Date.now() / 1000);
  const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
  const unsigned = `${b64({ alg: 'RS256', typ: 'JWT' })}.${b64({
    iss: sa.client_email,
    scope: 'https://www.googleapis.com/auth/cloud-platform',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
  })}`;
  const sig = crypto.sign('RSA-SHA256', Buffer.from(unsigned), sa.private_key).toString('base64url');
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: `${unsigned}.${sig}` }),
  });
  if (!res.ok) throw new Error(`token exchange failed: ${res.status} ${await res.text()}`);
  return (await res.json()).access_token;
}

// The API pages in no useful order, so read every page before sorting newest-first.
async function list(base, token, kind) {
  const items = [];
  let pageToken = '';
  do {
    const res = await fetch(`${base}/${kind}?pageSize=100${pageToken ? `&pageToken=${pageToken}` : ''}`, {
      headers: { authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error(`${kind} list failed: ${res.status} ${await res.text()}`);
    const page = await res.json();
    items.push(...(page[kind] ?? []));
    pageToken = page.nextPageToken ?? '';
  } while (pageToken);
  return items.sort((a, b) => b.createTime.localeCompare(a.createTime));
}

async function poll(label, timeoutMs, step) {
  const deadline = Date.now() + timeoutMs;
  let last = '';
  for (;;) {
    const verdict = await step();
    if (verdict.kind !== 'wait') return verdict;
    if (verdict.reason !== last) console.log(`[${label}] ${verdict.reason}`);
    last = verdict.reason;
    if (Date.now() > deadline) return { kind: 'fail', reason: `${label}: timed out (${last})` };
    await new Promise((r) => setTimeout(r, 30_000));
  }
}

async function main() {
  const sha = process.env.GITHUB_SHA;
  const backend = process.env.APPHOSTING_BACKEND ?? 'kflow-builder-server';
  const sa = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT ?? '');
  const base = `https://firebaseapphosting.googleapis.com/v1beta/projects/${PROJECT}/locations/${LOCATION}/backends/${backend}`;
  const token = await accessToken(sa);

  let build;
  const built = await poll('build', 75 * MINUTE, async () => {
    build = (await list(base, token, 'builds')).find((b) => b.source?.codebase?.hash === sha);
    return buildVerdict(build);
  });
  if (built.kind === 'fail') throw new Error(built.reason);
  console.log(`[build] ${build.name} READY`);

  const rolled = await poll('rollout', 30 * MINUTE, async () => {
    const builds = await list(base, token, 'builds');
    const newer = builds.find((b) => b.createTime > build.createTime && b.state === 'READY');
    const rollout = (await list(base, token, 'rollouts')).find((r) => r.build === build.name);
    return rolloutVerdict(rollout, newer?.name);
  });
  if (rolled.kind === 'fail') throw new Error(rolled.reason);
  console.log(`[rollout] ${rolled.reason ?? `${build.name} is serving`}`);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  main().catch((err) => {
    console.error(`::error::App Hosting did not ship ${process.env.GITHUB_SHA}: ${err.message}`);
    process.exit(1);
  });
}
