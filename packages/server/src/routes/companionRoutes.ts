import { Router } from 'express';
import type { Request, Response } from 'express';
import { authenticateFirebase, asyncHandler } from '@almadar/server';
import { createLogger } from '@almadar/logger';
import { analyzeTrajectory, analyzeTrajectoryStream, replyToUser } from '../services/companionService';
import { ensureSuggestions, resolveSuggestion, suggestionSig } from '../services/companionSuggestionService';
import { getCompanionPersona } from '../services/companionPersonaService';

const log = createLogger('kflow:server:routes:companionRoutes');
const router = Router();

router.use(authenticateFirebase);

router.get('/suggestions', asyncHandler(async (req: Request, res: Response) => {
  const uid = req.firebaseUser?.uid;
  if (!uid) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }
  const skillName = typeof req.query.skill === 'string' ? req.query.skill : undefined;
  const locale = typeof req.query.locale === 'string' ? req.query.locale : undefined;
  const result = await ensureSuggestions(uid, skillName, locale);
  res.json(result);
}));

router.patch('/suggestions', asyncHandler(async (req: Request, res: Response) => {
  const uid = req.firebaseUser?.uid;
  if (!uid) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }
  const { suggestion, status } = req.body ?? {};
  if (!suggestion || (status !== 'accepted' && status !== 'dismissed')) {
    res.status(400).json({ error: 'suggestion and status (accepted|dismissed) are required' });
    return;
  }
  const sig = suggestionSig(suggestion);
  await resolveSuggestion(uid, sig, status);
  res.json({ ok: true });
}));

router.get('/persona', asyncHandler(async (req: Request, res: Response) => {
  const uid = req.firebaseUser?.uid;
  if (!uid) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }
  const persona = await getCompanionPersona();
  res.json(persona);
}));

router.post('/analyze', asyncHandler(async (req: Request, res: Response) => {
  const uid = req.firebaseUser?.uid;
  if (!uid) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }
  const skillName = typeof req.body?.skill === 'string' ? req.body.skill : undefined;
  const locale = typeof req.body?.locale === 'string' ? req.body.locale : undefined;
  log.info('companion /analyze', { uid, skillName, locale });
  const result = await analyzeTrajectory(uid, skillName, locale);
  res.json(result);
}));

router.get('/analyze-stream', async (req: Request, res: Response) => {
  const uid = req.firebaseUser?.uid;
  if (!uid) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }
  const skillName = typeof req.query.skill === 'string' ? req.query.skill : undefined;
  const locale = typeof req.query.locale === 'string' ? req.query.locale : undefined;
  log.info('companion /analyze-stream', { uid, skillName, locale });

  req.on('close', () => {
    log.debug('companion /analyze-stream: client disconnected', { uid });
  });

  await analyzeTrajectoryStream(res, uid, skillName, locale);
});

router.post('/reply', asyncHandler(async (req: Request, res: Response) => {
  const uid = req.firebaseUser?.uid;
  if (!uid) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }
  const message = typeof req.body?.message === 'string' ? req.body.message : '';
  const locale = typeof req.body?.locale === 'string' ? req.body.locale : undefined;
  if (!message.trim()) {
    res.status(400).json({ error: 'message is required' });
    return;
  }
  log.info('companion /reply', { uid, messageLength: message.length, locale });
  const result = await replyToUser(uid, message, locale);
  res.json(result);
}));

export default router;
