import { KnowledgeGraphAccessLayer } from '@almadar-io/knowledge/server';
import type { LearningGoalNodeProperties, GraphNodeOf } from '@almadar-io/knowledge';
import { createLogger } from '@almadar/logger';

const log = createLogger('kflow:server:services:goalService');
import type {
  LearningGoal,
  GoalQuestionAnswer,
} from '../types/goal';
import { listUserGraphIds } from '../utils/listUserGraphIds';
import { invalidateGraphCaches } from './cacheInvalidation';

export const COMMON_GOAL_TYPES = [
  'certification',
  'skill_mastery',
  'language_level',
  'project_completion',
] as const;

const kgal = new KnowledgeGraphAccessLayer();

// Goals are stored as `LearningGoal` nodes INSIDE their learning-path graph
// (the same model @almadar-io/knowledge reads via `graph.nodeTypes.LearningGoal`).
// There is no separate `goals:${uid}` registry graph.

function toNodeProps(goal: LearningGoal): LearningGoalNodeProperties {
  return {
    id: goal.id,
    name: goal.title,
    description: goal.description,
    type: goal.type,
    target: goal.target,
    estimatedTime: goal.estimatedTime ?? undefined,
    assessedLevel: goal.assessedLevel ?? undefined,
    placementTestId: goal.placementTestId ?? undefined,
    customMetadata: {
      graphId: goal.graphId ?? '',
      milestones: JSON.stringify(goal.milestones ?? []),
      shortTermGoals: JSON.stringify(goal.shortTermGoals ?? []),
      ...(goal.customMetadata ?? {}),
    },
    createdAt: goal.createdAt,
    updatedAt: goal.updatedAt,
  };
}

function fromNode(node: GraphNodeOf<'LearningGoal'>): LearningGoal {
  const p = node.properties;
  let milestones: LearningGoal['milestones'] = [];
  let shortTermGoals: string[] = [];
  if (p.customMetadata?.milestones) {
    try { milestones = JSON.parse(p.customMetadata.milestones as string); } catch { /* empty */ }
  }
  if (p.customMetadata?.shortTermGoals) {
    try { shortTermGoals = JSON.parse(p.customMetadata.shortTermGoals as string); } catch { /* empty */ }
  }

  const { graphId, milestones: _m, shortTermGoals: _s, ...rest } = p.customMetadata ?? {};

  return {
    id: node.id,
    graphId: (graphId as string) ?? '',
    title: p.name,
    description: p.description,
    type: p.type,
    target: p.target ?? '',
    estimatedTime: p.estimatedTime,
    assessedLevel: p.assessedLevel,
    placementTestId: p.placementTestId,
    milestones,
    shortTermGoals,
    customMetadata: rest as Record<string, string | number | boolean | null>,
    createdAt: node.createdAt ?? p.createdAt,
    updatedAt: node.updatedAt ?? p.updatedAt,
  };
}

export async function getGoalsByGraphId(uid: string, graphId: string): Promise<LearningGoal[]> {
  try {
    const nodes = await kgal.getNodesByType(uid, graphId, 'LearningGoal');
    return nodes.map(fromNode);
  } catch {
    // Graph missing/unreadable — no goals to surface.
    return [];
  }
}

export async function getUserGoals(uid: string): Promise<LearningGoal[]> {
  const graphIds = await listUserGraphIds(uid);
  const perGraph = await Promise.all(graphIds.map((id) => getGoalsByGraphId(uid, id)));
  return perGraph.flat();
}

export async function getGoalById(uid: string, goalId: string): Promise<LearningGoal | null> {
  const all = await getUserGoals(uid);
  return all.find((g) => g.id === goalId) ?? null;
}

export async function saveGoal(uid: string, goal: LearningGoal): Promise<LearningGoal> {
  if (!goal.graphId) {
    throw new Error(
      `Cannot save goal ${goal.id}: missing graphId. Goals live as LearningGoal nodes inside their learning-path graph.`
    );
  }
  const graphId = goal.graphId;
  const payload = { ...goal, updatedAt: Date.now() };
  const nodeProps = toNodeProps(payload);

  const existing = await kgal.getNode(uid, graphId, goal.id);
  if (existing) {
    await kgal.updateNode(uid, graphId, goal.id, {
      id: goal.id,
      type: 'LearningGoal',
      properties: nodeProps,
    });
  } else {
    await kgal.createNode(uid, graphId, {
      id: goal.id,
      type: 'LearningGoal',
      properties: nodeProps,
    });
  }

  await invalidateGraphCaches(uid, graphId);
  return payload;
}

export async function updateGoal(
  uid: string,
  goalId: string,
  updates: Partial<Omit<LearningGoal, 'id' | 'createdAt'>>
): Promise<LearningGoal> {
  const existing = await getGoalById(uid, goalId);
  if (!existing) throw new Error(`Goal with ID ${goalId} not found`);
  const updated: LearningGoal = { ...existing, ...updates, updatedAt: Date.now() };
  return saveGoal(uid, updated);
}

export async function deleteGoal(uid: string, goalId: string): Promise<void> {
  const existing = await getGoalById(uid, goalId);
  if (!existing) throw new Error(`Goal with ID ${goalId} not found`);
  if (!existing.graphId) return;
  await kgal.deleteNode(uid, existing.graphId, goalId);
  await invalidateGraphCaches(uid, existing.graphId);
}

export async function markMilestoneCompleted(
  uid: string,
  graphId: string,
  milestoneIndex: number
): Promise<void> {
  try {
    const goals = await getGoalsByGraphId(uid, graphId);
    if (goals.length === 0) return;

    const goal = goals[0];
    if (!goal.milestones || goal.milestones.length === 0) return;
    if (milestoneIndex < 0 || milestoneIndex >= goal.milestones.length) {
      log.warn('Milestone index out of range for goal', { milestoneIndex, goalId: goal.id });
      return;
    }

    const milestone = goal.milestones[milestoneIndex];
    if (milestone.completed) return;

    const updatedMilestones = [...goal.milestones];
    updatedMilestones[milestoneIndex] = { ...milestone, completed: true, completedAt: Date.now() };

    await updateGoal(uid, goal.id, { milestones: updatedMilestones });
    log.debug('Marked milestone as completed for goal', { title: milestone.title, goalId: goal.id });
  } catch (error) {
    log.error('Failed to mark milestone as completed for graph', { milestoneIndex, graphId, error: error instanceof Error ? error.message : String(error) });
  }
}

export const ANCHOR_QUESTION = "What's something you've always wanted to learn?";

export interface CreateGraphWithGoalOptions {
  uid: string;
  anchorAnswer: string;
  questionAnswers: GoalQuestionAnswer[];
  seedConceptName?: string;
  seedConceptDescription?: string;
  difficulty?: 'beginner' | 'intermediate' | 'advanced';
  focus?: string;
  goalFocused?: boolean;
  stream?: boolean;
  manualGoal?: {
    title: string;
    description: string;
    type?: string;
    target?: string;
    estimatedTime?: number;
  };
}

export interface CreateGraphWithGoalResult {
  goal: LearningGoal;
  graphId: string;
  seedConceptId: string;
}
