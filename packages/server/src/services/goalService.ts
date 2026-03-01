import { getFirestore } from '../config/firebaseAdmin';
import { getUserGraphById, upsertUserGraph } from './graphService';
import type {
  LearningGoal,
  GoalQuestionAnswer,
} from '../types/goal';
import type { Concept } from '../types/concept';

/**
 * Common goal types (suggestions, but custom types allowed)
 */
export const COMMON_GOAL_TYPES = [
  'certification',
  'skill_mastery',
  'language_level',
  'project_completion',
] as const;

/**
 * Get learning goals for a user
 */
export async function getUserGoals(uid: string): Promise<LearningGoal[]> {
  const db = getFirestore();
  const goalsRef = db.collection('userLearningGoals').doc(uid).collection('goals');
  
  const snapshot = await goalsRef.get();
  
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
  })) as LearningGoal[];
}

/**
 * Get learning goals for a specific graph
 */
export async function getGoalsByGraphId(
  uid: string,
  graphId: string
): Promise<LearningGoal[]> {
  const db = getFirestore();
  const goalsRef = db.collection('userLearningGoals').doc(uid).collection('goals');
  
  const snapshot = await goalsRef
    .where('graphId', '==', graphId)
    .get();
  
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
  })) as LearningGoal[];
}

/**
 * Get a specific learning goal by ID
 */
export async function getGoalById(
  uid: string,
  goalId: string
): Promise<LearningGoal | null> {
  const db = getFirestore();
  const goalDoc = await db
    .collection('userLearningGoals')
    .doc(uid)
    .collection('goals')
    .doc(goalId)
    .get();
  
  if (!goalDoc.exists) {
    return null;
  }
  
  return {
    id: goalDoc.id,
    ...goalDoc.data(),
  } as LearningGoal;
}

/**
 * Save a learning goal to Firestore
 * If the goal has a graphId, also update the seedConcept to store the goal
 */
export async function saveGoal(
  uid: string,
  goal: LearningGoal
): Promise<LearningGoal> {
  const db = getFirestore();
  const goalRef = db
    .collection('userLearningGoals')
    .doc(uid)
    .collection('goals')
    .doc(goal.id);

  const goalData = {
    ...goal,
    updatedAt: Date.now(),
  };

  await goalRef.set(goalData);
  
  // If goal has a graphId, update the seedConcept to store the learning goal
  if (goal.graphId) {
    try {
      const graph = await getUserGraphById(uid, goal.graphId);
      if (graph && graph.seedConceptId) {
        const seedConcept = graph.concepts?.[graph.seedConceptId];
        if (seedConcept) {
          // Store the overall learning goal (title + description) in the seedConcept
          const learningGoalText = `${goal.title}: ${goal.description}`;
          const updatedSeedConcept: Concept = {
            ...seedConcept,
            goal: learningGoalText,
          };
          
          // Update the graph with the updated seedConcept
          const updatedConcepts = {
            ...graph.concepts,
            [graph.seedConceptId]: updatedSeedConcept,
          };
          
          await upsertUserGraph(uid, {
            ...graph,
            concepts: updatedConcepts,
            updatedAt: Date.now(),
          });
        }
      }
    } catch (error) {
      // Log error but don't fail the goal save operation
      console.error(`Failed to update seedConcept with goal for graph ${goal.graphId}:`, error);
    }
  }
  
  return goal;
}

/**
 * Update a learning goal
 */
export async function updateGoal(
  uid: string,
  goalId: string,
  updates: Partial<Omit<LearningGoal, 'id' | 'createdAt'>>
): Promise<LearningGoal> {
  const db = getFirestore();
  const goalRef = db
    .collection('userLearningGoals')
    .doc(uid)
    .collection('goals')
    .doc(goalId);

  const existingDoc = await goalRef.get();
  if (!existingDoc.exists) {
    throw new Error(`Goal with ID ${goalId} not found`);
  }

  const updatedData = {
    ...updates,
    updatedAt: Date.now(),
  };

  await goalRef.update(updatedData);

  const updatedGoal = {
    id: goalId,
    ...existingDoc.data(),
    ...updatedData,
  } as LearningGoal;

  return updatedGoal;
}

/**
 * Delete a learning goal
 */
export async function deleteGoal(
  uid: string,
  goalId: string
): Promise<void> {
  const db = getFirestore();
  const goalRef = db
    .collection('userLearningGoals')
    .doc(uid)
    .collection('goals')
    .doc(goalId);

  const doc = await goalRef.get();
  if (!doc.exists) {
    throw new Error(`Goal with ID ${goalId} not found`);
  }

  await goalRef.delete();
}

/**
 * Link a goal to a graph (update graphId)
 */
export async function linkGoalToGraph(
  uid: string,
  goalId: string,
  graphId: string
): Promise<LearningGoal> {
  return updateGoal(uid, goalId, { graphId });
}

/**
 * Mark a milestone as completed by index
 * This is called when a new top-level concept is generated (each top-level concept = one milestone)
 */
export async function markMilestoneCompleted(
  uid: string,
  graphId: string,
  milestoneIndex: number
): Promise<void> {
  try {
    // Get goals for this graph
    const goals = await getGoalsByGraphId(uid, graphId);
    
    if (goals.length === 0) {
      // No goal found - skip silently (graph might not have a goal yet)
      return;
    }
    
    // Use the first goal (primary goal)
    const goal = goals[0];
    
    if (!goal.milestones || goal.milestones.length === 0) {
      // No milestones defined - skip silently
      return;
    }
    
    // Check if milestone index is valid
    if (milestoneIndex < 0 || milestoneIndex >= goal.milestones.length) {
      console.warn(`Milestone index ${milestoneIndex} is out of range for goal ${goal.id}. Total milestones: ${goal.milestones.length}`);
      return;
    }
    
    const milestone = goal.milestones[milestoneIndex];
    
    // Skip if already completed (idempotent)
    if (milestone.completed) {
      return;
    }
    
    // Mark milestone as completed
    const updatedMilestones = [...goal.milestones];
    updatedMilestones[milestoneIndex] = {
      ...milestone,
      completed: true,
      completedAt: Date.now(),
    };
    
    // Update the goal
    await updateGoal(uid, goal.id, {
      milestones: updatedMilestones,
    });
    
    console.log(`Marked milestone "${milestone.title}" as completed for goal ${goal.id}`);
  } catch (error) {
    // Log error but don't fail the operation
    console.error(`Failed to mark milestone ${milestoneIndex} as completed for graph ${graphId}:`, error);
  }
}

/**
 * Anchor question configuration
 */
export const ANCHOR_QUESTION = "What's something you've always wanted to learn?";

/**
 * Options for creating a graph with a goal
 */
export interface CreateGraphWithGoalOptions {
  uid: string;
  anchorAnswer: string;
  questionAnswers: GoalQuestionAnswer[];
  seedConceptName?: string; // If not provided, will be derived from anchor answer
  seedConceptDescription?: string;
  difficulty?: 'beginner' | 'intermediate' | 'advanced';
  focus?: string;
  goalFocused?: boolean;
  stream?: boolean; // Whether to stream the goal generation
  // Manual goal entry - if provided, use this goal exactly and only generate milestones
  manualGoal?: {
    title: string;
    description: string;
    type?: string;
    target?: string;
    estimatedTime?: number;
  };
}

/**
 * Result from creating a graph with a goal
 */
export interface CreateGraphWithGoalResult {
  goal: LearningGoal;
  graphId: string;
  seedConceptId: string;
}


