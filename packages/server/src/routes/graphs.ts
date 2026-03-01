import { Router } from 'express';
import { getGraph, listGraphs, removeGraph, upsertGraph } from '../controllers/graphController';
import authenticateFirebase from '../middlewares/authenticateFirebase';

const router = Router();

// All routes require authentication
router.use(authenticateFirebase);

router.get('/', listGraphs);
router.get('/:graphId', getGraph);
router.put('/:graphId', upsertGraph);
router.delete('/:graphId', removeGraph);

export default router;


