/**
 * Graph Query Resolvers
 */

import { KnowledgeGraphAccessLayer, extractLearningPathSummary, extractGraphSummary, getConceptsByLayer, getConceptDetail } from '@almadar-io/knowledge/server';
import { getFirestore } from '@almadar/server';
import type { GraphQLContext } from '../types';
import { getUserId, verifyGraphAccessForResolver } from './shared/resolverHelpers';
import { computeLevelCount } from '../../utils/computeLevelCount';

const accessLayer = new KnowledgeGraphAccessLayer();

async function getAllGraphIds(uid: string): Promise<string[]> {
  const db = getFirestore();
  const snapshot = await db
    .collection('users')
    .doc(uid)
    .collection('knowledgeGraphs')
    .select('id')
    .get();
  return snapshot.docs.map(doc => doc.id);
}

export const queryResolvers = {
  Query: {
    learningPaths: async (
      _parent: Record<string, never>,
      _args: Record<string, never>,
      context: GraphQLContext
    ) => {
      const uid = getUserId(context);
      const graphIds = await getAllGraphIds(uid);
      const settled = await Promise.all(
        graphIds.map(async graphId => {
          try {
            const graph = await accessLayer.getGraph(uid, graphId);
            return {
              ...extractLearningPathSummary(graph),
              levelCount: computeLevelCount(graph),
            };
          } catch {
            return null;
          }
        })
      );
      return settled
        .filter((s): s is NonNullable<typeof s> => s !== null)
        .sort((a, b) => b.updatedAt - a.updatedAt);
    },

    graphSummary: async (
      _parent: Record<string, never>,
      args: { graphId: string },
      context: GraphQLContext
    ) => {
      await verifyGraphAccessForResolver(context, args.graphId, 'read');
      const uid = getUserId(context);
      const graph = await accessLayer.getGraph(uid, args.graphId);
      return extractGraphSummary(graph);
    },

    concepts: async (
      _parent: Record<string, never>,
      args: {
        graphId: string;
        includeRelationships?: boolean;
        groupByLayer?: boolean;
      },
      context: GraphQLContext
    ) => {
      await verifyGraphAccessForResolver(context, args.graphId, 'read');
      const uid = getUserId(context);
      const graph = await accessLayer.getGraph(uid, args.graphId);
      return getConceptsByLayer(graph, {
        includeRelationships: args.includeRelationships ?? true,
        groupByLayer: args.groupByLayer ?? true,
      });
    },

    conceptDetail: async (
      _parent: Record<string, never>,
      args: { graphId: string; conceptId: string },
      context: GraphQLContext
    ) => {
      await verifyGraphAccessForResolver(context, args.graphId, 'read');
      const uid = getUserId(context);
      const graph = await accessLayer.getGraph(uid, args.graphId);
      return getConceptDetail(graph, args.conceptId);
    },
  },
};
