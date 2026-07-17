import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import { asyncHandler } from '@almadar/server';
import { createLogger } from '@almadar/logger';
import { runDailyProgression } from '../services/aiProgressionService';

const log = createLogger('kflow:server:routes:internalRoutes');
const router = Router();

// Secret-gated: Cloud Scheduler calls with header x-internal-token = INTERNAL_TOKEN (Cloud Secret).
// Not under authenticateFirebase — invoked by infra, not users.
router.use((req: Request, res: Response, next: NextFunction) => {
  const expected = process.env.INTERNAL_TOKEN;
  if (!expected || req.header('x-internal-token') !== expected) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  next();
});

// POST /api/internal/ai-progress — daily AI-user progression tick (Cloud Scheduler, every 24h).
router.post('/ai-progress', asyncHandler(async (_req: Request, res: Response) => {
  const result = await runDailyProgression();
  log.info('ai-progress tick', result);
  res.json(result);
}));

export default router;
