import { Router } from 'express';
import type { Request, Response } from 'express';
import { authenticateFirebase, asyncHandler } from '@almadar/server';
import { createLogger } from '@almadar/logger';
import type { NodeKey, CreateConnectionRequest, SendMessageRequest } from '@kflow-academy/shared';
import { touchNodeActivity } from '../services/nodeActivityService';
import { listPeersForNode } from '../services/peerMatchService';
import { anonymousHandleFor } from '../utils/anonymousHandle';
import * as connectionService from '../services/connectionService';
import { scoreRelevance } from '../services/moderationService';

const log = createLogger('kflow:server:routes:peerRoutes');
const router = Router();

router.use(authenticateFirebase);

function getUid(req: Request): string {
  const u = req.firebaseUser?.uid;
  if (!u) throw new Error('Unauthorized');
  return u;
}

// express param values are `string | string[]`; collapse to a single string.
function param(v: string | string[] | undefined): string | undefined {
  return Array.isArray(v) ? v[0] : v;
}

// GET /api/peers?nodeKey=${kind}:${canonicalId} — anonymous peer list for a node.
router.get('/peers', asyncHandler(async (req: Request, res: Response) => {
  const nk = typeof req.query.nodeKey === 'string' ? req.query.nodeKey : undefined;
  log.info('GET /peers', { nodeKey: nk });
  if (!nk) {
    res.status(400).json({ error: 'nodeKey required' });
    return;
  }
  const peers = await listPeersForNode(getUid(req), nk as NodeKey);
  res.json({ peers });
}));

// POST /api/node-activity/:nodeKey — idempotent presence touch on node-view mount.
router.post('/node-activity/:nodeKey', asyncHandler(async (req: Request, res: Response) => {
  const viewerUid = getUid(req);
  const nk = param(req.params.nodeKey);
  await touchNodeActivity(viewerUid, (nk ?? '') as NodeKey, anonymousHandleFor(viewerUid));
  res.json({ ok: true });
}));

// POST /api/connections — open a grounded 1:1 thread (no concurrency cap).
router.post('/connections', asyncHandler(async (req: Request, res: Response) => {
  const body = req.body as CreateConnectionRequest;
  if (!body?.peerRef || !body?.origin?.kind || !body?.origin?.canonicalId) {
    res.status(400).json({ error: 'peerRef + origin required' });
    return;
  }
  const { id } = await connectionService.createConnection(getUid(req), body);
  res.status(201).json({ id });
}));

// GET /api/connections/:id — thread view (lazy archive on read; participant-checked).
router.get('/connections/:id', asyncHandler(async (req: Request, res: Response) => {
  const view = await connectionService.getConnectionView(param(req.params.id) ?? '', getUid(req));
  res.json(view);
}));

// PATCH /api/connections/:id/active-badge — focus the thread on a grounding badge.
router.patch('/connections/:id/active-badge', asyncHandler(async (req: Request, res: Response) => {
  const { badgeId } = req.body as { badgeId?: string };
  if (!badgeId) {
    res.status(400).json({ error: 'badgeId required' });
    return;
  }
  await connectionService.setActiveBadge(param(req.params.id) ?? '', getUid(req), badgeId);
  res.json({ ok: true });
}));

// POST /api/connections/:id/messages — send + soft-flag moderation (async, non-blocking).
router.post('/connections/:id/messages', asyncHandler(async (req: Request, res: Response) => {
  const body = req.body as SendMessageRequest;
  if (!body?.content?.trim()) {
    res.status(400).json({ error: 'content required' });
    return;
  }
  const viewerUid = getUid(req);
  const connectionId = param(req.params.id) ?? '';
  const { messageId, activeBadgeLabel } = await connectionService.appendMessage(
    connectionId,
    viewerUid,
    body.content,
    body.activeBadgeId,
  );
  // Soft-flag moderation runs after the message is visible (never blocks the sender).
  void scoreRelevance(body.content, activeBadgeLabel)
    .then((moderation) => connectionService.attachModeration(connectionId, messageId, moderation))
    .catch((e) => log.warn('moderation attach failed', { error: e instanceof Error ? e.message : String(e) }));

  res.status(201).json({ messageId });
}));

export default router;
