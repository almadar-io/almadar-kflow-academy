/**
 * Controller Helper Utilities
 * 
 * Shared utilities for REST controllers to avoid code duplication.
 */

import type { Request } from 'express';
import type { NodeBasedKnowledgeGraph, LearningGoalNodeProperties, MilestoneNodeProperties } from '../types/nodeBasedKnowledgeGraph';
import type { MutationContext } from '../types/mutations';
import type { LearningGoal, Milestone } from '../types/goal';
import type { GraphAccessLevel } from '../types/graphAuthorization';
import { KnowledgeGraphAccessLayer } from '@almadar-io/knowledge/server';
import { GraphAuthorizationService } from '../services/graphAuthorizationService';
import { getNodesByType, getMilestonesForGoal } from './nodeBasedGraphQueries';

const accessLayer = new KnowledgeGraphAccessLayer();
const authorizationService = new GraphAuthorizationService();

/**
 * Get user ID from authenticated request
 */
export function getUserId(req: Request): string {
  const uid = req.firebaseUser?.uid;
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
 * Infer learning goal from graph state
 * 
 * Reconstructs the full LearningGoal including milestones from separate Milestone nodes.
 * In the node-based structure, milestones are stored as separate nodes connected via
 * 'hasMilestone' relationships.
 */
export function inferLearningGoalFromGraph(
  graph: NodeBasedKnowledgeGraph
): LearningGoal | undefined {
  const goalNodes = getNodesByType(graph, 'LearningGoal');
  
  if (goalNodes.length === 0) {
    return undefined;
  }
  
  const goalNode = goalNodes[0];
  const goalProps = goalNode.properties as unknown as LearningGoalNodeProperties & {
    title?: string;
    estimatedTime?: number;
    customMetadata?: Record<string, unknown>;
    assessedLevel?: string;
    placementTestId?: string;
  };

  // Get milestone nodes connected to this goal
  const milestoneNodes = getMilestonesForGoal(graph, goalNode.id);

  // Convert milestone nodes to Milestone objects
  const milestones: Milestone[] = milestoneNodes.map(node => {
    const mp = node.properties as unknown as MilestoneNodeProperties & { title?: string; completedAt?: number };
    return {
      id: mp.id || node.id,
      title: mp.name || mp.title || '',
      description: mp.description,
      targetDate: mp.targetDate,
      completed: mp.completed || false,
      completedAt: mp.completedAt,
    };
  });

  // Reconstruct the full LearningGoal with milestones
  return {
    id: goalProps.id || goalNode.id,
    graphId: graph.id,
    title: goalProps.name || goalProps.title || '',
    description: goalProps.description || '',
    type: goalProps.type || 'skill_mastery',
    target: goalProps.target || '',
    estimatedTime: goalProps.estimatedTime,
    milestones: milestones.length > 0 ? milestones : undefined,
    customMetadata: goalProps.customMetadata,
    assessedLevel: goalProps.assessedLevel,
    placementTestId: goalProps.placementTestId,
    createdAt: goalNode.createdAt || Date.now(),
    updatedAt: goalNode.updatedAt || Date.now(),
  };
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
 * Verify graph access for operation
 * 
 * @param uid - User ID
 * @param graphId - Graph ID
 * @param operation - Operation type (read, write, delete)
 * @throws AuthorizationError if access is denied
 */
export async function verifyGraphAccess(
  uid: string,
  graphId: string,
  operation: GraphAccessLevel = 'read'
): Promise<void> {
  await authorizationService.verifyGraphAccess(uid, graphId, operation);
}

