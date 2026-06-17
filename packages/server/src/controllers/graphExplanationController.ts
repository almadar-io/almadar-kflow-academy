/**
 * Graph Explanation Controller
 * 
 * REST API endpoints for explanation and Q&A operations.
 */

import type { Request, Response } from 'express';
import { GraphMutationService } from '../services/graphMutationService';
import { KnowledgeGraphAccessLayer } from '../services/knowledgeGraphAccess/KnowledgeGraphAccessLayer';
import { explain, answerQuestion } from '../services/graphOperations';
import {
  getUserId,
  loadGraphForOperation,
  createMutationContext,
  inferLearningGoalFromGraph,
  verifyGraphAccess,
} from '../utils/controllerHelpers';
import { handleGraphOperationStream } from '../utils/graphOperationStreamHandler';
import { parseExplainContent, parseAnswerQuestionContent } from '../utils/graphOperationParsers';
import type {
  ExplainConceptRequest,
  ExplainConceptResponse,
  AnswerQuestionRequest,
  AnswerQuestionResponse,
} from '../types/graphOperations';

const mutationService = new GraphMutationService();
const accessLayer = new KnowledgeGraphAccessLayer();

/**
 * Explain concept handler
 * POST /api/graph-operations/:graphId/explain
 */
export async function explainConceptHandler(
  req: Request<{ graphId: string }, ExplainConceptResponse | { error: string; code?: string; graphId?: string }, ExplainConceptRequest>,
  res: Response<ExplainConceptResponse | { error: string; code?: string; graphId?: string }>
): Promise<void> {
  try {
    const uid = getUserId(req);
    const { graphId } = req.params;
    const request: ExplainConceptRequest = req.body;

    if (!request.targetNodeId) {
      res.status(400).json({ error: 'targetNodeId is required' });
      return;
    }

    // Verify graph ownership before write operations
    await verifyGraphAccess(uid, graphId, 'write');

    // Load graph and capture version for optimistic locking
    const graph = await loadGraphForOperation(uid, graphId);
    const expectedVersion = graph.version;

    // Find target node
    const targetNode = graph.nodes[request.targetNodeId];
    if (!targetNode || targetNode.type !== 'Concept') {
      res.status(404).json({ error: `Concept node ${request.targetNodeId} not found` });
      return;
    }

    // Create mutation context from graph
    const mutationContext = createMutationContext(graph, request.targetNodeId);

    // Infer learning goal from graph
    const learningGoal = inferLearningGoalFromGraph(graph);

    const stream = req.query.stream === 'true' || req.query.stream === '1';

    // Execute operation
    const result = await explain({
      graph,
      mutationContext,
      targetNodeId: request.targetNodeId,
      learningGoal,
      simple: request.simple ?? false, // Default to false to include learning science tags
      minimal: request.minimal ?? false, // Default to false to include learning science tags
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
            const { mutations, parsedContent } = await parseExplainContent(
              fullContent,
              graph,
              mutationContext,
              request.targetNodeId
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
          errorMessage: 'Failed to explain concept',
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
    console.error('Error in explainConcept:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ error: `Failed to explain concept: ${errorMessage}` });
  }
}

/**
 * Answer question handler
 * POST /api/graph-operations/:graphId/answer-question
 */
export async function answerQuestionHandler(
  req: Request<{ graphId: string }, AnswerQuestionResponse | { error: string; code?: string; graphId?: string }, AnswerQuestionRequest>,
  res: Response<AnswerQuestionResponse | { error: string; code?: string; graphId?: string }>
): Promise<void> {
  try {
    const uid = getUserId(req);
    const { graphId } = req.params;
    const request: AnswerQuestionRequest = req.body;

    if (!request.targetNodeId || !request.question) {
      res.status(400).json({ error: 'targetNodeId and question are required' });
      return;
    }

    // Verify graph ownership before write operations
    await verifyGraphAccess(uid, graphId, 'write');

    // Load graph and capture version for optimistic locking
    const graph = await loadGraphForOperation(uid, graphId);
    const expectedVersion = graph.version;

    // Find target node
    const targetNode = graph.nodes[request.targetNodeId];
    if (!targetNode || targetNode.type !== 'Concept') {
      res.status(404).json({ error: `Concept node ${request.targetNodeId} not found` });
      return;
    }

    // Create mutation context from graph
    const mutationContext = createMutationContext(graph, request.targetNodeId);

    const stream = req.query.stream === 'true' || req.query.stream === '1';
    const storeQA = false; // Default to ephemeral

    // Execute operation
    const result = await answerQuestion({
      graph,
      mutationContext,
      targetNodeId: request.targetNodeId,
      question: request.question,
      storeQA,
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
            // Parse content (ephemeral - no mutations by default)
            const { mutations, parsedContent } = await parseAnswerQuestionContent(
              fullContent,
              storeQA
            );

            // Apply mutations (may be empty if storeQA is false)
            const { graph: updatedGraph } = mutationService.applyMutationBatchSafe(
              graph,
              mutations
            );

            // Save graph only if mutations were applied
            let savedGraph = graph;
            if (mutations.mutations.length > 0) {
              savedGraph = await accessLayer.saveGraph(uid, updatedGraph, expectedVersion);
            }

            return {
              mutations,
              content: parsedContent,
              graph: savedGraph,
            };
          },
          errorMessage: 'Failed to answer question',
        }
      );
      return;
    }

    // Apply mutations (may be empty if storeQA is false)
    const { graph: updatedGraph, errors } = mutationService.applyMutationBatchSafe(
      graph,
      result.mutations
    );

    // Save graph only if mutations were applied
    let savedGraph = graph;
    if (result.mutations.mutations.length > 0) {
      savedGraph = await accessLayer.saveGraph(uid, updatedGraph, expectedVersion);
    }

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
    console.error('Error in answerQuestion:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ error: `Failed to answer question: ${errorMessage}` });
  }
}

