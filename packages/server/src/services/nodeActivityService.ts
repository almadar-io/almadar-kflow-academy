import { getFirestore } from '@almadar/server';
import { createLogger } from '@almadar/logger';
import type { NodeKey } from '@kflow-academy/shared';

const log = createLogger('kflow:server:nodeActivityService');

const ACTIVE_NOW_MS = 5 * 60 * 1000;
const DEFAULT_WINDOW_DAYS = 7;

// Firestore ids may not contain '/'. nodeKey is `${kind}:${canonicalId}`; canonical ids are
// sanitized concept names but we guard the path segment regardless.
function pathSeg(nodeKey: string): string {
  return nodeKey.replace(/[^A-Za-z0-9_:.-]/g, '_').slice(0, 200);
}

export interface NodeMember {
  uid: string;
  anonymousHandle: string;
  isAi: boolean;
  lastSeenOnNode: number;
}

export async function touchNodeActivity(
  uid: string,
  nodeKey: NodeKey,
  anonymousHandle: string,
  isAi: boolean,
): Promise<void> {
  const db = getFirestore();
  const ref = db
    .collection('node-activity')
    .doc(pathSeg(nodeKey))
    .collection('members')
    .doc(uid);
  await ref.set(
    { lastSeenOnNode: Date.now(), anonymousHandle, isAi },
    { merge: true },
  );
}

export async function listRecentMembers(
  nodeKey: NodeKey,
  excludeUid: string,
  windowDays = DEFAULT_WINDOW_DAYS,
): Promise<NodeMember[]> {
  const db = getFirestore();
  const cutoff = Date.now() - windowDays * 24 * 60 * 60 * 1000;
  const snap = await db
    .collection('node-activity')
    .doc(pathSeg(nodeKey))
    .collection('members')
    .where('lastSeenOnNode', '>=', cutoff)
    .get();
  const rows: NodeMember[] = [];
  for (const doc of snap.docs) {
    if (doc.id === excludeUid) continue;
    const d = doc.data() as {
      anonymousHandle?: string;
      isAi?: boolean;
      lastSeenOnNode?: number;
    };
    if (typeof d.lastSeenOnNode !== 'number') continue;
    rows.push({
      uid: doc.id,
      anonymousHandle: d.anonymousHandle ?? 'peer',
      isAi: d.isAi ?? false,
      lastSeenOnNode: d.lastSeenOnNode,
    });
  }
  return rows;
}

export function isActiveNow(lastSeenOnNode: number, now = Date.now()): boolean {
  return now - lastSeenOnNode <= ACTIVE_NOW_MS;
}

log.debug('nodeActivityService loaded');
