/**
 * Mutation-based Generate Goals Operation
 * 
 * NEW IMPLEMENTATION: Works directly with NodeBasedKnowledgeGraph
 * Does NOT call original operations - designed for new architecture
 * 
 * Location: server/src/services/graphOperations/
 */

import { GraphNode, NodeBasedKnowledgeGraph, generateNodeId, generateRelationshipId } from '../../types/nodeBasedKnowledgeGraph';
import { callLLM } from '../llm';
import { buildGoalGenerationPrompt, type GoalPromptContext } from './promptBuilders/goalPromptBuilder';
import { LearningGoal, Milestone } from '../../types/goal';
import type { GraphMutation, MutationBatch, MutationContext } from '../../types/mutations';

export interface GenerateGoalsOptions {
  graph: NodeBasedKnowledgeGraph;
  mutationContext: MutationContext;
  anchorAnswer: string;
  questionAnswers: Array<{
    questionId: string;
    answer?: string | string[];
    isOther?: boolean;
    otherValue?: string;
    skipped?: boolean;
  }>;
  manualGoal?: {
    title: string;
    description?: string;
    type?: string;
    target?: string;
  };
  stream?: boolean;
  uid?: string;
}

export interface GenerateGoalsResult {
  mutations: MutationBatch;
  content: {
    goal: LearningGoal;
  };
  prompt: {
    system: string;
    user: string;
  };
}


/**
 * Generate goals operation that works with NodeBasedKnowledgeGraph
 */
export async function generateGoals(
  options: GenerateGoalsOptions
): Promise<GenerateGoalsResult | { stream: any; model: string }> {
  const {
    mutationContext,
    anchorAnswer,
    questionAnswers,
    manualGoal,
    stream = false,
    uid
  } = options;

  // Build prompt using prompt builder
  const promptContext: GoalPromptContext = {
    anchorAnswer,
    questionAnswers,
    manualGoal,
    graphId: mutationContext.graphId
  };

  const prompts = buildGoalGenerationPrompt(promptContext);

  // Call LLM
  const response = await callLLM({
    systemPrompt: prompts.system,
    userPrompt: prompts.user,
    uid,
    stream
  });

  // Handle streaming
  if (response.stream && response.raw) {
    return {
      stream: response.raw,
      model: response.model
    };
  }

  // Parse JSON response
  let goalData: any;
  try {
    const jsonMatch = response.content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in response');
    }
    goalData = JSON.parse(jsonMatch[0]);
  } catch (error) {
    throw new Error(`Failed to parse goal JSON: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }

  // Generate mutations
  const mutations: GraphMutation[] = [];

  // 1. Create LearningGoal node
  const goalNodeId = generateNodeId('LearningGoal', {
    graphId: mutationContext.graphId
  });

  // Support both name and title for backward compatibility during transition
  const goalName = goalData.name || goalData.title || 'Learning Goal';

  const goalNode: GraphNode = {
    id: goalNodeId,
    type: 'LearningGoal',
    properties: {
      name: goalName,  // Use name property
      description: goalData.description,
      type: goalData.type,
      target: goalData.target,
      estimatedTime: goalData.estimatedTime || null,
      customMetadata: goalData.customMetadata || {},
      assessedLevel: goalData.assessedLevel,
      createdAt: Date.now(),
      updatedAt: Date.now()
    },
    createdAt: Date.now(),
    updatedAt: Date.now()
  };

  mutations.push({
    type: 'create_node',
    node: goalNode,
    updateIndex: true
  });

  // 2. Create relationship from graph to goal
  // Note: The graph itself is not a node, so we need to handle this differently
  // For now, we'll create a relationship using the graph ID as source
  // This might need to be adjusted based on how the graph node is structured
  mutations.push({
    type: 'create_relationship',
    relationship: {
      id: generateRelationshipId(mutationContext.graphId, goalNodeId, 'hasLearningGoal'),
      source: mutationContext.graphId, // Graph ID as source
      target: goalNodeId,
      type: 'hasLearningGoal',
      direction: 'forward',
      createdAt: Date.now()
    }
  });

  // 2b. Create relationship from seed concept to goal (belongsToGoal)
  // This connects the seed concept to the learning goal
  if (mutationContext.seedConceptId) {
    mutations.push({
      type: 'create_relationship',
      relationship: {
        id: generateRelationshipId(mutationContext.seedConceptId, goalNodeId, 'belongsToGoal'),
        source: mutationContext.seedConceptId,
        target: goalNodeId,
        type: 'belongsToGoal',
        direction: 'forward',
        createdAt: Date.now()
      }
    });
  }

  // 3. Create Milestone nodes with explicit sequence
  const milestones: Milestone[] = [];
  if (goalData.milestones && Array.isArray(goalData.milestones)) {
    for (let index = 0; index < goalData.milestones.length; index++) {
      const milestoneData = goalData.milestones[index];
      const milestoneNodeId = generateNodeId('Milestone', {
        graphId: mutationContext.graphId,
        index
      });

      // Support both name and title for backward compatibility during transition
      const milestoneName = milestoneData.name || milestoneData.title || 'Milestone';

      const milestoneNode: GraphNode = {
        id: milestoneNodeId,
        type: 'Milestone',
        properties: {
          name: milestoneName,  // Use name property
          description: milestoneData.description || '',
          targetDate: milestoneData.targetDate || null,
          completed: milestoneData.completed || false,
          sequence: index,  // Explicit sequence for ordering
        },
        createdAt: Date.now(),
        updatedAt: Date.now()
      };

      mutations.push({
        type: 'create_node',
        node: milestoneNode,
        updateIndex: true
      });

      // Create relationship from goal to milestone with sequence metadata
      mutations.push({
        type: 'create_relationship',
        relationship: {
          id: generateRelationshipId(goalNodeId, milestoneNodeId, 'hasMilestone'),
          source: goalNodeId,
          target: milestoneNodeId,
          type: 'hasMilestone',
          direction: 'forward',
          metadata: {
            sequence: index,  // Store sequence on relationship too
          },
          createdAt: Date.now()
        }
      });

      milestones.push({
        id: milestoneNodeId,
        title: milestoneName,  // Keep title in return type for backward compatibility
        description: milestoneData.description,
        targetDate: milestoneData.targetDate,
        completed: milestoneData.completed || false
      });
    }
  }

  // Create LearningGoal object for return
  const learningGoal: LearningGoal = {
    id: goalNodeId,
    graphId: mutationContext.graphId,
    title: goalName,  // Use name but keep title in return type for backward compatibility
    description: goalData.description,
    type: goalData.type,
    target: goalData.target,
    estimatedTime: goalData.estimatedTime,
    milestones,
    customMetadata: goalData.customMetadata,
    assessedLevel: goalData.assessedLevel,
    createdAt: Date.now(),
    updatedAt: Date.now()
  };

  // Create mutation batch
  const mutationBatch: MutationBatch = {
    mutations,
    metadata: {
      operation: 'generateGoals',
      timestamp: Date.now(),
      model: response.model
    }
  };

  return {
    mutations: mutationBatch,
    content: {
      goal: learningGoal
    },
    prompt: prompts
  };
}

