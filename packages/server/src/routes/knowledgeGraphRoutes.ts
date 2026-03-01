/**
 * Knowledge Graph Routes
 * 
 * API routes for knowledge graph conversion and export.
 * Part of Phase 2: Concept Graph to Knowledge Graph Conversion
 */

import { Router } from 'express';
import authenticateFirebase from '../middlewares/authenticateFirebase';
import {
  convertGraphHandler,
  getKnowledgeGraphHandler,
  exportGraphMLHandler,
  updateLayerGoalHandler,
} from '../controllers/knowledgeGraphController';

const router = Router();

// All routes require authentication
router.use(authenticateFirebase);

// Convert ConceptGraph to KnowledgeGraph
router.post('/convert/:graphId', convertGraphHandler);

// Get KnowledgeGraph
router.get('/:graphId', getKnowledgeGraphHandler);

// Export to GraphML
router.get('/:graphId/export/graphml', exportGraphMLHandler);

// Update layer goal
router.patch('/:graphId/layers/:layerNumber/goal', updateLayerGoalHandler);

export default router;

