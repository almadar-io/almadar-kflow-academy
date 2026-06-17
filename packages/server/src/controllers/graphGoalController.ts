/**
 * Graph Goal Controller
 * 
 * REST API endpoints for goal generation operations.
 */

import type { Request, Response } from 'express';
import { GraphMutationService } from '../services/graphMutationService';
import { KnowledgeGraphAccessLayer } from '../services/knowledgeGraphAccess/KnowledgeGraphAccessLayer';
import { generateGoals } from '../services/graphOperations';
import {
  getUserId,
  loadGraphForOperation,
  createMutationContext,
  verifyGraphAccess,
} from '../utils/controllerHelpers';
import { handleGraphOperationStream } from '../utils/graphOperationStreamHandler';
import { parseGenerateGoalsContent } from '../utils/graphOperationParsers';
import type {
  GenerateGoalsRequest,
  GenerateGoalsResponse,
} from '../types/graphOperations';

const mutationService = new GraphMutationService();
const accessLayer = new KnowledgeGraphAccessLayer();

/**
 * Generate goals handler
 * POST /api/graph-operations/:graphId/generate-goals
 */
export async function generateGoalsHandler(
  req: Request<{ graphId: string }, GenerateGoalsResponse | { error: string; code?: string; graphId?: string }, GenerateGoalsRequest>,
  res: Response<GenerateGoalsResponse | { error: string; code?: string; graphId?: string }>
): Promise<void> {
  try {
    const uid = getUserId(req);
    const { graphId } = req.params;
    const request: GenerateGoalsRequest = req.body;

    // Validate: anchorAnswer is always required
    if (!request.anchorAnswer || typeof request.anchorAnswer !== 'string' || request.anchorAnswer.trim().length === 0) {
      res.status(400).json({ error: 'anchorAnswer is required and must be a non-empty string' });
      return;
    }

    // Validate: either questionAnswers OR manualGoal must be provided
    const hasQuestionAnswers = request.questionAnswers && Array.isArray(request.questionAnswers);
    const hasManualGoal = request.manualGoal && typeof request.manualGoal === 'object' && request.manualGoal.title;
    
    if (!hasQuestionAnswers && !hasManualGoal) {
      res.status(400).json({ error: 'Either questionAnswers or manualGoal must be provided' });
      return;
    }

    // Verify graph ownership before write operations
    await verifyGraphAccess(uid, graphId, 'write');

    // Load graph and capture version for optimistic locking
    const graph = await loadGraphForOperation(uid, graphId);
    const expectedVersion = graph.version;

    // Create mutation context from graph
    const mutationContext = createMutationContext(graph);

    const stream = req.query.stream === 'true' || req.query.stream === '1';

    // Execute operation
    const result = await generateGoals({
      graph,
      mutationContext,
      anchorAnswer: request.anchorAnswer,
      questionAnswers: request.questionAnswers || [],
      manualGoal: request.manualGoal,
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
            const { mutations, parsedContent, seedConceptId } = await parseGenerateGoalsContent(
              fullContent,
              graph,
              mutationContext,
              request.anchorAnswer,
              request.manualGoal
            );

            // Apply mutations
            const { graph: updatedGraph } = mutationService.applyMutationBatchSafe(
              graph,
              mutations
            );

            // Set seedConceptId if it was created
            if (seedConceptId && !updatedGraph.seedConceptId) {
              updatedGraph.seedConceptId = seedConceptId;
            }

            // Save graph with version check (will merge if modified)
            const savedGraph = await accessLayer.saveGraph(uid, updatedGraph, expectedVersion);

            return {
              mutations,
              content: parsedContent,
              graph: savedGraph,
            };
          },
          errorMessage: 'Failed to generate goals',
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
    await accessLayer.saveGraph(uid, updatedGraph, expectedVersion);

    // Return response
    res.json({
      mutations: result.mutations,
      content: result.content,
      graph: updatedGraph,
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
    console.error('Error in generateGoals:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ error: `Failed to generate goals: ${errorMessage}` });
  }
}

