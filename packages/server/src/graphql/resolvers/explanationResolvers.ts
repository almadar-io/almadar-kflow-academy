/**
 * GraphQL Explanation Resolvers
 * 
 * Resolvers for explanation and Q&A operations.
 */

import { GraphMutationService } from '../../services/graphMutationService';
import { KnowledgeGraphAccessLayer } from '../../services/knowledgeGraphAccess/KnowledgeGraphAccessLayer';
import { explain, answerQuestion } from '../../services/graphOperations';
import type {
  GraphQLContext,
  ExplainConceptArgs,
  ExplainConceptResult,
  AnswerQuestionArgs,
  AnswerQuestionResult,
} from '../types';
import {
  getUserId,
  loadGraphForOperation,
  createMutationContext,
  inferLearningGoalFromGraph,
  verifyGraphAccessForResolver,
} from './shared/resolverHelpers';

const mutationService = new GraphMutationService();
const accessLayer = new KnowledgeGraphAccessLayer();

export const explanationResolvers = {
  Mutation: {
    /**
     * Explain concept - minimal input: only targetNodeId
     */
    explainConcept: async (
      _parent: unknown,
      args: ExplainConceptArgs,
      context: GraphQLContext
    ): Promise<ExplainConceptResult> => {
      // Verify graph ownership before write operations
      await verifyGraphAccessForResolver(context, args.graphId, 'write');
      
      const uid = getUserId(context);
      const graph = await loadGraphForOperation(uid, args.graphId);

      // Find target node
      const targetNode = graph.nodes[args.targetNodeId];
      if (!targetNode || targetNode.type !== 'Concept') {
        throw new Error(`Concept node ${args.targetNodeId} not found`);
      }

      // Create mutation context from graph
      const mutationContext = createMutationContext(graph, args.targetNodeId);

      // Infer learning goal from graph
      const learningGoal = inferLearningGoalFromGraph(graph);

      // Execute operation with minimal input
      const result = await explain({
        graph,
        mutationContext,
        targetNodeId: args.targetNodeId,
        learningGoal,
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

    /**
     * Answer question - minimal input: targetNodeId and question
     */
    answerQuestion: async (
      _parent: unknown,
      args: AnswerQuestionArgs,
      context: GraphQLContext
    ): Promise<AnswerQuestionResult> => {
      // Verify graph ownership before write operations
      await verifyGraphAccessForResolver(context, args.graphId, 'write');
      
      const uid = getUserId(context);
      const graph = await loadGraphForOperation(uid, args.graphId);

      // Find target node
      const targetNode = graph.nodes[args.targetNodeId];
      if (!targetNode || targetNode.type !== 'Concept') {
        throw new Error(`Concept node ${args.targetNodeId} not found`);
      }

      // Create mutation context from graph
      const mutationContext = createMutationContext(graph, args.targetNodeId);

      // Execute operation with minimal input (default to ephemeral)
      const result = await answerQuestion({
        graph,
        mutationContext,
        targetNodeId: args.targetNodeId,
        question: args.question,
        storeQA: false, // Default to ephemeral
        uid,
        stream: false,
      });

      // Handle streaming result (not supported in GraphQL yet)
      if ('stream' in result) {
        throw new Error('Streaming not yet supported in GraphQL API');
      }

      // Apply mutations (may be empty if storeQA is false)
      const { graph: updatedGraph, errors } = mutationService.applyMutationBatchSafe(
        graph,
        result.mutations
      );

      // Save graph only if mutations were applied
      if (result.mutations.mutations.length > 0) {
        await accessLayer.saveGraph(uid, updatedGraph);
      }

      return {
        graph: result.mutations.mutations.length > 0 ? updatedGraph : graph,
        mutations: result.mutations,
        content: result.content,
        errors: errors.length > 0 ? errors : [],
      };
    },
  },
};

