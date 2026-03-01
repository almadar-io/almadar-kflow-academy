/**
 * GraphQL Layer Practice Resolvers
 * 
 * Resolvers for layer practice generation operations.
 */

import { GraphMutationService } from '../../services/graphMutationService';
import { KnowledgeGraphAccessLayer } from '../../services/knowledgeGraphAccess/KnowledgeGraphAccessLayer';
import { generateLayerPractice } from '../../services/graphOperations';
import type {
  GraphQLContext,
  GenerateLayerPracticeArgs,
  GenerateLayerPracticeResult,
} from '../types';
import {
  getUserId,
  loadGraphForOperation,
  createMutationContext,
  inferLearningGoalFromGraph,
  inferDifficulty,
  inferFocus,
  verifyGraphAccessForResolver,
} from './shared/resolverHelpers';
import type { GraphNode, NodeBasedKnowledgeGraph } from '../../types/nodeBasedKnowledgeGraph';

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

export const layerPracticeResolvers = {
  Mutation: {
    /**
     * Generate layer practice - minimal input: targetNodeId (layer node) and layerNumber
     */
    generateLayerPractice: async (
      _parent: unknown,
      args: GenerateLayerPracticeArgs,
      context: GraphQLContext
    ): Promise<GenerateLayerPracticeResult> => {
      // Verify graph ownership before write operations
      await verifyGraphAccessForResolver(context, args.graphId, 'write');
      
      const uid = getUserId(context);
      const graph = await loadGraphForOperation(uid, args.graphId);

      // Get concepts for the layer
      const concepts = getConceptsForLayer(graph, args.layerNumber);
      if (concepts.length === 0) {
        throw new Error(`No concepts found for layer ${args.layerNumber}`);
      }

      // Get layer goal
      const layerGoal = getLayerGoal(graph, args.layerNumber);

      // Create mutation context from graph
      const mutationContext = createMutationContext(graph);

      // Infer learning goal, difficulty, and focus from graph
      const learningGoal = inferLearningGoalFromGraph(graph);
      const difficulty = inferDifficulty(graph);
      const focus = inferFocus(graph);

      // Execute operation
      const result = await generateLayerPractice({
        graph,
        mutationContext,
        concepts,
        layerGoal,
        layerNumber: args.layerNumber,
        learningGoal,
        difficulty,
        focus,
        uid,
        stream: false,
      });

      // Handle streaming result (not supported in GraphQL yet)
      if ('stream' in result) {
        throw new Error('Streaming not yet supported in GraphQL API');
      }

      // Apply mutations
      const { graph: updatedGraph, errors } = mutationService.applyMutationBatchSafe(
        graph,
        result.mutations
      );

      // Save graph
      await accessLayer.saveGraph(uid, updatedGraph);

      return {
        graph: updatedGraph,
        mutations: result.mutations,
        content: result.content,
        errors: errors.length > 0 ? errors : [],
      };
    },
  },
};

