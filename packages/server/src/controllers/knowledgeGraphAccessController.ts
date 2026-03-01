/**
 * Knowledge Graph Access Controller
 * 
 * REST API endpoints for querying and mutating NodeBasedKnowledgeGraph
 * using the KnowledgeGraphAccessLayer.
 * 
 * Phase 2: REST API Endpoints
 */

import type { Request, Response } from 'express';
import { KnowledgeGraphAccessLayer } from '../services/knowledgeGraphAccess/KnowledgeGraphAccessLayer';
import type {
  GraphNode,
  Relationship as NodeBasedRelationship,
  NodeType,
  RelationshipType,
} from '../types/nodeBasedKnowledgeGraph';
import { createGraphNode, createRelationship } from '../types/nodeBasedKnowledgeGraph';

const accessLayer = new KnowledgeGraphAccessLayer();

/**
 * Get user ID from request
 */
function getUserId(req: Request): string {
  const uid = (req as any).firebaseUser?.uid;
  if (!uid) {
    throw new Error('Unauthorized');
  }
  return uid;
}

/**
 * Get full graph
 * GET /api/knowledge-graphs/:graphId
 */
export async function getGraphHandler(req: Request, res: Response): Promise<void> {
  try {
    const { graphId } = req.params;
    const uid = getUserId(req);

    const graph = await accessLayer.getGraph(uid, graphId);
    res.json(graph);
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    if (error.message.includes('not found')) {
      res.status(404).json({ error: error.message });
      return;
    }
    console.error('Error getting graph:', error);
    res.status(500).json({
      error: 'Failed to get graph',
      message: error.message,
    });
  }
}

/**
 * Save graph
 * PUT /api/knowledge-graphs/:graphId
 */
export async function saveGraphHandler(req: Request, res: Response): Promise<void> {
  try {
    const { graphId } = req.params;
    const uid = getUserId(req);
    const graph = req.body;

    if (!graph || graph.id !== graphId) {
      res.status(400).json({ error: 'Invalid graph data' });
      return;
    }

    // Try to get current graph to capture version for optimistic locking
    // If graph doesn't exist, expectedVersion will be undefined (allows creation)
    let expectedVersion: number | undefined;
    try {
      const currentGraph = await accessLayer.getGraph(uid, graphId);
      expectedVersion = currentGraph?.version;
    } catch (error: any) {
      // Graph doesn't exist yet - this is okay for new graph creation
      // expectedVersion remains undefined, which allows saveNodeBasedKnowledgeGraph to create it
      if (!error.message.includes('not found')) {
        // Re-throw if it's not a "not found" error
        throw error;
      }
      // Otherwise, continue with undefined expectedVersion
    }

    const savedGraph = await accessLayer.saveGraph(uid, graph, expectedVersion);
    res.json({ success: true, graphId, graph: savedGraph });
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    console.error('Error saving graph:', error);
    res.status(500).json({
      error: 'Failed to save graph',
      message: error.message,
    });
  }
}

/**
 * Get all nodes or filter by type
 * GET /api/knowledge-graphs/:graphId/nodes?type=Concept
 */
export async function getNodesHandler(req: Request, res: Response): Promise<void> {
  try {
    const { graphId } = req.params;
    const { type } = req.query || {};
    const uid = getUserId(req);

    let nodes: GraphNode[];
    if (type) {
      nodes = await accessLayer.getNodesByType(uid, graphId, type as NodeType);
    } else {
      // Get all nodes by getting the graph and extracting nodes
      const graph = await accessLayer.getGraph(uid, graphId);
      nodes = Object.values(graph.nodes);
    }

    res.json({ nodes, count: nodes.length });
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    if (error.message.includes('not found')) {
      res.status(404).json({ error: error.message });
      return;
    }
    console.error('Error getting nodes:', error);
    res.status(500).json({
      error: 'Failed to get nodes',
      message: error.message,
    });
  }
}

/**
 * Get single node
 * GET /api/knowledge-graphs/:graphId/nodes/:nodeId
 */
export async function getNodeHandler(req: Request, res: Response): Promise<void> {
  try {
    const { graphId, nodeId } = req.params;
    const uid = getUserId(req);

    const node = await accessLayer.getNode(uid, graphId, nodeId);
    if (!node) {
      res.status(404).json({ error: `Node ${nodeId} not found` });
      return;
    }

    res.json(node);
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    if (error.message.includes('not found')) {
      res.status(404).json({ error: error.message });
      return;
    }
    console.error('Error getting node:', error);
    res.status(500).json({
      error: 'Failed to get node',
      message: error.message,
    });
  }
}

/**
 * Create node
 * POST /api/knowledge-graphs/:graphId/nodes
 */
export async function createNodeHandler(req: Request, res: Response): Promise<void> {
  try {
    const { graphId } = req.params;
    const uid = getUserId(req);
    const { type, properties } = req.body;

    if (!type || !properties) {
      res.status(400).json({ error: 'type and properties are required' });
      return;
    }

    // Generate node ID if not provided
    const nodeId = properties.id || createGraphNode('temp', type as NodeType, properties).id;
    const node = createGraphNode(nodeId, type as NodeType, properties);

    const createdNode = await accessLayer.createNode(uid, graphId, node);
    res.status(201).json(createdNode);
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    if (error.message.includes('already exists')) {
      res.status(409).json({ error: error.message });
      return;
    }
    console.error('Error creating node:', error);
    res.status(500).json({
      error: 'Failed to create node',
      message: error.message,
    });
  }
}

/**
 * Update node
 * PUT /api/knowledge-graphs/:graphId/nodes/:nodeId
 */
export async function updateNodeHandler(req: Request, res: Response): Promise<void> {
  try {
    const { graphId, nodeId } = req.params;
    const uid = getUserId(req);
    const updates = req.body;

    const updatedNode = await accessLayer.updateNode(uid, graphId, nodeId, updates);
    res.json(updatedNode);
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    if (error.message.includes('not found')) {
      res.status(404).json({ error: error.message });
      return;
    }
    console.error('Error updating node:', error);
    res.status(500).json({
      error: 'Failed to update node',
      message: error.message,
    });
  }
}

/**
 * Delete node
 * DELETE /api/knowledge-graphs/:graphId/nodes/:nodeId
 */
export async function deleteNodeHandler(req: Request, res: Response): Promise<void> {
  try {
    const { graphId, nodeId } = req.params;
    const uid = getUserId(req);
    const { cascade } = req.query || {};

    await accessLayer.deleteNode(uid, graphId, nodeId, {
      cascade: cascade === 'true',
    });
    res.json({ success: true, nodeId });
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    if (error.message.includes('not found')) {
      res.status(404).json({ error: error.message });
      return;
    }
    console.error('Error deleting node:', error);
    res.status(500).json({
      error: 'Failed to delete node',
      message: error.message,
    });
  }
}

/**
 * Get relationships
 * GET /api/knowledge-graphs/:graphId/relationships?nodeId=xxx&direction=outgoing&type=hasPrerequisite
 */
export async function getRelationshipsHandler(req: Request, res: Response): Promise<void> {
  try {
    const { graphId } = req.params;
    const { nodeId, direction, type } = req.query || {};
    const uid = getUserId(req);

    let relationships: NodeBasedRelationship[];
    if (type) {
      relationships = await accessLayer.getRelationshipsByType(
        uid,
        graphId,
        type as RelationshipType,
        nodeId as string | undefined
      );
    } else {
      relationships = await accessLayer.getRelationships(
        uid,
        graphId,
        nodeId as string | undefined,
        direction as 'incoming' | 'outgoing' | 'both' | undefined
      );
    }

    res.json({ relationships, count: relationships.length });
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    if (error.message.includes('not found')) {
      res.status(404).json({ error: error.message });
      return;
    }
    console.error('Error getting relationships:', error);
    res.status(500).json({
      error: 'Failed to get relationships',
      message: error.message,
    });
  }
}

/**
 * Get node's relationships
 * GET /api/knowledge-graphs/:graphId/nodes/:nodeId/relationships
 */
export async function getNodeRelationshipsHandler(req: Request, res: Response): Promise<void> {
  try {
    const { graphId, nodeId } = req.params;
    const { direction, type } = req.query || {};
    const uid = getUserId(req);

    let relationships: NodeBasedRelationship[];
    if (type) {
      relationships = await accessLayer.getRelationshipsByType(
        uid,
        graphId,
        type as RelationshipType,
        nodeId
      );
    } else {
      relationships = await accessLayer.getRelationships(
        uid,
        graphId,
        nodeId,
        direction as 'incoming' | 'outgoing' | 'both' | undefined
      );
    }

    res.json({ relationships, count: relationships.length });
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    if (error.message.includes('not found')) {
      res.status(404).json({ error: error.message });
      return;
    }
    console.error('Error getting node relationships:', error);
    res.status(500).json({
      error: 'Failed to get node relationships',
      message: error.message,
    });
  }
}

/**
 * Create relationship
 * POST /api/knowledge-graphs/:graphId/relationships
 */
export async function createRelationshipHandler(req: Request, res: Response): Promise<void> {
  try {
    const { graphId } = req.params;
    const uid = getUserId(req);
    const { source, target, type, direction, strength, metadata } = req.body;

    if (!source || !target || !type) {
      res.status(400).json({ error: 'source, target, and type are required' });
      return;
    }

    const relationship = createRelationship(
      source,
      target,
      type as RelationshipType,
      direction || 'forward',
      strength,
      metadata
    );

    const createdRel = await accessLayer.createRelationship(uid, graphId, relationship);
    res.status(201).json(createdRel);
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    if (error.message.includes('does not exist')) {
      res.status(400).json({ error: error.message });
      return;
    }
    console.error('Error creating relationship:', error);
    res.status(500).json({
      error: 'Failed to create relationship',
      message: error.message,
    });
  }
}

/**
 * Delete relationship
 * DELETE /api/knowledge-graphs/:graphId/relationships/:relId
 */
export async function deleteRelationshipHandler(req: Request, res: Response): Promise<void> {
  try {
    const { graphId, relId } = req.params;
    const uid = getUserId(req);

    await accessLayer.deleteRelationship(uid, graphId, relId);
    res.json({ success: true, relId });
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    if (error.message.includes('not found')) {
      res.status(404).json({ error: error.message });
      return;
    }
    console.error('Error deleting relationship:', error);
    res.status(500).json({
      error: 'Failed to delete relationship',
      message: error.message,
    });
  }
}

/**
 * Find path between nodes
 * GET /api/knowledge-graphs/:graphId/path/:from/:to?maxDepth=5
 */
export async function findPathHandler(req: Request, res: Response): Promise<void> {
  try {
    const { graphId, from, to } = req.params;
    const { maxDepth } = req.query || {};
    const uid = getUserId(req);

    const path = await accessLayer.findPath(
      uid,
      graphId,
      from,
      to,
      maxDepth ? parseInt(maxDepth as string, 10) : undefined
    );

    res.json({ path, length: path.length });
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    if (error.message.includes('not found')) {
      res.status(404).json({ error: error.message });
      return;
    }
    console.error('Error finding path:', error);
    res.status(500).json({
      error: 'Failed to find path',
      message: error.message,
    });
  }
}

/**
 * Traverse graph from a node
 * POST /api/knowledge-graphs/:graphId/traverse/:startNodeId
 */
export async function traverseHandler(req: Request, res: Response): Promise<void> {
  try {
    const { graphId, startNodeId } = req.params;
    const uid = getUserId(req);
    const {
      relationshipTypes,
      direction,
      maxDepth,
      limit,
    } = req.body;

    const result = await accessLayer.traverse(uid, graphId, startNodeId, {
      relationshipTypes,
      direction,
      maxDepth,
      limit,
    });

    res.json(result);
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    if (error.message.includes('not found')) {
      res.status(404).json({ error: error.message });
      return;
    }
    console.error('Error traversing graph:', error);
    res.status(500).json({
      error: 'Failed to traverse graph',
      message: error.message,
    });
  }
}

/**
 * Extract subgraph
 * POST /api/knowledge-graphs/:graphId/subgraph
 */
export async function extractSubgraphHandler(req: Request, res: Response): Promise<void> {
  try {
    const { graphId } = req.params;
    const uid = getUserId(req);
    const { nodeIds, depth } = req.body;

    if (!nodeIds || !Array.isArray(nodeIds) || nodeIds.length === 0) {
      res.status(400).json({ error: 'nodeIds array is required' });
      return;
    }

    const subgraph = await accessLayer.extractSubgraph(uid, graphId, nodeIds, depth);
    res.json(subgraph);
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    if (error.message.includes('not found')) {
      res.status(404).json({ error: error.message });
      return;
    }
    console.error('Error extracting subgraph:', error);
    res.status(500).json({
      error: 'Failed to extract subgraph',
      message: error.message,
    });
  }
}

/**
 * Find nodes with predicate
 * POST /api/knowledge-graphs/:graphId/nodes/find
 */
export async function findNodesHandler(req: Request, res: Response): Promise<void> {
  try {
    const { graphId } = req.params;
    const uid = getUserId(req);
    const { filter } = req.body;

    if (!filter || typeof filter !== 'object') {
      res.status(400).json({ error: 'filter object is required' });
      return;
    }

    // Convert filter object to predicate function
    // For now, support simple property matching
    const predicate = (node: GraphNode) => {
      for (const [key, value] of Object.entries(filter)) {
        if (key === 'type') {
          if (node.type !== value) return false;
        } else if (key.startsWith('properties.')) {
          const propKey = key.replace('properties.', '');
          if (node.properties[propKey] !== value) return false;
        } else {
          // Direct property access
          if ((node as any)[key] !== value) return false;
        }
      }
      return true;
    };

    const nodes = await accessLayer.findNodes(uid, graphId, predicate);
    res.json({ nodes, count: nodes.length });
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    if (error.message.includes('not found')) {
      res.status(404).json({ error: error.message });
      return;
    }
    console.error('Error finding nodes:', error);
    res.status(500).json({
      error: 'Failed to find nodes',
      message: error.message,
    });
  }
}

