/**
 * Graph Operation Routes
 * 
 * REST API routes for graph operations (expansion, explanation, goals, etc.)
 */

import { Router } from 'express';
import authenticateFirebase from '../middlewares/authenticateFirebase';
import { progressiveExpandHandler } from '../controllers/graphExpansionController';
import {
  explainConceptHandler,
  answerQuestionHandler,
} from '../controllers/graphExplanationController';
import { generateGoalsHandler } from '../controllers/graphGoalController';
import { generateLayerPracticeHandler } from '../controllers/graphLayerPracticeController';
import { customOperationHandler } from '../controllers/graphCustomOperationController';

const router = Router();

// All routes require authentication
router.use(authenticateFirebase);

// Progressive expansion
router.post('/:graphId/expand', progressiveExpandHandler);

// Explanation operations
router.post('/:graphId/explain', explainConceptHandler);
router.post('/:graphId/answer-question', answerQuestionHandler);

// Goal generation
router.post('/:graphId/generate-goals', generateGoalsHandler);

// Layer practice
router.post('/:graphId/generate-layer-practice', generateLayerPracticeHandler);

// Custom operation
router.post('/:graphId/custom-operation', customOperationHandler);

export default router;

