/**
 * Graph Mutation Controller
 * 
 * REST API endpoints for directly applying mutations to NodeBasedKnowledgeGraph.
 * Low-level mutation API for programmatic graph modifications.
 * 
 * Location: server/src/controllers/
 */

import type { Request, Response } from 'express';
import { GraphMutationService } from '../services/graphMutationService';
import { KnowledgeGraphAccessLayer } from '../services/knowledgeGraphAccess/KnowledgeGraphAccessLayer';
import { GraphAuthorizationService } from '../services/graphAuthorizationService';
import type { MutationBatch, MutationError } from '../types/mutations';
import type { NodeBasedKnowledgeGraph } from '../types/nodeBasedKnowledgeGraph';

const mutationService = new GraphMutationService();
const accessLayer = new KnowledgeGraphAccessLayer();
const authorizationService = new GraphAuthorizationService();

/**
 * Get user ID from authenticated request
 */
function getUserId(req: Request): string {
  const uid = (req as any).firebaseUser?.uid;
  if (!uid) {
    throw new Error('Unauthorized');
  }
  return uid;
}

/**
 * Error response type
 */
interface ErrorResponse {
  error: string;
  details?: string;
  code?: string;
  graphId?: string;
}

/**
 * Apply mutations handler
 * POST /api/knowledge-graphs-access/:graphId/mutations
 */
export async function applyMutationsHandler(
  req: Request<{ graphId: string }, NodeBasedKnowledgeGraph | ErrorResponse, { mutations: MutationBatch }>,
  res: Response<NodeBasedKnowledgeGraph | ErrorResponse>
): Promise<void> {
  try {
    const uid = getUserId(req);
    const { graphId } = req.params;
    const { mutations } = req.body;

    if (!mutations || !mutations.mutations || !Array.isArray(mutations.mutations)) {
      res.status(400).json({ error: 'Invalid mutations: mutations array is required' });
      return;
    }

    // Verify graph ownership before write operations
    await authorizationService.verifyGraphAccess(uid, graphId, 'write');

    // Load graph and capture version for optimistic locking
    const graph = await accessLayer.getGraph(uid, graphId);
    if (!graph) {
      res.status(404).json({ error: `Graph ${graphId} not found` });
      return;
    }
    const expectedVersion = graph.version;

    // Apply mutations with error handling
    const { graph: updatedGraph } = mutationService.applyMutationBatchSafe(
      graph,
      mutations
    );

    // Save updated graph with version check (will merge if modified)
    const savedGraph = await accessLayer.saveGraph(uid, updatedGraph, expectedVersion);

    // Return updated graph (even if there were errors - client can check errors in response)
    res.json(savedGraph);
  } catch (error: any) {
    // Handle authorization errors
    if (error.name === 'AuthorizationError') {
      const statusCode = error.code === 'UNAUTHORIZED' ? 401 : error.code === 'NOT_FOUND' ? 404 : 403;
      res.status(statusCode).json({
        error: error.message,
        code: error.code,
        graphId: error.graphId,
      });
      return;
    }
    if (error.message === 'Unauthorized') {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    console.error('Error applying mutations:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({
      error: 'Failed to apply mutations',
      details: errorMessage
    });
  }
}

/**
 * Validate mutations handler
 * POST /api/knowledge-graphs-access/:graphId/mutations/validate
 */
export async function validateMutationsHandler(
  req: Request<{ graphId: string }, { valid: boolean; errors: MutationError[] } | ErrorResponse, { mutations: MutationBatch }>,
  res: Response<{ valid: boolean; errors: MutationError[] } | ErrorResponse>
): Promise<void> {
  try {
    const uid = getUserId(req);
    const { graphId } = req.params;
    const { mutations } = req.body;

    if (!mutations || !mutations.mutations || !Array.isArray(mutations.mutations)) {
      res.status(400).json({ error: 'Invalid mutations: mutations array is required' });
      return;
    }

    // Verify graph ownership before read operations
    await authorizationService.verifyGraphAccess(uid, graphId, 'read');

    // Load graph
    const graph = await accessLayer.getGraph(uid, graphId);
    if (!graph) {
      res.status(404).json({ error: `Graph ${graphId} not found` });
      return;
    }

    // Validate each mutation
    const errors: MutationError[] = [];
    for (const mutation of mutations.mutations) {
      const isValid = mutationService.validateMutation(graph, mutation);
      if (!isValid) {
        errors.push({
          mutation,
          error: 'Validation failed'
        });
      }
    }

    res.json({
      valid: errors.length === 0,
      errors
    });
  } catch (error: any) {
    // Handle authorization errors
    if (error.name === 'AuthorizationError') {
      const statusCode = error.code === 'UNAUTHORIZED' ? 401 : error.code === 'NOT_FOUND' ? 404 : 403;
      res.status(statusCode).json({
        error: error.message,
        code: error.code,
        graphId: error.graphId,
      });
      return;
    }
    if (error.message === 'Unauthorized') {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    console.error('Error validating mutations:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({
      error: 'Failed to validate mutations',
      details: errorMessage
    });
  }
}

