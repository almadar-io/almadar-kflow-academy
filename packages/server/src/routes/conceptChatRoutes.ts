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
import { generatePersona, replyAsPersona } from '../services/conceptPersonaService';
import { scoreRelevance } from '../services/moderationService';

const log = createLogger('kflow:server:routes:conceptChatRoutes');
const router = Router();

router.use(authenticateFirebase);

// POST /api/concept-chat/start — generate the on-the-fly originator persona + greeting.
router.post('/start', asyncHandler(async (req: Request, res: Response) => {
  const { conceptLabel } = req.body as StartConceptChatRequest;
  if (!conceptLabel?.trim()) {
    res.status(400).json({ error: 'conceptLabel required' });
    return;
  }
  const result = await generatePersona(conceptLabel.trim());
  const response: StartConceptChatResponse = result;
  res.json(response);
}));

// POST /api/concept-chat/message — moderate (soft, non-blocking) + reply in persona.
router.post('/message', asyncHandler(async (req: Request, res: Response) => {
  const body = req.body as SendConceptChatRequest;
  if (!body?.message?.trim() || !body?.persona?.name || !body?.conceptLabel?.trim()) {
    res.status(400).json({ error: 'conceptLabel + persona + message required' });
    return;
  }
  // Relevance check fails open; logged but never blocks the reply.
  void scoreRelevance(body.message, body.conceptLabel).catch((e) =>
    log.warn('concept-chat moderation failed', { error: e instanceof Error ? e.message : String(e) }),
  );
  const reply = await replyAsPersona(body.persona, body.conceptLabel.trim(), body.history ?? [], body.message);
  const response: SendConceptChatResponse = { reply };
  res.json(response);
}));

export default router;
