/**
 * GraphQL Goal Resolvers
 * 
 * Resolvers for goal generation operations.
 */

import { GraphMutationService } from '../../services/graphMutationService';
import { KnowledgeGraphAccessLayer } from '../../services/knowledgeGraphAccess/KnowledgeGraphAccessLayer';
import { generateGoals } from '../../services/graphOperations';
import type {
  GraphQLContext,
  GenerateGoalsArgs,
  GenerateGoalsResult,
} from '../types';
import {
  getUserId,
  loadGraphForOperation,
  createMutationContext,
  verifyGraphAccessForResolver,
} from './shared/resolverHelpers';

const mutationService = new GraphMutationService();
const accessLayer = new KnowledgeGraphAccessLayer();

export const goalResolvers = {
  Mutation: {
    /**
     * Generate goals - minimal input: anchorAnswer and questionAnswers
     */
    generateGoals: async (
      _parent: unknown,
      args: GenerateGoalsArgs,
      context: GraphQLContext
    ): Promise<GenerateGoalsResult> => {
      // Verify graph ownership before write operations
      await verifyGraphAccessForResolver(context, args.graphId, 'write');
      
      const uid = getUserId(context);
      const graph = await loadGraphForOperation(uid, args.graphId);

      // Create mutation context from graph
      const mutationContext = createMutationContext(graph);

      // Execute operation with minimal input
      const result = await generateGoals({
        graph,
        mutationContext,
        anchorAnswer: args.anchorAnswer,
        questionAnswers: args.questionAnswers,
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

