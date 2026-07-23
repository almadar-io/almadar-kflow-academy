#!/usr/bin/env node
/**
 * kill-orphans.mjs
 *
 * Kills any process bound to a given port, plus any orphaned `tsx watch`
 * parents that may respawn children onto that port. Runs as its own Node
 * process so it can never pattern-match its own shell command line.
 *
 * Usage: node scripts/kill-orphans.mjs <port>
 */

import { execSync } from 'node:child_process';

const port = parseInt(process.argv[2] ?? '3001', 10);
const selfPid = process.pid;

function getPidsOnPort(p) {
  try {
    const out = execSync(`fuser ${p}/tcp 2>/dev/null`, { encoding: 'utf8' });
    return out.trim().split(/\s+/).map(Number).filter(id => id > 0 && id !== selfPid);
  } catch {
    return [];
  }
}

function getParentPid(pid) {
  try {
    const out = execSync(`ps -o ppid= -p ${pid}`, { encoding: 'utf8' });
    return parseInt(out.trim(), 10);
  } catch {
    return null;
  }
}

function killTree(pid) {
  const ppid = getParentPid(pid);
  // Kill the port-holder, then walk up and kill tsx watch ancestors so
  // they don't immediately respawn a new child onto the port.
  [pid, ppid].filter(Boolean).forEach(id => {
    try { process.kill(id, 'SIGKILL'); } catch { /* already gone */ }
  });
}

// 1. Kill whatever holds the port (and its tsx parent if any).
for (const pid of getPidsOnPort(port)) {
  killTree(pid);
}

// 2. Kill any remaining tsx watch processes for this server (by exact binary path).
try {
  execSync(`pkill -f 'node.*tsx/dist/cli.mjs watch src/server.ts' 2>/dev/null`);
} catch { /* none */ }

console.log(`[kill-orphans] port ${port} cleared`);
