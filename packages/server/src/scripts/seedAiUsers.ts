/**
 * Seed AI peer users across the knowledge taxonomy.
 *
 * Creates one AI user per subdomain (Formal/Social/Natural), writes its registry doc,
 * upserts its canonical concept set to Chroma (ownerUid-tagged), and touches its
 * node-activity presence so it appears in peer pools ("always mixed", labeled).
 *
 * Usage (from packages/server):
 *   pnpm run seed:ai-users
 *
 * Keys loaded via the kflow .env convention (import '../config/env.js').
 */
import '../config/env.js';
import { createLogger } from '@almadar/logger';

const almadarServer = await import('@almadar/server');
almadarServer.initializeFirebase();
almadarServer.getFirestore();

const log = createLogger('kflow:server:scripts:seedAiUsers');

async function main() {
  const { allAiSubdomains, seedAiUser } = await import('../services/aiUserService');
  const subdomains = allAiSubdomains();
  log.info(`Seeding ${subdomains.length} AI users…`);
  for (const sub of subdomains) {
    try {
      await seedAiUser(sub);
      log.info('seeded', { subdomain: sub });
    } catch (e) {
      log.error('seed failed', { subdomain: sub, error: e instanceof Error ? e.message : String(e) });
    }
  }
  log.info('done');
}

main().catch((e) => {
  log.error('seedAiUsers fatal', { error: e instanceof Error ? e.message : String(e) });
  process.exit(1);
});
