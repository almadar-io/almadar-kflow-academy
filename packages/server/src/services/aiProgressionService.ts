import { getFirestore } from '@almadar/server';
import { createLogger } from '@almadar/logger';
import { listAiUsers, touchPresenceForConcepts } from './aiUserService';

const log = createLogger('kflow:server:aiProgressionService');

/**
 * Daily progression for AI users (driven by the secret-gated /api/internal/ai-progress tick).
 * v1 keeps each AI user present in its domain's peer pools (re-touch presence so the recency
 * window never expires) and marks the tick. Extending the canonical concept set per tick is
 * an additive fast-follow (it would add a new domain concept + upsert to Chroma).
 */
export async function runDailyProgression(): Promise<{ processed: number }> {
  const users = await listAiUsers();
  const now = Date.now();
  await Promise.all(
    users.map(async (u) => {
      await touchPresenceForConcepts(u.uid, u.anonymousHandle, u.concepts);
      await getFirestore().collection('ai-users').doc(u.uid).update({ lastProgressedAt: now });
    }),
  );
  log.info('runDailyProgression done', { processed: users.length });
  return { processed: users.length };
}
