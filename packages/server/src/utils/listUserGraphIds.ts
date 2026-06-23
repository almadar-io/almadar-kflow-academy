import { getFirestore } from '@almadar/server';

/**
 * The ids of every knowledge graph owned by a user. Goals, learning-path
 * listings, and jump-back-in all enumerate the same `users/{uid}/knowledgeGraphs`
 * collection — this is the single source for that scan.
 */
export async function listUserGraphIds(uid: string): Promise<string[]> {
  const db = getFirestore();
  const snapshot = await db
    .collection('users')
    .doc(uid)
    .collection('knowledgeGraphs')
    .select('id')
    .get();
  return snapshot.docs.map(doc => doc.id);
}
