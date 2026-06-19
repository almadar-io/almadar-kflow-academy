/**
 * Shared GraphQL Resolver Helpers
 * 
 * Common utilities for GraphQL resolvers to avoid code duplication.
 */

import type { NodeBasedKnowledgeGraph, GraphNode } from '../../../types/nodeBasedKnowledgeGraph';
import type { MutationContext } from '../../../types/mutations';
import type { LearningGoal } from '../../../types/goal';
import type { GraphQLContext } from '../../types';
import type { GraphAccessLevel } from '../../../types/graphAuthorization';
import { KnowledgeGraphAccessLayer } from '@almadar-io/knowledge/server';
import { optStr, optNum } from '@almadar-io/knowledge';
import { GraphAuthorizationService } from '../../../services/graphAuthorizationService';

const accessLayer = new KnowledgeGraphAccessLayer();
const authorizationService = new GraphAuthorizationService();

/**
 * Get user ID from GraphQL context (fully typed)
 */
export function getUserId(context: GraphQLContext): string {
  const uid = context.firebaseUser?.uid;
  if (!uid) {
    throw new Error('Unauthorized');
  }
  return uid;
}

/**
 * Load graph for operation
 */
export async function loadGraphForOperation(
  uid: string,
  graphId: string
): Promise<NodeBasedKnowledgeGraph> {
  const graph = await accessLayer.getGraph(uid, graphId);
  if (!graph) {
    throw new Error(`Graph ${graphId} not found`);
  }
  return graph;
}

/**
 * Create mutation context from graph
 */
export function createMutationContext(
  graph: NodeBasedKnowledgeGraph,
  targetNodeId?: string
): MutationContext {
  return {
    graphId: graph.id,
    seedConceptId: graph.seedConceptId,
    targetNodeId,
    existingNodes: graph.nodes,
    existingRelationships: graph.relationships
  };
}

/**
 * Infer learning goal from graph state (fully typed)
 */
export function inferLearningGoalFromGraph(
  graph: NodeBasedKnowledgeGraph
): LearningGoal | undefined {
  const goalNodes = Object.values(graph.nodes).filter(
    (n): n is Extract<GraphNode, { type: 'LearningGoal' }> => n.type === 'LearningGoal'
  );
  if (goalNodes.length === 0) return undefined;
  const p = goalNodes[0].properties;
  const goal: LearningGoal = {
    id: p.id || goalNodes[0].id,
    graphId: graph.id,
    title: p.name || '',
    description: p.description || '',
    type: p.type || 'custom',
    target: p.target ?? '',
    estimatedTime: p.estimatedTime,
    assessedLevel: p.assessedLevel as 'beginner' | 'intermediate' | 'advanced' | undefined,
    placementTestId: p.placementTestId,
    customMetadata: typeof p.customMetadata === 'object' && p.customMetadata !== null && !Array.isArray(p.customMetadata)
      ? p.customMetadata as Record<string, unknown>
      : undefined,
    createdAt: p.createdAt || goalNodes[0].createdAt || Date.now(),
    updatedAt: p.updatedAt || goalNodes[0].updatedAt || Date.now(),
  };
  return goal;
}

/**
 * Infer difficulty from graph or learning goal
 */
export function inferDifficulty(graph: NodeBasedKnowledgeGraph): 'beginner' | 'intermediate' | 'advanced' {
  const learningGoal = inferLearningGoalFromGraph(graph);
  if (learningGoal?.assessedLevel) {
    return learningGoal.assessedLevel as 'beginner' | 'intermediate' | 'advanced';
  }
  if (learningGoal?.customMetadata?.difficulty) {
    return learningGoal.customMetadata.difficulty as 'beginner' | 'intermediate' | 'advanced';
  }
  return graph.difficulty || 'intermediate';
}

/**
 * Infer focus from graph or learning goal
 */
export function inferFocus(graph: NodeBasedKnowledgeGraph): string | undefined {
  const learningGoal = inferLearningGoalFromGraph(graph);
  return learningGoal?.customMetadata?.focus ?? learningGoal?.description ?? graph.focus;
}

/**
 * Verify graph access for GraphQL resolvers
 * 
 * @param context - GraphQL context
 * @param graphId - Graph ID
 * @param operation - Operation type (read, write, delete)
 * @throws AuthorizationError if access is denied
 */
export async function verifyGraphAccessForResolver(
  context: GraphQLContext,
  graphId: string,
  operation: GraphAccessLevel = 'read'
): Promise<void> {
  const uid = getUserId(context);
  await authorizationService.verifyGraphAccess(uid, graphId, operation);
}

