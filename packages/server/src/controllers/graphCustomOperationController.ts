/**
 * Graph Custom Operation Controller
 * 
 * REST API endpoints for custom operation (user-prompted modifications).
 */

import type { Request, Response } from 'express';
import { GraphMutationService } from '../services/graphMutationService';
import { KnowledgeGraphAccessLayer } from '../services/knowledgeGraphAccess/KnowledgeGraphAccessLayer';
import { customOperation } from '../services/graphOperations';
import {
  getUserId,
  loadGraphForOperation,
  createMutationContext,
  inferLearningGoalFromGraph,
  verifyGraphAccess,
} from '../utils/controllerHelpers';
import { handleGraphOperationStream } from '../utils/graphOperationStreamHandler';
import { parseCustomOperationContent } from '../utils/graphOperationParsers';
import type {
  CustomOperationRequest,
  CustomOperationResponse,
} from '../types/graphOperations';
import type { GraphNode } from '../types/nodeBasedKnowledgeGraph';

const mutationService = new GraphMutationService();
const accessLayer = new KnowledgeGraphAccessLayer();

/**
 * Custom operation handler
 * POST /api/graph-operations/:graphId/custom-operation
 */
export async function customOperationHandler(
  req: Request<{ graphId: string }, CustomOperationResponse | { error: string; code?: string; graphId?: string }, CustomOperationRequest>,
  res: Response<CustomOperationResponse | { error: string; code?: string; graphId?: string }>
): Promise<void> {
  try {
    const uid = getUserId(req);
    const { graphId } = req.params;
    const request: CustomOperationRequest = req.body;

    if (!request.targetNodeIds || !Array.isArray(request.targetNodeIds) || request.targetNodeIds.length === 0) {
      res.status(400).json({ error: 'targetNodeIds array is required and must not be empty' });
      return;
    }

    if (!request.userPrompt) {
      res.status(400).json({ error: 'userPrompt is required' });
      return;
    }

    // Verify graph ownership before write operations
    await verifyGraphAccess(uid, graphId, 'write');

    // Load graph and capture version for optimistic locking
    const graph = await loadGraphForOperation(uid, graphId);
    const expectedVersion = graph.version;

    // Get target nodes
    const targetNodes: GraphNode[] = [];
    for (const nodeId of request.targetNodeIds) {
      const node = graph.nodes[nodeId];
      if (node && node.type === 'Concept') {
        targetNodes.push(node);
      }
    }

    if (targetNodes.length === 0) {
      res.status(404).json({ error: 'No valid concept nodes found for custom operation' });
      return;
    }

    // Create mutation context from graph
    const mutationContext = createMutationContext(graph);

    // Infer learning goal from graph
    const learningGoal = inferLearningGoalFromGraph(graph);

    const stream = req.query.stream === 'true' || req.query.stream === '1';

    // Execute operation
    const result = await customOperation({
      graph,
      mutationContext,
      targetNodes,
      userPrompt: request.userPrompt,
      learningGoal,
      uid,
      stream,
    });

    // Handle streaming result
    if ('stream' in result) {
      await handleGraphOperationStream(
        result.stream,
        req,
        res,
        {
          onComplete: async (fullContent: string) => {
            // Parse content and generate mutations
            const { mutations, parsedContent } = await parseCustomOperationContent(
              fullContent,
              graph,
              mutationContext,
              targetNodes
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
          errorMessage: 'Failed to execute custom operation',
        }
      );
      return;
    }

    // Apply mutations
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
    if (error instanceof Error && error.message === 'Unauthorized') {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    console.error('Error in customOperation:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ error: `Failed to execute custom operation: ${errorMessage}` });
  }
}

