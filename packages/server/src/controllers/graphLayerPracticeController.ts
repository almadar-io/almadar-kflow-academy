/**
 * Graph Layer Practice Controller
 * 
 * REST API endpoints for layer practice generation operations.
 */

import type { Request, Response } from 'express';
import { GraphMutationService } from '../services/graphMutationService';
import { KnowledgeGraphAccessLayer } from '../services/knowledgeGraphAccess/KnowledgeGraphAccessLayer';
import { generateLayerPractice } from '../services/graphOperations';
import {
  getUserId,
  loadGraphForOperation,
  createMutationContext,
  inferLearningGoalFromGraph,
  inferDifficulty,
  inferFocus,
  verifyGraphAccess,
} from '../utils/controllerHelpers';
import { handleGraphOperationStream } from '../utils/graphOperationStreamHandler';
import { parseGenerateLayerPracticeContent } from '../utils/graphOperationParsers';
import type {
  GenerateLayerPracticeRequest,
  GenerateLayerPracticeResponse,
} from '../types/graphOperations';
import type { GraphNode, NodeBasedKnowledgeGraph } from '../types/nodeBasedKnowledgeGraph';

const mutationService = new GraphMutationService();
const accessLayer = new KnowledgeGraphAccessLayer();

/**
 * Get concepts for a specific layer
 */
function getConceptsForLayer(
  graph: NodeBasedKnowledgeGraph,
  layerNumber: number
): GraphNode[] {
  // Find layer node
  const layerNodes = Object.values(graph.nodes).filter(
    (n): n is GraphNode => n.type === 'Layer' && n.properties.layerNumber === layerNumber
  );

  if (layerNodes.length === 0) {
    return [];
  }

  const layerNode = layerNodes[0];

  // Find concepts that belong to this layer
  const concepts: GraphNode[] = [];
  for (const rel of graph.relationships) {
    if (rel.source === layerNode.id && rel.type === 'containsConcept') {
      const concept = graph.nodes[rel.target];
      if (concept && concept.type === 'Concept') {
        concepts.push(concept);
      }
    }
  }

  return concepts;
}

/**
 * Get layer goal from layer node
 */
function getLayerGoal(
  graph: NodeBasedKnowledgeGraph,
  layerNumber: number
): string {
  const layerNodes = Object.values(graph.nodes).filter(
    (n): n is GraphNode => n.type === 'Layer' && n.properties.layerNumber === layerNumber
  );

  if (layerNodes.length > 0) {
    return layerNodes[0].properties.goal || '';
  }

  return '';
}

/**
 * Generate layer practice handler
 * POST /api/graph-operations/:graphId/generate-layer-practice
 */
export async function generateLayerPracticeHandler(
  req: Request<{ graphId: string }, GenerateLayerPracticeResponse | { error: string; code?: string; graphId?: string }, GenerateLayerPracticeRequest>,
  res: Response<GenerateLayerPracticeResponse | { error: string; code?: string; graphId?: string }>
): Promise<void> {
  try {
    const uid = getUserId(req);
    const { graphId } = req.params;
    const request: GenerateLayerPracticeRequest = req.body;

    if (request.layerNumber === undefined) {
      res.status(400).json({ error: 'layerNumber is required' });
      return;
    }

    // Verify graph ownership before write operations
    await verifyGraphAccess(uid, graphId, 'write');

    // Load graph and capture version for optimistic locking
    const graph = await loadGraphForOperation(uid, graphId);
    const expectedVersion = graph.version;

    // Get concepts for the layer
    const concepts = getConceptsForLayer(graph, request.layerNumber);
    if (concepts.length === 0) {
      res.status(404).json({ error: `No concepts found for layer ${request.layerNumber}` });
      return;
    }

    // Get layer goal (use provided or infer from layer node)
    const layerGoal = request.layerGoal || getLayerGoal(graph, request.layerNumber);

    // Create mutation context from graph
    const mutationContext = createMutationContext(graph);

    // Infer learning goal, difficulty, and focus from graph
    const learningGoal = inferLearningGoalFromGraph(graph);
    const difficulty = inferDifficulty(graph);
    const focus = inferFocus(graph);

    const stream = req.query.stream === 'true' || req.query.stream === '1';

    // Execute operation
    const result = await generateLayerPractice({
      graph,
      mutationContext,
      concepts,
      layerGoal,
      layerNumber: request.layerNumber,
      learningGoal,
      difficulty,
      focus,
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
            const { mutations, parsedContent } = await parseGenerateLayerPracticeContent(
              fullContent,
              graph,
              mutationContext,
              request.layerNumber
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
          errorMessage: 'Failed to generate layer practice',
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
    console.error('Error in generateLayerPractice:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ error: `Failed to generate layer practice: ${errorMessage}` });
  }
}

