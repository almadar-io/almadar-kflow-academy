/**
 * Graph Query Resolvers
 * 
 * GraphQL query resolvers for optimized graph queries that return
 * pre-formatted, display-ready data for Mentor pages.
 */

import { GraphQueryService } from '../../services/graphQueryService';
import type { GraphQLContext } from '../types';
import { getUserId, verifyGraphAccessForResolver } from './shared/resolverHelpers';

const queryService = new GraphQueryService();

export const queryResolvers = {
  Query: {
    /**
     * Get all learning paths summary
     */
    learningPaths: async (
      _parent: unknown,
      _args: unknown,
      context: GraphQLContext
    ) => {
      const uid = getUserId(context);
      return queryService.getLearningPathsSummary(uid);
    },

    /**
     * Get graph summary
     */
    graphSummary: async (
      _parent: unknown,
      args: { graphId: string },
      context: GraphQLContext
    ) => {
      // Verify graph ownership before read operations
      await verifyGraphAccessForResolver(context, args.graphId, 'read');
      
      const uid = getUserId(context);
      return queryService.getGraphSummary(uid, args.graphId);
    },

    /**
     * Get concepts by layer
     */
    concepts: async (
      _parent: unknown,
      args: {
        graphId: string;
        includeRelationships?: boolean;
        groupByLayer?: boolean;
      },
      context: GraphQLContext
    ) => {
      // Verify graph ownership before read operations
      await verifyGraphAccessForResolver(context, args.graphId, 'read');
      
      const uid = getUserId(context);
      return queryService.getConceptsByLayer(uid, args.graphId, {
        includeRelationships: args.includeRelationships ?? true,
        groupByLayer: args.groupByLayer ?? true,
      });
    },

    /**
     * Get concept detail
     */
    conceptDetail: async (
      _parent: unknown,
      args: { graphId: string; conceptId: string },
      context: GraphQLContext
    ) => {
      // Verify graph ownership before read operations
      await verifyGraphAccessForResolver(context, args.graphId, 'read');
      
      const uid = getUserId(context);
      return queryService.getConceptDetail(uid, args.graphId, args.conceptId);
    },
  },
};

