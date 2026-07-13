import { createLogger } from '@almadar/logger';
import { getFirestore } from '@almadar/server';

const log = createLogger('kflow:server:utils:listUserGraphIds');

/**
 * The ids of every knowledge graph owned by a user. Goals, learning-path
 * listings, and jump-back-in all enumerate the same `users/{uid}/knowledgeGraphs`
 * collection — this is the single source for that scan.
 */
export async function listUserGraphIds(uid: string): Promise<string[]> {
  log.info('[CHROMA-DEBUG] listUserGraphIds called', { uid });
  const db = getFirestore();
  const snapshot = await db
    .collection('users')
    .doc(uid)
    .collection('knowledgeGraphs')
    .select('id')
    .get();
  const ids = snapshot.docs.map(doc => doc.id);
  log.info('[CHROMA-DEBUG] listUserGraphIds result', { count: ids.length, ids: ids.join(',') });
  return ids;
}
