#!/usr/bin/env node
/**
 * Print the path of the installed orb binary for this platform, so the server runs it directly (no Node
 * launcher as the parent process). The binary package is the optional dependency of @almadar/orb whose
 * package.json declares this os and cpu.
 */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { platformPackage } from './site-lib.mjs';

const require = createRequire(import.meta.url);
const orbManifest = require.resolve('@almadar/orb/package.json');
const fromOrb = createRequire(orbManifest);
const names = Object.keys(JSON.parse(fs.readFileSync(orbManifest, 'utf8')).optionalDependencies ?? {});
const candidates = names.flatMap((name) => {
  try {
    const manifest = JSON.parse(fs.readFileSync(fromOrb.resolve(`${name}/package.json`), 'utf8'));
    return [{ name, os: manifest.os ?? [], cpu: manifest.cpu ?? [] }];
  } catch {
    return [];
  }
});
const name = platformPackage(candidates, process.platform, process.arch);
const binary = path.join(path.dirname(fromOrb.resolve(`${name}/package.json`)), process.platform === 'win32' ? 'orb.exe' : 'orb');
fs.accessSync(binary, fs.constants.X_OK);
process.stdout.write(binary);
