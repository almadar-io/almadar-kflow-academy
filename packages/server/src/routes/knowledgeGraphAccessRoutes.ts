/**
 * Knowledge Graph Access Routes
 * 
 * REST API routes for querying and mutating NodeBasedKnowledgeGraph
 * using the KnowledgeGraphAccessLayer.
 * 
 * Phase 2: REST API Endpoints
 */

import { Router } from 'express';
import authenticateFirebase from '../middlewares/authenticateFirebase';
import {
  validateGraphId,
  validateNodeId,
  validateCreateNode,
  validateCreateRelationship,
  validateExtractSubgraph,
} from '../middlewares/validateKnowledgeGraphAccess';
import {
  getGraphHandler,
  saveGraphHandler,
  getNodesHandler,
  getNodeHandler,
  createNodeHandler,
  updateNodeHandler,
  deleteNodeHandler,
  getRelationshipsHandler,
  getNodeRelationshipsHandler,
  createRelationshipHandler,
  deleteRelationshipHandler,
  findPathHandler,
  traverseHandler,
  extractSubgraphHandler,
  findNodesHandler,
} from '../controllers/knowledgeGraphAccessController';
import {
  applyMutationsHandler,
  validateMutationsHandler,
} from '../controllers/graphMutationController';

const router = Router();

// All routes require authentication
router.use(authenticateFirebase);

// Apply graphId validation to all routes
router.param('graphId', validateGraphId);
router.param('nodeId', validateNodeId);

// Graph-level operations
router.get('/:graphId', getGraphHandler);
router.put('/:graphId', saveGraphHandler);

// Node operations
router.get('/:graphId/nodes', getNodesHandler); // Get all nodes or filter by type
router.post('/:graphId/nodes/find', findNodesHandler); // Find nodes with predicate
router.get('/:graphId/nodes/:nodeId', getNodeHandler); // Get single node
router.post('/:graphId/nodes', validateCreateNode, createNodeHandler); // Create node
router.put('/:graphId/nodes/:nodeId', updateNodeHandler); // Update node
router.delete('/:graphId/nodes/:nodeId', deleteNodeHandler); // Delete node

// Relationship operations
router.get('/:graphId/relationships', getRelationshipsHandler); // Get all relationships
router.get('/:graphId/nodes/:nodeId/relationships', getNodeRelationshipsHandler); // Get node's relationships
router.post('/:graphId/relationships', validateCreateRelationship, createRelationshipHandler); // Create relationship
router.delete('/:graphId/relationships/:relId', deleteRelationshipHandler); // Delete relationship

// Query operations
router.get('/:graphId/path/:from/:to', findPathHandler); // Find path between nodes
router.post('/:graphId/traverse/:startNodeId', traverseHandler); // Traverse from node
router.post('/:graphId/subgraph', validateExtractSubgraph, extractSubgraphHandler); // Extract subgraph

// Direct mutation operations
router.post('/:graphId/mutations', applyMutationsHandler); // Apply mutations
router.post('/:graphId/mutations/validate', validateMutationsHandler); // Validate mutations

export default router;

