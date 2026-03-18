import { Router } from 'express';
import { 
  health, 
  explainConcept, 
  progressiveExpandMultipleFromTextHandler, 
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
  progressiveExpandSingleHandler,
  progressiveExploreHandler,
  generateFlashCardsHandler
} from '../controllers/aiController';
import authenticateFirebase from '../middlewares/authenticateFirebase';
import graphRoutes from './graphs';
import userRoutes from './userRoutes';
import goalRoutes from './goalRoutes';
import placementTestRoutes from './placementTestRoutes';
import knowledgeGraphRoutes from './knowledgeGraphRoutes';
import knowledgeGraphAccessRoutes from './knowledgeGraphAccessRoutes';
import graphQueryRoutes from './graphQueryRoutes';
import enrichmentRoutes from './enrichmentRoutes';
import graphOperationRoutes from './graphOperationRoutes';
import translationRoutes from './translation';
import analyticsRoutes from './analytics';
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
router.post('/progressive-expand-single', authenticateFirebase, progressiveExpandSingleHandler);
router.post('/progressive-explore', authenticateFirebase, progressiveExploreHandler);
router.use('/graphs', authenticateFirebase, graphRoutes);
// Mentor/Student routes disabled for Lite build
// router.use('/mentor', publishingRoutes);
// router.use('/student', enrollmentRoutes);
router.use('/user', userRoutes);
router.use('/learning', authenticateFirebase, goalRoutes);
router.use('/learning/placement', authenticateFirebase, placementTestRoutes);
router.use('/knowledge-graphs', knowledgeGraphRoutes);
router.use('/knowledge-graphs-access', knowledgeGraphAccessRoutes);
router.use('/graph-queries', graphQueryRoutes);
router.use('/enrichment', enrichmentRoutes);
router.use('/graph-operations', graphOperationRoutes);
router.use('/translation', translationRoutes);
router.use('/analytics', analyticsRoutes);
router.use('/content', storyRoutes);
// Public routes disabled for Lite build
// router.use('/public', publicRoutes);
// Course template routes disabled for Lite build
// router.use('/', courseTemplateRoutes);
// Student management routes disabled for Lite build
// router.use('/', studentManagementRoutes);
// Schedule management routes disabled for Lite build
// router.use('/', scheduleManagementRoutes);

router.post('/explain-concept', authenticateFirebase, explainConcept);
router.post('/custom-operation', authenticateFirebase, customOperationHandler);
router.post('/progressive-expand-multiple-from-text', authenticateFirebase, progressiveExpandMultipleFromTextHandler);
router.post('/generate-layer-practice', authenticateFirebase, generateLayerPracticeHandler);
router.post('/answer-question', authenticateFirebase, answerQuestionHandler);
router.post('/generate-flash-cards', authenticateFirebase, generateFlashCardsHandler);

export default router;
