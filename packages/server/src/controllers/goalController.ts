import { Request, Response } from 'express';
import { generateGoalQuestions } from '../operations/generateGoalQuestions';
import { generateGoal as generateGoalOperation } from '../operations/generateGoal';
import {
  saveGoal,
  updateGoal,
  deleteGoal,
  getUserGoals,
  getGoalsByGraphId,
  getGoalById,
} from '../services/goalService';
import { generateConceptId } from '../utils/uuid';
import { normalizeConcept } from '../utils/validation';
import { upsertUserGraph } from '../services/graphService';
import { handleStreamResponse } from '../utils/streamHandler';
import type {
  GenerateGoalQuestionsOptions,
  GoalQuestionAnswer,
  GenerateGoalResult,
} from '../types/goal';
import type { Concept } from '../types/concept';

/**
 * Generate questions for a learning goal based on anchor answer
 * POST /api/generate-goal-questions
 */
export async function generateGoalQuestionsHandler(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const uid = (req as any).firebaseUser?.uid;
    if (!uid) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { anchorAnswer, goalDescription, goalType, domain } = req.body;

    if (!anchorAnswer || typeof anchorAnswer !== 'string' || anchorAnswer.trim().length === 0) {
      res.status(400).json({ error: 'anchorAnswer is required and must be a non-empty string' });
      return;
    }

    const options: GenerateGoalQuestionsOptions = {
      anchorAnswer: anchorAnswer.trim(),
      goalDescription,
      goalType,
      domain,
      userId: uid,
      uid,
    };

    const result = await generateGoalQuestions(options);

    res.json(result);
  } catch (error) {
    console.error('Error generating goal questions:', error);
    res.status(500).json({
      error: 'Failed to generate goal questions',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

/**
 * Generate/create a learning goal
 * POST /api/learning/goals
 */
export async function createGoalHandler(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const uid = (req as any).firebaseUser?.uid;
    if (!uid) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { anchorAnswer, questionAnswers, graphId, stream = false } = req.body;

    if (!anchorAnswer || typeof anchorAnswer !== 'string' || anchorAnswer.trim().length === 0) {
      res.status(400).json({ error: 'anchorAnswer is required and must be a non-empty string' });
      return;
    }

    if (!Array.isArray(questionAnswers)) {
      res.status(400).json({ error: 'questionAnswers must be an array' });
      return;
    }

    // Validate question answers structure
    const validAnswers: GoalQuestionAnswer[] = questionAnswers.map((qa: any) => ({
      questionId: qa.questionId || '',
      answer: qa.answer,
      isOther: qa.isOther || false,
      otherValue: qa.otherValue,
      skipped: qa.skipped || false,
    }));

    const goalResult = await generateGoalOperation({
      anchorAnswer: anchorAnswer.trim(),
      questionAnswers: validAnswers,
      userId: uid,
      graphId,
      uid,
      stream,
    });

    // Handle streaming response
    if (stream && typeof goalResult === 'object' && 'stream' in goalResult && goalResult.stream) {
      const streamResult = goalResult as { stream: any; model: string };
      
      await handleStreamResponse(streamResult.stream, req, res, {
        onComplete: async (fullContent: string) => {
          try {
            // Parse JSON from streamed content
            let goalData: any;
            try {
              const jsonMatch = fullContent.match(/\{[\s\S]*\}/);
              if (jsonMatch) {
                goalData = JSON.parse(jsonMatch[0]);
              } else {
                goalData = JSON.parse(fullContent);
              }
            } catch (parseError) {
              throw new Error(`Failed to parse streamed JSON: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`);
            }

            // Validate required fields
            if (!goalData.title || !goalData.description || !goalData.type || !goalData.target) {
              throw new Error('LLM response missing required fields: title, description, type, or target');
            }

            // Normalize milestones
            const milestones = (goalData.milestones || []).map((m: any, index: number) => ({
              id: m.id || `m${index + 1}`,
              title: m.title || 'Milestone',
              description: m.description,
              targetDate: m.targetDate || null,
              completed: m.completed || false,
            }));

            // Create goal object
            const goal: any = {
              id: generateConceptId(),
              graphId: graphId || generateConceptId(), // Use provided graphId or generate one
              title: goalData.title,
              description: goalData.description,
              type: goalData.type,
              target: goalData.target,
              estimatedTime: goalData.estimatedTime || null,
              milestones,
              customMetadata: goalData.customMetadata || {},
              createdAt: Date.now(),
              updatedAt: Date.now(),
            };

            // Save goal
            const savedGoal = await saveGoal(uid, goal);

            return {
              goal: savedGoal,
              model: streamResult.model,
            };
          } catch (error) {
            console.error('Error processing streamed goal:', error);
            throw error;
          }
        },
        errorMessage: 'Stream error during goal creation',
      });
      return;
    }

    // Non-streaming response
    const normalResult = goalResult as GenerateGoalResult;
    // If graphId is provided, link the goal to the graph
    if (graphId) {
      const linkedGoal = await saveGoal(uid, {
        ...normalResult.goal,
        graphId,
      });
      res.json({ goal: linkedGoal, model: normalResult.model });
    } else {
      // Save goal without graphId (can be linked later)
      const savedGoal = await saveGoal(uid, normalResult.goal);
      res.json({ goal: savedGoal, model: normalResult.model });
    }
  } catch (error) {
    console.error('Error creating goal:', error);
    res.status(500).json({
      error: 'Failed to create goal',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

/**
 * Create a graph and goal together from form submission
 * POST /api/learning/goals/with-graph
 */
export async function createGraphWithGoalHandler(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const uid = (req as any).firebaseUser?.uid;
    if (!uid) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const {
      anchorAnswer,
      questionAnswers,
      seedConceptName,
      seedConceptDescription,
      difficulty,
      focus,
      goalFocused,
      manualGoal,
      stream = false,
    } = req.body;

    if (!anchorAnswer || typeof anchorAnswer !== 'string' || anchorAnswer.trim().length === 0) {
      res.status(400).json({ error: 'anchorAnswer is required and must be a non-empty string' });
      return;
    }

    if (!Array.isArray(questionAnswers)) {
      res.status(400).json({ error: 'questionAnswers must be an array' });
      return;
    }

    // Validate question answers structure
    const validAnswers: GoalQuestionAnswer[] = questionAnswers.map((qa: any) => ({
      questionId: qa.questionId || '',
      answer: qa.answer,
      isOther: qa.isOther || false,
      otherValue: qa.otherValue,
      skipped: qa.skipped || false,
    }));

    // Step 1: Generate the learning goal (call operation directly)
    const goalResult = await generateGoalOperation({
      anchorAnswer: anchorAnswer.trim(),
      questionAnswers: validAnswers,
      userId: uid,
      uid,
      stream,
      manualGoal, // Pass manual goal if provided
    });

    // Handle streaming response
    if (stream && typeof goalResult === 'object' && goalResult !== null && 'stream' in goalResult && goalResult.stream) {
      const streamResult = goalResult as { stream: any; model?: string };
      
      await handleStreamResponse(streamResult.stream, req, res, {
        onComplete: async (fullContent: string) => {
          try {
            // Parse JSON from streamed content
            let parsedData: any;
            try {
              const jsonMatch = fullContent.match(/\{[\s\S]*\}/);
              if (jsonMatch) {
                parsedData = JSON.parse(jsonMatch[0]);
              } else {
                parsedData = JSON.parse(fullContent);
              }
            } catch (parseError) {
              throw new Error(`Failed to parse streamed JSON: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`);
            }

            let goal: any;
            let milestones: any[];

            // Handle manual goal vs regular goal differently
            if (manualGoal) {
              // For manual goals, the LLM only returns milestones (and optionally type/target)
              // Title and description come from the manual goal input
              milestones = (parsedData.milestones || []).map((m: any, index: number) => ({
                id: m.id || `m${index + 1}`,
                title: m.title || 'Milestone',
                description: m.description,
                targetDate: m.targetDate || null,
                completed: m.completed || false,
              }));

              goal = {
                id: generateConceptId(),
                graphId: '', // Will be set after graph creation
                title: manualGoal.title, // Use exact title from manual entry
                description: manualGoal.description, // Use exact description from manual entry
                type: manualGoal.type || parsedData.type || 'custom',
                target: manualGoal.target || parsedData.target || manualGoal.title,
                estimatedTime: manualGoal.estimatedTime || null,
                milestones,
                shortTermGoals: [],
                customMetadata: {},
                createdAt: Date.now(),
                updatedAt: Date.now(),
              };
            } else {
              // For regular goals, validate required fields
              if (!parsedData.title || !parsedData.description || !parsedData.type || !parsedData.target) {
                throw new Error('LLM response missing required fields: title, description, type, or target');
              }

              // Normalize milestones
              milestones = (parsedData.milestones || []).map((m: any, index: number) => ({
                id: m.id || `m${index + 1}`,
                title: m.title || 'Milestone',
                description: m.description,
                targetDate: m.targetDate || null,
                completed: m.completed || false,
              }));

              // Create goal object
              goal = {
                id: generateConceptId(),
                graphId: '', // Will be set after graph creation
                title: parsedData.title,
                description: parsedData.description,
                type: parsedData.type,
                target: parsedData.target,
                estimatedTime: parsedData.estimatedTime || null,
                milestones,
                customMetadata: parsedData.customMetadata || {},
                createdAt: Date.now(),
                updatedAt: Date.now(),
              };
            }

            // Create seed concept
            const finalSeedConceptDescription = seedConceptDescription || 
              `${goal.title}: ${goal.description}`;
            const learningGoalText = `${goal.title}: ${goal.description}`;
            
            const seedConcept = {
              name: seedConceptName || anchorAnswer.trim(),
              description: finalSeedConceptDescription,
              goal: learningGoalText,
              parents: [],
              children: [],
              isSeed: true,
            };

            // Normalize the seed concept
            const normalizedSeedConcept = normalizeConcept(seedConcept);
            const seedConceptId = normalizedSeedConcept.id || generateConceptId();

            // Create the knowledge graph
            const graphId = generateConceptId();
            const graph = await upsertUserGraph(uid, {
              id: graphId,
              seedConceptId,
              concepts: {
                [seedConceptId]: normalizedSeedConcept,
              },
              goalFocused,
              difficulty,
              focus,
            });

            // Save the goal with graphId
            goal.graphId = graph.id;
            const savedGoal = await saveGoal(uid, goal);

            return {
              goal: savedGoal,
              graphId: graph.id,
              seedConceptId: seedConceptId,
            };
          } catch (error) {
            console.error('Error processing streamed goal with graph:', error);
            throw error;
          }
        },
        errorMessage: 'Stream error during goal and graph creation',
      });
      return;
    }

    // Non-streaming: continue with graph creation
    const normalResult = goalResult as GenerateGoalResult;

    // Step 2: Create seed concept from anchor answer or provided name
    const finalSeedConceptDescription = seedConceptDescription || 
      `${normalResult.goal.title}: ${normalResult.goal.description}`;
    
    // Store the overall learning goal (title + description) in the seedConcept
    const learningGoalText = `${normalResult.goal.title}: ${normalResult.goal.description}`;
    
    const seedConcept: Concept = {
      name: seedConceptName || anchorAnswer.trim(),
      description: finalSeedConceptDescription,
      goal: learningGoalText, // Store overall learning goal in seedConcept
      parents: [],
      children: [],
      isSeed: true,
    };

    // Normalize the seed concept (generates ID, etc.)
    const normalizedSeedConcept = normalizeConcept(seedConcept);
    const seedConceptId = normalizedSeedConcept.id || generateConceptId();

    // Step 3: Create the knowledge graph
    const graphId = generateConceptId();
    const graph = await upsertUserGraph(uid, {
      id: graphId,
      seedConceptId,
      concepts: {
        [seedConceptId]: normalizedSeedConcept,
      },
      goalFocused,
      difficulty,
      focus,
    });

    // Step 4: Save the goal with graphId (goal must exist before we can link it)
    const goalWithGraphId = {
      ...normalResult.goal,
      graphId: graph.id,
    };
    const savedGoal = await saveGoal(uid, goalWithGraphId);

    res.json({
      goal: savedGoal,
      graphId: graph.id,
      seedConceptId: seedConceptId,
    });
  } catch (error) {
    console.error('Error creating graph with goal:', error);
    res.status(500).json({
      error: 'Failed to create graph with goal',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

/**
 * Update a learning goal
 * PUT /api/learning/goals/:goalId
 */
export async function updateGoalHandler(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const uid = (req as any).firebaseUser?.uid;
    if (!uid) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { goalId } = req.params;
    const updates = req.body;

    // Remove fields that shouldn't be updated directly
    const { id, createdAt, ...allowedUpdates } = updates;

    const updatedGoal = await updateGoal(uid, goalId, allowedUpdates);

    res.json(updatedGoal);
  } catch (error) {
    console.error('Error updating goal:', error);
    if (error instanceof Error && error.message.includes('not found')) {
      res.status(404).json({
        error: 'Goal not found',
        message: error.message,
      });
    } else {
      res.status(500).json({
        error: 'Failed to update goal',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
}

/**
 * Delete a learning goal
 * DELETE /api/learning/goals/:goalId
 */
export async function deleteGoalHandler(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const uid = (req as any).firebaseUser?.uid;
    if (!uid) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { goalId } = req.params;

    await deleteGoal(uid, goalId);

    res.json({ message: 'Goal deleted successfully' });
  } catch (error) {
    console.error('Error deleting goal:', error);
    if (error instanceof Error && error.message.includes('not found')) {
      res.status(404).json({
        error: 'Goal not found',
        message: error.message,
      });
    } else {
      res.status(500).json({
        error: 'Failed to delete goal',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
}

/**
 * Get all learning goals for the current user
 * GET /api/learning/goals
 */
export async function getUserGoalsHandler(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const uid = (req as any).firebaseUser?.uid;
    if (!uid) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { graphId } = req.query;

    if (graphId && typeof graphId === 'string') {
      // Get goals for a specific graph
      const goals = await getGoalsByGraphId(uid, graphId);
      res.json({ goals });
    } else {
      // Get all goals for the user
      const goals = await getUserGoals(uid);
      res.json({ goals });
    }
  } catch (error) {
    console.error('Error getting user goals:', error);
    res.status(500).json({
      error: 'Failed to get goals',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

/**
 * Get a specific learning goal by ID
 * GET /api/learning/goals/:goalId
 */
export async function getGoalByIdHandler(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const uid = (req as any).firebaseUser?.uid;
    if (!uid) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { goalId } = req.params;

    const goal = await getGoalById(uid, goalId);

    if (!goal) {
      res.status(404).json({ error: 'Goal not found' });
      return;
    }

    res.json({ goal });
  } catch (error) {
    console.error('Error getting goal:', error);
    res.status(500).json({
      error: 'Failed to get goal',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

