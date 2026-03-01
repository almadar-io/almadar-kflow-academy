/**
 * Enrichment Routes
 * 
 * API routes for graph enrichment operations.
 */

import { Router } from 'express';
import { authenticateFirebase } from '../middlewares/authenticateFirebase';
import { enrichGraphHandler, applyEnrichmentsHandler, enrichLayerHandler } from '../controllers/enrichmentController';

const router = Router();

// All routes require authentication
router.use(authenticateFirebase);

// Enrich a knowledge graph
router.post('/:graphId', enrichGraphHandler);

// Enrich a specific layer
router.post('/:graphId/layers/:layerNumber', enrichLayerHandler);

// Apply enrichments to a knowledge graph
router.post('/:graphId/apply', applyEnrichmentsHandler);

export default router;

