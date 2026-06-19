import { KnowledgeGraphAccessLayer } from '@almadar-io/knowledge/server';
import { createEmptyNodeTypeIndex } from '@almadar-io/knowledge';
import type { LearningGoalNodeProperties, GraphNodeOf } from '@almadar-io/knowledge';
import type {
  LearningGoal,
  GoalQuestionAnswer,
} from '../types/goal';

export const COMMON_GOAL_TYPES = [
  'certification',
  'skill_mastery',
  'language_level',
  'project_completion',
] as const;

const kgal = new KnowledgeGraphAccessLayer();

const GOALS_GRAPH = (uid: string) => `goals:${uid}`;

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

async function ensureGoalGraph(uid: string): Promise<string> {
  const graphId = GOALS_GRAPH(uid);
  const exists = await kgal.getNode(uid, graphId, graphId).catch(() => null);
  if (!exists) {
    const now = Date.now();
    const emptyIndex = createEmptyNodeTypeIndex();
    await kgal.saveGraph(uid, {
      id: graphId,
      seedConceptId: graphId,
      createdAt: now,
      updatedAt: now,
      version: 1,
      name: `Goals:${uid}`,
      nodes: {},
      nodeTypes: { ...emptyIndex, Graph: [graphId] },
      relationships: [],
    });
  }
  return graphId;
}

export async function getUserGoals(uid: string): Promise<LearningGoal[]> {
  const graphId = await ensureGoalGraph(uid);
  const nodes = await kgal.getNodesByType(uid, graphId, 'LearningGoal');
  return nodes.map(fromNode);
}

export async function getGoalsByGraphId(uid: string, graphId: string): Promise<LearningGoal[]> {
  const all = await getUserGoals(uid);
  return all.filter((g) => g.graphId === graphId);
}

export async function getGoalById(uid: string, goalId: string): Promise<LearningGoal | null> {
  const graphId = await ensureGoalGraph(uid);
  const node = await kgal.getNode(uid, graphId, goalId);
  if (!node || node.type !== 'LearningGoal') return null;
  return fromNode(node as GraphNodeOf<'LearningGoal'>);
}

export async function saveGoal(uid: string, goal: LearningGoal): Promise<LearningGoal> {
  const graphId = await ensureGoalGraph(uid);
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
  const graphId = await ensureGoalGraph(uid);
  const existing = await getGoalById(uid, goalId);
  if (!existing) throw new Error(`Goal with ID ${goalId} not found`);
  await kgal.deleteNode(uid, graphId, goalId);
}

export async function linkGoalToGraph(uid: string, goalId: string, graphId: string): Promise<LearningGoal> {
  return updateGoal(uid, goalId, { graphId });
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
      console.warn(`Milestone index ${milestoneIndex} out of range for goal ${goal.id}.`);
      return;
    }

    const milestone = goal.milestones[milestoneIndex];
    if (milestone.completed) return;

    const updatedMilestones = [...goal.milestones];
    updatedMilestones[milestoneIndex] = { ...milestone, completed: true, completedAt: Date.now() };

    await updateGoal(uid, goal.id, { milestones: updatedMilestones });
    console.log(`Marked milestone "${milestone.title}" as completed for goal ${goal.id}`);
  } catch (error) {
    console.error(`Failed to mark milestone ${milestoneIndex} as completed for graph ${graphId}:`, error);
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
