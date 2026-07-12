/**
 * GraphQL Explanation Resolvers
 * 
 * Resolvers for explanation and Q&A operations.
 */

import { GraphMutationService } from '@almadar-io/knowledge/server';
import { KnowledgeGraphAccessLayer } from '@almadar-io/knowledge/server';
import { explain, answerQuestion } from '@almadar-io/knowledge/server';
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
import { listUserGraphIds } from '../../utils/listUserGraphIds';

const mutationService = new GraphMutationService();
const accessLayer = new KnowledgeGraphAccessLayer();

export const explanationResolvers = {
  Mutation: {
    /**
     * Explain concept - minimal input: only targetNodeId
     */
    explainConcept: async (
      _parent: Record<string, never>,
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

      // Cross-graph priors for lesson generation: fetch all user's graphs and let the explain
      // operation perform vector search. The LLM will weave "builds on" references from other
      // paths into the <connect> segment of the generated lesson content.
      let allUserGraphIds: string[] | undefined;
      try {
        allUserGraphIds = await listUserGraphIds(uid);
      } catch {
        /* best effort, no cross priors */
      }

      // Execute operation with minimal input
      const result = await explain({
        graph,
        mutationContext,
        targetNodeId: args.targetNodeId,
        learningGoal,
        uid,
        stream: false,
        allUserGraphIds,
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
      _parent: Record<string, never>,
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

      // Cross-graph for related concepts in answers (symmetric to explain lesson priors).
      let allUserGraphIds: string[] | undefined;
      try {
        allUserGraphIds = await listUserGraphIds(uid);
      } catch {
        /* best effort */
      }

      // Execute operation with minimal input (default to ephemeral)
      const result = await answerQuestion({
        graph,
        mutationContext,
        targetNodeId: args.targetNodeId,
        question: args.question,
        storeQA: false, // Default to ephemeral
        uid,
        stream: false,
        allUserGraphIds,
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

