#!/usr/bin/env node
/**
 * Build the app's web client from its .lolo organism for an app that declares its own http
 * endpoint: `orb compile --mode client --web-client` lays the typescript shell's prebuilt web
 * client with the app's runtime files over it (what `orb serve` prepares for other apps), then the
 * static files are copied beside it. No vite build.
 *
 * Then the organism is resolved to one program file (--program) the server boots as-is, with no resolve at start.
 *
 * Usage: node scripts/build-app.mjs --organism <name> [--static static] [--out dist/client] [--program dist/app.orb]
 * The compiler is the installed @almadar/orb (node_modules/.bin/orb), or ORB_BIN.
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { locatedSource } from './site-lib.mjs';

const { values } = parseArgs({
  options: {
    organism: { type: 'string' },
    static: { type: 'string', default: 'static' },
    out: { type: 'string', default: 'dist/client' },
    program: { type: 'string', default: 'dist/app.orb' },
  },
});
if (!values.organism) {
  console.error('usage: build-app.mjs --organism <name> [--static dir] [--out dir]');
  process.exit(2);
}

const root = process.cwd();
const work = path.join(root, '.site', 'app-client');
const out = path.resolve(values.out);
const orb = process.env.ORB_BIN ?? path.join(root, 'node_modules', '.bin', 'orb');

const source = locatedSource(execFileSync(orb, ['behaviors', 'which', `almadar-behaviors/${values.organism}`], { cwd: root, encoding: 'utf8' }));
fs.rmSync(work, { recursive: true, force: true });
execFileSync(orb, ['compile', source, '--mode', 'client', '--web-client', '-o', work], { cwd: root, stdio: 'inherit' });

fs.rmSync(out, { recursive: true, force: true });
fs.cpSync(path.join(work, 'web-client'), out, { recursive: true });
if (fs.existsSync(values.static)) fs.cpSync(values.static, out, { recursive: true });
const program = path.resolve(values.program);
execFileSync(orb, ['resolve', source, '-o', program], { cwd: root, stdio: 'inherit' });
console.log(`[build-app] ${values.organism} → ${path.relative(root, out)} + ${path.relative(root, program)}`);
