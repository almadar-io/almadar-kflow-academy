import { randomBytes } from 'node:crypto';
import { getFirestore } from '@almadar/server';
import { createLogger } from '@almadar/logger';
import type { NodeKey } from '@kflow-academy/shared';

const log = createLogger('kflow:server:peerTokenService');

const TOKEN_TTL_MS = 10 * 60 * 1000;

/**
 * Opaque, short-lived tokens that let a client address a peer for connect without ever
 * seeing the peer's uid. The token → {peerUid, nodeKey} mapping lives server-side only;
 * the client receives an opaque string. Identity never crosses the trust boundary.
 */
export async function issuePeerToken(peerUid: string, nodeKey: NodeKey, isAi: boolean): Promise<string> {
  const token = randomBytes(18).toString('base64url');
  const db = getFirestore();
  await db.collection('peer-tokens').doc(token).set({
    peerUid,
    nodeKey,
    isAi,
    createdAt: Date.now(),
    expiresAt: Date.now() + TOKEN_TTL_MS,
  });
  return token;
}

export async function resolvePeerToken(
  token: string,
): Promise<{ peerUid: string; nodeKey: NodeKey; isAi: boolean } | null> {
  const db = getFirestore();
  const snap = await db.collection('peer-tokens').doc(token).get();
  if (!snap.exists) return null;
  const d = snap.data() as { peerUid?: string; nodeKey?: NodeKey; isAi?: boolean; expiresAt?: number };
  if (typeof d.peerUid !== 'string' || typeof d.nodeKey !== 'string') return null;
  if (typeof d.expiresAt === 'number' && d.expiresAt < Date.now()) {
    await snap.ref.delete().catch(() => {});
    return null;
  }
  return { peerUid: d.peerUid, nodeKey: d.nodeKey, isAi: d.isAi ?? false };
}

log.debug('peerTokenService loaded');
