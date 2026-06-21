import { Router } from 'express';
import { authenticateFirebase } from '@almadar/server';
import {
  createExpansionHandler,
  createExplainConceptHandler,
  createAnswerQuestionHandler,
  createGenerateGoalHandler,
  createLayerPracticeHandler,
  createCustomOperationHandler,
} from '@almadar-io/knowledge/server';
import {
  generateGoalDeps,
  expansionDeps,
  explanationDeps,
  layerPracticeDeps,
  customOperationDeps,
} from '../utils/graphHandlerDeps';

const router = Router();

router.use(authenticateFirebase);

router.post('/:graphId/expand', createExpansionHandler(expansionDeps));
router.post('/:graphId/explain', createExplainConceptHandler(explanationDeps));
router.post('/:graphId/answer-question', createAnswerQuestionHandler(explanationDeps));
router.post('/:graphId/generate-goals', createGenerateGoalHandler(generateGoalDeps));
router.post('/:graphId/generate-layer-practice', createLayerPracticeHandler(layerPracticeDeps));
router.post('/:graphId/custom-operation', createCustomOperationHandler(customOperationDeps));

export default router;
