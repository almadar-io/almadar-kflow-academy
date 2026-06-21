import { Router } from 'express';
import { authenticateFirebase } from '@almadar/server';
import {
  validateGraphId,
  validateNodeId,
  validateCreateNode,
  validateCreateRelationship,
  validateExtractSubgraph,
} from '../middlewares/validateKnowledgeGraphAccess';
import {
  createGetGraphHandler,
  createSaveGraphHandler,
  createGetNodesHandler,
  createGetNodeHandler,
  createCreateNodeHandler,
  createUpdateNodeHandler,
  createDeleteNodeHandler,
  createGetRelationshipsHandler,
  createGetNodeRelationshipsHandler,
  createCreateRelationshipHandler,
  createDeleteRelationshipHandler,
  createFindPathHandler,
  createTraverseHandler,
  createExtractSubgraphHandler,
  createFindNodesHandler,
  createApplyMutationsHandler,
  createValidateMutationsHandler,
} from '@almadar-io/knowledge/server';
import { graphAccessDeps, graphMutationDeps } from '../utils/graphHandlerDeps';

const router = Router();

router.use(authenticateFirebase);

router.param('graphId', validateGraphId);
router.param('nodeId', validateNodeId);

router.get('/:graphId', createGetGraphHandler(graphAccessDeps));
router.put('/:graphId', createSaveGraphHandler(graphAccessDeps));

router.get('/:graphId/nodes', createGetNodesHandler(graphAccessDeps));
router.post('/:graphId/nodes/find', createFindNodesHandler(graphAccessDeps));
router.get('/:graphId/nodes/:nodeId', createGetNodeHandler(graphAccessDeps));
router.post('/:graphId/nodes', validateCreateNode, createCreateNodeHandler(graphAccessDeps));
router.put('/:graphId/nodes/:nodeId', createUpdateNodeHandler(graphAccessDeps));
router.delete('/:graphId/nodes/:nodeId', createDeleteNodeHandler(graphAccessDeps));

router.get('/:graphId/relationships', createGetRelationshipsHandler(graphAccessDeps));
router.get('/:graphId/nodes/:nodeId/relationships', createGetNodeRelationshipsHandler(graphAccessDeps));
router.post('/:graphId/relationships', validateCreateRelationship, createCreateRelationshipHandler(graphAccessDeps));
router.delete('/:graphId/relationships/:relId', createDeleteRelationshipHandler(graphAccessDeps));

router.get('/:graphId/path/:from/:to', createFindPathHandler(graphAccessDeps));
router.post('/:graphId/traverse/:startNodeId', createTraverseHandler(graphAccessDeps));
router.post('/:graphId/subgraph', validateExtractSubgraph, createExtractSubgraphHandler(graphAccessDeps));

router.post('/:graphId/mutations', createApplyMutationsHandler(graphMutationDeps));
router.post('/:graphId/mutations/validate', createValidateMutationsHandler(graphMutationDeps));

export default router;
