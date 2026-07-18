import { getFirestore } from '@almadar/server';
import { NotFoundError, ForbiddenError } from '@almadar/server';
import { createLogger } from '@almadar/logger';
import { callLLM, extractJSONArray } from './llm';
import { resolvePeerToken } from './peerTokenService';
import { anonymousHandleFor } from '../utils/anonymousHandle';
import { graphAccessDeps } from '../utils/graphHandlerDeps';
import type {
  ConnectionBadge,
  ConnectionDTO,
  CreateConnectionRequest,
  MessageDTO,
  MessageModeration,
  NodeKind,
  PeerSnapshot,
} from '@kflow-academy/shared';

const log = createLogger('kflow:server:connectionService');

const DORMANT_MS = 7 * 24 * 60 * 60 * 1000;

interface StoredBadge {
  id: string;
  label: string;
  kind: 'subtopic' | 'friction';
  active: boolean;
}
interface StoredSnapshot {
  anonymousHandle: string;
  conceptsCompleted: number;
}
interface StoredConnection {
  callerUid: string;
  peerUid: string;
  participants: string[];
  origin: { kind: NodeKind; canonicalId: string };
  badges: StoredBadge[];
  activeBadgeId?: string;
  status: 'active' | 'archived';
  callerSnapshot: StoredSnapshot;
  peerSnapshot: StoredSnapshot;
  createdAt: number;
  lastActivityAt: number;
  archivedAt?: number;
}
interface StoredMessage {
  senderUid: string;
  content: string;
  createdAt: number;
  activeBadgeId?: string;
  moderation?: MessageModeration;
}

function vector() {
  return graphAccessDeps.accessLayer.getVectorService();
}

// Phase-0 decision: no cross-user friction signal exists, so badges are AI-generated
// sub-topics for both connection kinds. Friction-ranked path badges are a fast-follow.
async function generateBadges(canonicalId: string, kind: NodeKind): Promise<StoredBadge[]> {
  try {
    const resp = await callLLM({
      temperature: 0.4,
      maxTokens: 200,
      systemPrompt:
        'You pick discussion sub-topics for a knowledge peer-connection. Return ONLY a JSON array ' +
        'of 3-5 short strings (max 6 words each): the most useful sub-topics two learners might ' +
        'discuss for the given topic. No prose, no numbering.',
      userPrompt: `Topic (${kind}): ${canonicalId}`,
    });
    const arr = extractJSONArray(resp.content);
    const labels = arr.filter((x): x is string => typeof x === 'string').slice(0, 5);
    if (labels.length === 0) throw new Error('no labels');
    return labels.map((label, i) => ({ id: `b${i}`, label, kind: 'subtopic', active: i === 0 }));
  } catch (e) {
    log.warn('generateBadges failed, using single fallback badge', { error: e instanceof Error ? e.message : String(e) });
    return [{ id: 'b0', label: canonicalId, kind: 'subtopic', active: true }];
  }
}

export async function createConnection(
  callerUid: string,
  body: CreateConnectionRequest,
): Promise<{ id: string }> {
  const resolved = await resolvePeerToken(body.peerRef);
  if (!resolved) throw new ForbiddenError('Peer token is invalid or expired');
  if (resolved.peerUid === callerUid) throw new ForbiddenError('Cannot connect to yourself');

  const [callerSet, peerSet, badges] = await Promise.all([
    vector().getCanonicalConceptsByOwner(callerUid),
    vector().getCanonicalConceptsByOwner(resolved.peerUid),
    generateBadges(body.origin.canonicalId, body.origin.kind),
  ]);

  const now = Date.now();
  const conn: StoredConnection = {
    callerUid,
    peerUid: resolved.peerUid,
    participants: [callerUid, resolved.peerUid],
    origin: body.origin,
    badges,
    activeBadgeId: badges[0]?.id,
    status: 'active',
    callerSnapshot: {
      anonymousHandle: anonymousHandleFor(callerUid),
      conceptsCompleted: callerSet.count,
    },
    peerSnapshot: {
      anonymousHandle: anonymousHandleFor(resolved.peerUid),
      conceptsCompleted: peerSet.count,
    },
    createdAt: now,
    lastActivityAt: now,
  };
  const ref = await getFirestore().collection('connections').add(conn);
  log.debug('createConnection', { id: ref.id, badges: badges.length });
  return { id: ref.id };
}

export async function archiveIfDormant(id: string): Promise<void> {
  const ref = getFirestore().collection('connections').doc(id);
  const snap = await ref.get();
  if (!snap.exists) return;
  const c = snap.data() as StoredConnection;
  if (c.status !== 'active') return;
  if (Date.now() - (c.lastActivityAt ?? 0) < DORMANT_MS) return;
  await ref.update({ status: 'archived', archivedAt: Date.now() });
  log.debug('archiveIfDormant archived', { id });
}

export async function touchActivity(id: string): Promise<void> {
  await getFirestore().collection('connections').doc(id).update({ lastActivityAt: Date.now() });
}

async function loadAuthorized(id: string, viewerUid: string): Promise<{ snap: FirebaseFirestore.DocumentSnapshot; conn: StoredConnection; isCaller: boolean }> {
  await archiveIfDormant(id);
  const snap = await getFirestore().collection('connections').doc(id).get();
  if (!snap.exists) throw new NotFoundError('Connection not found');
  const conn = snap.data() as StoredConnection;
  const isCaller = conn.callerUid === viewerUid;
  if (!conn.participants.includes(viewerUid)) throw new ForbiddenError('Not a participant');
  return { snap, conn, isCaller };
}

export async function getConnectionView(id: string, viewerUid: string): Promise<ConnectionDTO> {
  const { snap, conn, isCaller } = await loadAuthorized(id, viewerUid);
  const msgsSnap = await snap.ref.collection('messages').orderBy('createdAt', 'asc').get();
  const messages: MessageDTO[] = msgsSnap.docs.map((d) => {
    const m = d.data() as StoredMessage;
    return {
      id: d.id,
      fromViewer: m.senderUid === viewerUid,
      content: m.content,
      createdAt: m.createdAt,
      activeBadgeId: m.activeBadgeId,
      moderation: m.moderation,
    };
  });
  const peer: PeerSnapshot = isCaller ? conn.peerSnapshot : conn.callerSnapshot;
  const badges: ConnectionBadge[] = conn.badges;
  return { id, origin: conn.origin, badges, status: conn.status, peer, messages };
}

export async function setActiveBadge(id: string, viewerUid: string, badgeId: string): Promise<void> {
  const { conn } = await loadAuthorized(id, viewerUid);
  if (!conn.badges.some((b) => b.id === badgeId)) throw new NotFoundError('Badge not found');
  await getFirestore().collection('connections').doc(id).update({ activeBadgeId: badgeId });
}

export async function appendMessage(
  id: string,
  senderUid: string,
  content: string,
  activeBadgeId: string | undefined,
): Promise<{ messageId: string; activeBadgeLabel: string | undefined }> {
  const { conn } = await loadAuthorized(id, senderUid);
  const badge = conn.badges.find((b) => b.id === activeBadgeId);
  const ref = await getFirestore()
    .collection('connections')
    .doc(id)
    .collection('messages')
    .add({
      senderUid,
      content,
      createdAt: Date.now(),
      activeBadgeId: activeBadgeId ?? conn.activeBadgeId,
    });
  await touchActivity(id);
  return { messageId: ref.id, activeBadgeLabel: badge?.label ?? conn.badges.find((b) => b.id === conn.activeBadgeId)?.label };
}

export async function attachModeration(id: string, messageId: string, moderation: MessageModeration): Promise<void> {
  await getFirestore()
    .collection('connections')
    .doc(id)
    .collection('messages')
    .doc(messageId)
    .update({ moderation });
}
