import { Router } from 'express';
import { getGraph, listGraphs, removeGraph, upsertGraph } from '../controllers/graphController';

const router = Router();

router.get('/', listGraphs);
router.get('/:graphId', getGraph);
router.put('/:graphId', upsertGraph);
router.delete('/:graphId', removeGraph);

export default router;


