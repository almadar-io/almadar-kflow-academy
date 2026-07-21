import { Router } from 'express';
import type { Request, Response } from 'express';
import { authenticateFirebase, asyncHandler } from '@almadar/server';
import { createLogger } from '@almadar/logger';
import { getConceptIcon } from '../services/conceptIconService';

const log = createLogger('kflow:server:routes:conceptIconRoutes');
const router = Router();

router.use(authenticateFirebase);

// GET /api/concept-icon?label=Java — Iconify icon id (devicon logo or representative icon)
// for a topic, Firestore-cached. Returns { icon: "devicon:java" | null }.
router.get('/', asyncHandler(async (req: Request, res: Response) => {
  const label = typeof req.query.label === 'string' ? req.query.label : '';
  if (!label.trim()) {
    res.status(400).json({ error: 'label required' });
    return;
  }
  const result = await getConceptIcon(label);
  log.debug('concept-icon', { label, icon: result?.icon, tone: result?.tone, uid: req.firebaseUser?.uid });
  res.json(result ? { icon: result.icon, tone: result.tone } : { icon: null, tone: null });
}));

export default router;
