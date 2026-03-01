/**
 * GraphQL Custom Operation Resolvers
 * 
 * Resolvers for custom operation (user-prompted modifications).
 */

import { GraphMutationService } from '../../services/graphMutationService';
import { KnowledgeGraphAccessLayer } from '../../services/knowledgeGraphAccess/KnowledgeGraphAccessLayer';
import { customOperation } from '../../services/graphOperations';
import type {
  GraphQLContext,
  CustomOperationArgs,
  CustomOperationResult,
} from '../types';
import {
  getUserId,
  loadGraphForOperation,
  createMutationContext,
  inferLearningGoalFromGraph,
  verifyGraphAccessForResolver,
} from './shared/resolverHelpers';
import type { GraphNode } from '../../types/nodeBasedKnowledgeGraph';

const mutationService = new GraphMutationService();
const accessLayer = new KnowledgeGraphAccessLayer();

export const customOperationResolvers = {
  Mutation: {
    /**
     * Custom operation - user-prompted modifications
     */
    customOperation: async (
      _parent: unknown,
      args: CustomOperationArgs,
      context: GraphQLContext
    ): Promise<CustomOperationResult> => {
      // Verify graph ownership before write operations
      await verifyGraphAccessForResolver(context, args.graphId, 'write');
      
      const uid = getUserId(context);
      const graph = await loadGraphForOperation(uid, args.graphId);

      // Get target nodes
      const targetNodes: GraphNode[] = [];
      for (const nodeId of args.targetNodeIds) {
        const node = graph.nodes[nodeId];
        if (node && node.type === 'Concept') {
          targetNodes.push(node);
        }
      }

      if (targetNodes.length === 0) {
        throw new Error('No valid concept nodes found for custom operation');
      }

      // Create mutation context from graph
      const mutationContext = createMutationContext(graph);

      // Infer learning goal from graph
      const learningGoal = inferLearningGoalFromGraph(graph);

      // Execute operation
      const result = await customOperation({
        graph,
        mutationContext,
        targetNodes,
        userPrompt: args.userPrompt,
        learningGoal,
        details: args.details,
        parentForNewConcepts: args.parentForNewConcepts,
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

