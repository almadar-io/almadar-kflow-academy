import { Router } from 'express';
import type { Request, Response } from 'express';
import { authenticateFirebase, asyncHandler } from '@almadar/server';
import { createLogger } from '@almadar/logger';
import { getConceptImage } from '../services/conceptImageService';

const log = createLogger('kflow:server:routes:conceptImageRoutes');
const router = Router();

router.use(authenticateFirebase);

// GET /api/concept-image?label=Java — Wikipedia lead image for a topic, Firestore-cached.
router.get('/', asyncHandler(async (req: Request, res: Response) => {
  const label = typeof req.query.label === 'string' ? req.query.label : '';
  if (!label.trim()) {
    res.status(400).json({ error: 'label required' });
    return;
  }
  const url = await getConceptImage(label);
  log.debug('concept-image', { label, hit: !!url, uid: req.firebaseUser?.uid });
  res.json({ url });
}));

export default router;
