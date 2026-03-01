/**
 * GraphQL Expansion Resolvers
 * 
 * Resolvers for progressive expansion operations.
 */

import { GraphMutationService } from '../../services/graphMutationService';
import { KnowledgeGraphAccessLayer } from '../../services/knowledgeGraphAccess/KnowledgeGraphAccessLayer';
import { progressiveExpandMultipleFromText } from '../../services/graphOperations';
import type {
  GraphQLContext,
  ProgressiveExpandArgs,
  ProgressiveExpandResult,
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

export const expansionResolvers = {
  Mutation: {
    /**
     * Progressive expansion - minimal input: only numConcepts (optional)
     */
    progressiveExpand: async (
      _parent: unknown,
      args: ProgressiveExpandArgs,
      context: GraphQLContext
    ): Promise<ProgressiveExpandResult> => {
      // Verify graph ownership before write operations
      await verifyGraphAccessForResolver(context, args.graphId, 'write');
      
      const uid = getUserId(context);
      const graph = await loadGraphForOperation(uid, args.graphId);

      // Create mutation context from graph
      const mutationContext = createMutationContext(graph);

      // Infer learning goal from graph
      const learningGoal = inferLearningGoalFromGraph(graph);

      // Execute operation with minimal input
      const result = await progressiveExpandMultipleFromText({
        graph,
        mutationContext,
        numConcepts: args.numConcepts || 5,
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
  },
};

