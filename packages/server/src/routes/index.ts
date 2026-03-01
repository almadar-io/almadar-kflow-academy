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
import publishingRoutes from './publishing';
import enrollmentRoutes from './enrollment';
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
import courseTemplateRoutes from './courseTemplateRoutes';
import publicRoutes from './public';
import studentManagementRoutes from './studentManagement';
import scheduleManagementRoutes from './scheduleManagement';

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
router.use('/mentor', publishingRoutes);
router.use('/student', enrollmentRoutes);
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
router.use('/public', publicRoutes); // Public routes (no auth required)
router.use('/', courseTemplateRoutes); // Course template routes (/templates, /user/templates, /courses/:id/save-as-template)
router.use('/', studentManagementRoutes); // Student management routes (/api/students)
router.use('/', scheduleManagementRoutes); // Schedule management routes (/api/schedules)

router.post('/explain-concept', authenticateFirebase, explainConcept);
router.post('/custom-operation', authenticateFirebase, customOperationHandler);
router.post('/progressive-expand-multiple-from-text', authenticateFirebase, progressiveExpandMultipleFromTextHandler);
router.post('/generate-layer-practice', authenticateFirebase, generateLayerPracticeHandler);
router.post('/answer-question', authenticateFirebase, answerQuestionHandler);
router.post('/generate-flash-cards', authenticateFirebase, generateFlashCardsHandler);

// Unused operations (commented out)
// router.post('/expand-list', authenticateFirebase, expandListHandler);
// router.post('/refocus', authenticateFirebase, refocusHandler);
// router.post('/progressive-expand', authenticateFirebase, progressiveExpandHandler);
// router.post('/progressive-expand-multiple', authenticateFirebase, progressiveExpandMultipleHandler);
// router.post('/advance-next', authenticateFirebase, advanceNextHandler);

export default router;

