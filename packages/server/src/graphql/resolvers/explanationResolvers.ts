/**
 * GraphQL Explanation Resolvers
 *
 * Resolvers for explanation and Q&A operations.
 */

import { createLogger } from '@almadar/logger';
import { GraphMutationService } from '@almadar-io/knowledge/server';

const log = createLogger('kflow:server:graphql:explanationResolvers');
import { KnowledgeGraphAccessLayer } from '@almadar-io/knowledge/server';
import { explain, answerQuestion } from '@almadar-io/knowledge/server';
import type { VectorSearchHit } from '@almadar-io/knowledge/server';
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
      log.debug('[CHROMA-DEBUG][LESSON] explainConcept called', { graphId: args.graphId, targetNodeId: args.targetNodeId });
      // Verify graph ownership before write operations
      await verifyGraphAccessForResolver(context, args.graphId, 'write');
      
      const uid = getUserId(context);
      const graph = await loadGraphForOperation(uid, args.graphId);

      // Find target node
      const targetNode = graph.nodes[args.targetNodeId];
      const targetName = (targetNode?.properties as any)?.name || (targetNode as any)?.name || '??';
      log.debug('[CHROMA-DEBUG][LESSON] targetNode', { name: targetName, type: targetNode?.type, graphId: args.graphId });
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
        log.debug('[CHROMA-DEBUG][LESSON] listUserGraphIds returned', { count: allUserGraphIds?.length || 0, uid, ids: allUserGraphIds?.join(',') });
      } catch (e) {
        log.error('[CHROMA-DEBUG][LESSON] listUserGraphIds failed', { error: (e as any)?.message || String(e) });
        /* best effort, no cross priors */
      }

      // Execute operation with minimal input
      log.debug('[CHROMA-DEBUG][LESSON] calling @almadar explain', { allUserGraphIdsLen: allUserGraphIds?.length });
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
      log.debug('[CHROMA-DEBUG][LESSON] saved graph after explain', { mutationCount: result.mutations?.mutations?.length || 0, errorCount: errors.length });

      // INSTRUMENT + FORCE: try explicit vector registration for any new Lesson/Concept nodes using whatever vector the access has
      try {
        const v = (accessLayer as any).getVectorService?.();
        if (v && typeof v.upsertNodes === 'function') {
          const allNodes = Object.values(updatedGraph.nodes || {});
          const count = await v.upsertNodes(args.graphId, allNodes, uid);
          log.debug('[CHROMA-DEBUG][LESSON] explicit v.upsertNodes after save', { count });
        } else {
          log.debug('[CHROMA-DEBUG][LESSON] no getVectorService or no upsert on accessLayer (old dep or not wired)');
        }
      } catch (e) {
        log.error('[CHROMA-DEBUG][LESSON] explicit upsert attempt error', { error: (e as any)?.message || String(e) });
      }

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

      // Compute related here (op no longer attaches for consistency with stream path).
      let relatedFromOp: Array<{ graphId: string; nodeId: string; name?: string; text?: string }> | undefined;
      if (allUserGraphIds && allUserGraphIds.length > 0) {
        const otherIds = allUserGraphIds.filter(id => id !== args.graphId);
        log.debug('[CHROMA-DEBUG][ANSWER] related cross', { all: allUserGraphIds.length, other: otherIds.length });
        if (otherIds.length > 0) {
          try {
            const targetNode = graph.nodes[args.targetNodeId] as { properties?: { name?: string; description?: string } } | undefined;
            const props = targetNode?.properties || {};
            const query = `${props.name || ''} ${props.description || ''}`.trim().slice(0, 400);
            const hits = await accessLayer.findSimilarNodesCrossGraph(uid, otherIds, query, 3, ['Concept']);
            log.debug('[CHROMA-DEBUG][ANSWER] related hits', { hitCount: hits?.length || 0 });
            relatedFromOp = hits
              .filter((h): h is VectorSearchHit & { name: string } => {
                return !!(h && h.graphId && h.graphId !== args.graphId && h.name);
              })
              .slice(0, 3)
              .map((h) => ({ 
                graphId: h.graphId, nodeId: h.nodeId, name: h.name, text: h.text?.slice(0, 160) 
              }));
          } catch (e) {
            log.error('[CHROMA-DEBUG][ANSWER] findSimilar cross error', { error: (e as any)?.message || String(e) });
          }
        }
      } else {
        log.debug('[CHROMA-DEBUG][ANSWER] no allUserGraphIds for related');
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

      const finalContent = relatedFromOp 
        ? { ...result.content, relatedConcepts: relatedFromOp } 
        : result.content;
      return {
        graph: result.mutations.mutations.length > 0 ? updatedGraph : graph,
        mutations: result.mutations,
        content: finalContent,
        errors: errors.length > 0 ? errors : [],
      };
    },
  },
};

