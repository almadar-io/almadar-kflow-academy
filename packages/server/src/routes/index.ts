import { Router } from 'express';
import {
  health,
  explainConcept,
  generateLayerPracticeHandler,
  answerQuestionHandler,
  customOperationHandler,
  expandConcept,
  generateNextLayer,
  generateNextConcept,
  deriveParentsHandler,
  deriveSummaryHandler,
  synthesizeHandler,
  exploreHandler,
  tracePathHandler,
  progressiveExploreHandler,
  generateFlashCardsHandler,
  runCodeSimulationHandler,
  generateInteractiveOrbitalHandler
} from '../controllers/aiController';
import authenticateFirebase from '../middlewares/authenticateFirebase';
import graphRoutes from './graphs';
import userRoutes from './userRoutes';
import goalRoutes from './goalRoutes';
import placementTestRoutes from './placementTestRoutes';
import graphQueryRoutes from './graphQueryRoutes';
import knowledgeGraphAccessRoutes from './knowledgeGraphAccessRoutes';
import storyRoutes from './storyRoutes';

const router = Router();

router.get('/health', health);

// Concept operations
router.post('/expand-concept', authenticateFirebase, expandConcept);
router.post('/synthesize', authenticateFirebase, synthesizeHandler);
router.post('/explore', authenticateFirebase, exploreHandler);
router.post('/trace-path', authenticateFirebase, tracePathHandler);
router.post('/generate-next-layer', authenticateFirebase, generateNextLayer);
router.post('/generate-next-concept', authenticateFirebase, generateNextConcept);
router.post('/derive-parents', authenticateFirebase, deriveParentsHandler);
router.post('/derive-summary', authenticateFirebase, deriveSummaryHandler);
router.post('/progressive-explore', authenticateFirebase, progressiveExploreHandler);
router.use('/graphs', authenticateFirebase, graphRoutes);
router.use('/user', userRoutes);
router.use('/learning', authenticateFirebase, goalRoutes);
router.use('/learning/placement', authenticateFirebase, placementTestRoutes);
router.use('/graph-queries', graphQueryRoutes);
router.use('/knowledge-graphs-access', knowledgeGraphAccessRoutes);
router.use('/content', storyRoutes);

router.post('/explain-concept', authenticateFirebase, explainConcept);
router.post('/custom-operation', authenticateFirebase, customOperationHandler);
router.post('/generate-layer-practice', authenticateFirebase, generateLayerPracticeHandler);
router.post('/answer-question', authenticateFirebase, answerQuestionHandler);
router.post('/generate-flash-cards', authenticateFirebase, generateFlashCardsHandler);
router.post('/run-code-simulation', authenticateFirebase, runCodeSimulationHandler);
router.post('/generate-interactive-orbital', authenticateFirebase, generateInteractiveOrbitalHandler);

export default router;
