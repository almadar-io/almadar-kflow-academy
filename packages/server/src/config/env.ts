/**
 * Environment configuration for the Kflow server.
 *
 * Mirrors the pattern used by apps/builder/packages/server/src/config/env.ts:
 * load `.env`, `.env.local`, `.env.<NODE_ENV>`, and `.env.<NODE_ENV>.local`
 * from the server package root, the kflow app root, and the current working
 * directory, then validate the required Firebase / SDK credentials.
 */
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import { createLogger } from '@almadar/logger';

const log = createLogger('kflow:server:config:env');
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const nodeEnv = process.env.NODE_ENV || 'development';

// Snapshot command-line / parent env vars so we never override them with file values.
const initialEnv = { ...process.env };

const searchRoots = [
  resolve(__dirname, '../..'),          // apps/kflow/packages/server
  resolve(__dirname, '../../..'),       // apps/kflow
  resolve(process.cwd()),               // wherever the command was run
];

const suffixes = ['', '.local', `.${nodeEnv}`, `.${nodeEnv}.local`];
const merged: Record<string, string> = {};

for (const root of searchRoots) {
  for (const suffix of suffixes) {
    const path = resolve(root, `.env${suffix}`);
    const result = dotenv.config({ path });
    if (!result.error && result.parsed && Object.keys(result.parsed).length > 0) {
      log.info(`[env] Loaded ${path}`);
      // Later files override earlier files; empty values are ignored so
      // placeholders don't wipe out real values in .env.local.
      for (const [key, value] of Object.entries(result.parsed)) {
        if (value !== '') {
          merged[key] = value;
        }
      }
    }
  }
}

for (const [key, value] of Object.entries(merged)) {
  // Never override values passed via the command line or parent environment.
  if (initialEnv[key]) {
    continue;
  }
  process.env[key] = value;
}

// Map kflow FB_* vars to FIREBASE_* before any @almadar/server Firebase calls.
process.env.FIREBASE_PROJECT_ID ??= process.env.FB_PROJECT_ID;
process.env.FIREBASE_CLIENT_EMAIL ??= process.env.FB_CLIENT_EMAIL;
process.env.FIREBASE_PRIVATE_KEY ??= process.env.FB_PRIVATE_KEY;

export const config = {
  port: parseInt(process.env.PORT || '3001', 10),
  nodeEnv,
  isProduction: nodeEnv === 'production',
  isDevelopment: nodeEnv !== 'production',

  firebase: {
    projectId: process.env.FB_PROJECT_ID || '',
    clientEmail: process.env.FB_CLIENT_EMAIL || '',
    privateKey: process.env.FB_PRIVATE_KEY?.replace(/\\n/g, '\n') || '',
  },

  almadar: {
    apiKey: process.env.ALMADAR_API_KEY || '',
    baseUrl: process.env.ALMADAR_BASE_URL || 'http://localhost:3003',
  },

  openaiApiKey: process.env.OPENAI_API_KEY || '',

  allowDevAuthBypass: process.env.ALLOW_DEV_AUTH_BYPASS === 'true',
};

/**
 * Validate required environment variables.
 *
 * In production we fail hard. In development we warn so the server can still
 * boot for client-only work.
 */
export function validateEnv(): void {
  const requiredFirebase = [
    'FB_PROJECT_ID',
    'FB_CLIENT_EMAIL',
    'FB_PRIVATE_KEY',
  ];

  const missingFirebase = requiredFirebase.filter((key) => !process.env[key]);
  if (missingFirebase.length > 0) {
    const message = `Missing Firebase Admin credentials: ${missingFirebase.join(', ')}`;
    if (config.isProduction) {
      throw new Error(`FATAL: ${message}. Server cannot start without Firebase credentials.`);
    }
    log.warn(`[env] ${message}`);
    log.warn('[env] Firebase functionality will not work until these are set in .env');
  }

  if (!config.almadar.apiKey) {
    const message = 'Missing ALMADAR_API_KEY';
    if (config.isProduction) {
      throw new Error(`FATAL: ${message}. SDK-powered features (interactive orbitals) will not work.`);
    }
    log.warn(`[env] ${message} — interactive orbital generation will fail.`);
  }
}
