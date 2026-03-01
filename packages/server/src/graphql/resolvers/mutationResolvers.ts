/**
 * GraphQL Mutation Resolvers
 * 
 * Direct mutation resolvers for applying and validating mutations.
 * Part of Phase 3: Mutation API Endpoints
 */

import { GraphMutationService } from '../../services/graphMutationService';
import { KnowledgeGraphAccessLayer } from '../../services/knowledgeGraphAccess/KnowledgeGraphAccessLayer';
import type {
  GraphQLContext,
  ApplyMutationsArgs,
  ValidateMutationsArgs,
  MutationValidationResult
} from '../types';
import type { GraphMutation, MutationError } from '../../types/mutations';
import {
  getUserId,
  loadGraphForOperation,
  verifyGraphAccessForResolver,
} from './shared/resolverHelpers';

const mutationService = new GraphMutationService();
const accessLayer = new KnowledgeGraphAccessLayer();

export const mutationResolvers = {
  Mutation: {
    /**
     * Apply mutations directly to graph
     */
    applyMutations: async (
      _parent: unknown,
      args: ApplyMutationsArgs,
      context: GraphQLContext
    ) => {
      // Verify graph ownership before write operations
      await verifyGraphAccessForResolver(context, args.graphId, 'write');
      
      const uid = getUserId(context);
      const graph = await loadGraphForOperation(uid, args.graphId);

      const mutationBatch = {
        mutations: args.mutations as GraphMutation[],
        metadata: {
          operation: 'applyMutations',
          timestamp: Date.now()
        }
      };

      const { graph: updatedGraph, errors } = mutationService.applyMutationBatchSafe(
        graph,
        mutationBatch
      );

      if (errors.length > 0) {
        throw new Error(`Failed to apply mutations: ${errors.map(e => e.error).join(', ')}`);
      }

      await accessLayer.saveGraph(uid, updatedGraph);
      return updatedGraph;
    },

    /**
     * Validate mutations without applying
     */
    validateMutations: async (
      _parent: unknown,
      args: ValidateMutationsArgs,
      context: GraphQLContext
    ): Promise<MutationValidationResult> => {
      // Verify graph ownership before read operations
      await verifyGraphAccessForResolver(context, args.graphId, 'read');
      
      const uid = getUserId(context);
      const graph = await loadGraphForOperation(uid, args.graphId);

      const errors: MutationError[] = [];
      for (const mutation of args.mutations as GraphMutation[]) {
        const isValid = mutationService.validateMutation(graph, mutation);
        if (!isValid) {
          errors.push({
            mutation,
            error: 'Validation failed'
          });
        }
      }

      return {
        valid: errors.length === 0,
        errors
      };
    }
  }
};

