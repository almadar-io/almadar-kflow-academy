import { Router } from 'express';
import {
  createGetLearningPathsHandler,
  createGetGraphSummaryHandler,
  createGetConceptsHandler,
  createGetConceptDetailHandler,
  createGetMindMapHandler,
} from '@almadar-io/knowledge/server';
import { authenticateFirebase } from '@almadar/server';
import { graphQueryDeps } from '../utils/graphHandlerDeps';

const router = Router();

router.use(authenticateFirebase);

router.get('/learning-paths', createGetLearningPathsHandler(graphQueryDeps));
router.get('/:graphId/summary', createGetGraphSummaryHandler(graphQueryDeps));
router.get('/:graphId/concepts', createGetConceptsHandler(graphQueryDeps));
router.get('/:graphId/concepts/:conceptId', createGetConceptDetailHandler(graphQueryDeps));
router.get('/:graphId/mindmap', createGetMindMapHandler(graphQueryDeps));

export default router;
