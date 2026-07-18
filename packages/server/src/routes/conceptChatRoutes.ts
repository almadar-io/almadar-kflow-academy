import { Router } from 'express';
import type { Request, Response } from 'express';
import { authenticateFirebase, asyncHandler } from '@almadar/server';
import { createLogger } from '@almadar/logger';
import type {
  StartConceptChatRequest,
  StartConceptChatResponse,
  SendConceptChatRequest,
  SendConceptChatResponse,
} from '@kflow-academy/shared';
import { generatePersona, loadFullPersona, replyAsPersona } from '../services/conceptPersonaService';
import { scoreRelevance } from '../services/moderationService';

const log = createLogger('kflow:server:routes:conceptChatRoutes');
const router = Router();

router.use(authenticateFirebase);

// POST /api/concept-chat/start — generate the on-the-fly originator persona + greeting.
router.post('/start', asyncHandler(async (req: Request, res: Response) => {
  const { conceptLabel } = req.body as StartConceptChatRequest;
  log.info('concept-chat /start', { conceptLabel, uid: req.firebaseUser?.uid });
  if (!conceptLabel?.trim()) {
    res.status(400).json({ error: 'conceptLabel required' });
    return;
  }
  const result = await generatePersona(conceptLabel.trim());
  const response: StartConceptChatResponse = result;
  res.json(response);
}));

// POST /api/concept-chat/message — moderate (soft, non-blocking) + reply in persona.
// Persona authority is server-side: the full persona + biography are loaded from the
// concept-personas cache by conceptLabel, so the client never round-trips the bio.
router.post('/message', asyncHandler(async (req: Request, res: Response) => {
  const body = req.body as SendConceptChatRequest;
  log.info('concept-chat /message', { conceptLabel: body?.conceptLabel, uid: req.firebaseUser?.uid });
  if (!body?.message?.trim() || !body?.conceptLabel?.trim()) {
    res.status(400).json({ error: 'conceptLabel + message required' });
    return;
  }
  // Relevance check fails open; logged but never blocks the reply.
  void scoreRelevance(body.message, body.conceptLabel).catch((e) =>
    log.warn('concept-chat moderation failed', { error: e instanceof Error ? e.message : String(e) }),
  );
  const full = await loadFullPersona(body.conceptLabel.trim());
  const reply = await replyAsPersona(full, body.conceptLabel.trim(), body.history ?? [], body.message);
  const response: SendConceptChatResponse = { reply };
  res.json(response);
}));

export default router;
