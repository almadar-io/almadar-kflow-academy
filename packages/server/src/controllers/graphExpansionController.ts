/**
 * Graph Expansion Controller
 * 
 * REST API endpoints for progressive expansion operations.
 */

import type { Request, Response } from 'express';
import { GraphMutationService } from '../services/graphMutationService';
import { KnowledgeGraphAccessLayer } from '../services/knowledgeGraphAccess/KnowledgeGraphAccessLayer';
import { progressiveExpandMultipleFromText } from '../services/graphOperations';
import {
  getUserId,
  loadGraphForOperation,
  createMutationContext,
  inferLearningGoalFromGraph,
} from '../utils/controllerHelpers';
import { handleGraphOperationStream } from '../utils/graphOperationStreamHandler';
import { parseProgressiveExpandContent } from '../utils/graphOperationParsers';
import { GraphAuthorizationService } from '../services/graphAuthorizationService';
import type { ProgressiveExpandRequest, ProgressiveExpandResponse } from '../types/graphOperations';

const mutationService = new GraphMutationService();
const accessLayer = new KnowledgeGraphAccessLayer();
const authorizationService = new GraphAuthorizationService();

/**
 * Progressive expansion handler
 * POST /api/graph-operations/:graphId/expand?stream=true
 */
export async function progressiveExpandHandler(
  req: Request<{ graphId: string }, ProgressiveExpandResponse | { error: string; code?: string; graphId?: string }, ProgressiveExpandRequest>,
  res: Response<ProgressiveExpandResponse | { error: string; code?: string; graphId?: string }>
): Promise<void> {
  try {
    const uid = getUserId(req);
    const { graphId } = req.params;
    const request: ProgressiveExpandRequest = req.body || {};
    const stream = req.query.stream === 'true' || req.query.stream === '1';

    // Verify graph ownership before write operations
    await authorizationService.verifyGraphAccess(uid, graphId, 'write');

    // Load graph and capture version for optimistic locking
    const graph = await loadGraphForOperation(uid, graphId);
    const expectedVersion = graph.version;

    // Create mutation context from graph
    const mutationContext = createMutationContext(graph);

    // Infer learning goal from graph
    const learningGoal = inferLearningGoalFromGraph(graph);

    // Execute operation
    const result = await progressiveExpandMultipleFromText({
      graph,
      mutationContext,
      numConcepts: request.numConcepts || 5,
      learningGoal,
      uid,
      stream,
    });

    // Handle streaming result
    if ('stream' in result) {
      // Stream content chunks and generate mutations after completion
      await handleGraphOperationStream(
        result.stream,
        req,
        res,
        {
          onComplete: async (fullContent: string) => {
            // Parse content and generate mutations
            const { mutations, parsedContent } = await parseProgressiveExpandContent(
              fullContent,
              graph,
              mutationContext,
              learningGoal,
              request.numConcepts || 5
            );

            // Apply mutations
            const { graph: updatedGraph } = mutationService.applyMutationBatchSafe(
              graph,
              mutations
            );

            // Save graph with version check (will merge if modified)
            const savedGraph = await accessLayer.saveGraph(uid, updatedGraph, expectedVersion);

            return {
              mutations,
              content: parsedContent,
              graph: savedGraph,
            };
          },
          errorMessage: 'Failed to expand graph',
        }
      );
      return;
    }

    // Non-streaming: Apply mutations
    const { graph: updatedGraph, errors } = mutationService.applyMutationBatchSafe(
      graph,
      result.mutations
    );

    // Save graph with version check (will merge if modified)
    const savedGraph = await accessLayer.saveGraph(uid, updatedGraph, expectedVersion);

    // Return response
    res.json({
      mutations: result.mutations,
      content: result.content,
      graph: savedGraph,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    // Handle authorization errors
    if (error && typeof error === 'object' && 'name' in error && error.name === 'AuthorizationError') {
      const authError = error as any;
      const statusCode = authError.code === 'UNAUTHORIZED' ? 401 : authError.code === 'NOT_FOUND' ? 404 : 403;
      res.status(statusCode).json({
        error: authError.message,
        code: authError.code,
        graphId: authError.graphId,
      });
      return;
    }
    if (error instanceof Error && error.message === 'Unauthorized') {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    console.error('Error in progressiveExpand:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ error: `Failed to expand graph: ${errorMessage}` });
  }
}

