import { Request, Response } from 'express';
import { createLogger } from '@almadar/logger';
import { singleParam, singleQueryParam } from '../utils/httpParams';
import { generateGoalQuestions } from '../operations/generateGoalQuestions';

const log = createLogger('kflow:server:controllers:goalController');
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
import { KnowledgeGraphAccessLayer } from '@almadar-io/knowledge/server';
import { invalidateLearningPaths, invalidateJumpBackIn } from '../services/cacheInvalidation';
import { createGraphNode, createRelationship, createEmptyNodeTypeIndex } from '../types/nodeBasedKnowledgeGraph';
import type { NodeBasedKnowledgeGraph } from '../types/nodeBasedKnowledgeGraph';
import { setupSSE, sendSSEEvent, sendSSEDone, closeSSE } from '@almadar/server';
type StreamChunk = { choices?: Array<{ delta?: { content?: string } }>; content?: string };

async function streamToSSE<T extends object>(
  stream: AsyncIterable<StreamChunk>,
  req: import('express').Request,
  res: import('express').Response,
  options: {
    onComplete?: (fullContent: string) => T | Promise<T> | undefined;
    errorMessage?: string;
  }
): Promise<string> {
  const { onComplete, errorMessage = 'Stream error' } = options;
  setupSSE(res);
  let fullContent = '';
  let clientDisconnected = false;
  const cleanup = () => { clientDisconnected = true; if (!res.writableEnded) res.end(); };
  req.on('close', cleanup);
  req.on('aborted', cleanup);
  try {
    for await (const chunk of stream) {
      if (clientDisconnected) break;
      const content = chunk.choices?.[0]?.delta?.content ?? chunk.content ?? '';
      if (content) {
        fullContent += content;
        if (!clientDisconnected && !res.writableEnded) {
          try { sendSSEEvent(res, { type: 'message', data: { content }, timestamp: Date.now() }); }
          catch { clientDisconnected = true; break; }
        }
      }
    }
    if (!clientDisconnected && !res.writableEnded) {
      const additionalData = onComplete ? await onComplete(fullContent) : undefined;
      sendSSEEvent(res, { type: 'complete', data: { content: '', ...additionalData }, timestamp: Date.now() });
      sendSSEDone(res);
    }
  } catch (streamError) {
    if (!clientDisconnected && !res.writableEnded) {
      try { sendSSEEvent(res, { type: 'error', data: { error: errorMessage }, timestamp: Date.now() }); }
      catch { /* client gone */ }
    }
  } finally {
    req.removeListener('close', cleanup);
    req.removeListener('aborted', cleanup);
    if (!res.writableEnded) closeSSE(res);
  }
  return fullContent;
}

const knowledgeGraphAccess = new KnowledgeGraphAccessLayer();
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
    const uid = req.firebaseUser?.uid;
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
    log.error('Error generating goal questions', { error: error instanceof Error ? error.message : String(error) });
    res.status(500).json({
      error: 'Failed to generate goal questions',
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
    const uid = req.firebaseUser?.uid;
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
      
      await streamToSSE(streamResult.stream, req, res, {
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

            // Create the knowledge graph (node-based format)
            const graphId = generateConceptId();
            const now = Date.now();
            const nodeBasedGraph: NodeBasedKnowledgeGraph = {
              id: graphId,
              seedConceptId,
              createdAt: now,
              updatedAt: now,
              version: 1,
              name: normalizedSeedConcept.name,
              goalFocused,
              difficulty,
              focus,
              nodes: {
                [graphId]: createGraphNode(graphId, 'Graph', {
                  id: graphId,
                  seedConceptId,
                  createdAt: now,
                  updatedAt: now,
                }),
                [seedConceptId]: createGraphNode(seedConceptId, 'Concept', {
                  id: seedConceptId,
                  name: normalizedSeedConcept.name,
                  description: normalizedSeedConcept.description,
                  isSeed: true,
                }),
              },
              nodeTypes: {
                ...createEmptyNodeTypeIndex(),
                Graph: [graphId],
                Concept: [seedConceptId],
              },
              relationships: [
                createRelationship(graphId, seedConceptId, 'containsConcept', 'forward'),
                createRelationship(graphId, seedConceptId, 'hasSeedConcept', 'forward'),
              ],
            };
            await knowledgeGraphAccess.saveGraph(uid, nodeBasedGraph);
            await invalidateLearningPaths(uid);
            await invalidateJumpBackIn(uid);

            // Save the goal with graphId
            goal.graphId = graphId;
            const savedGoal = await saveGoal(uid, goal);

            return {
              goal: savedGoal,
              graphId,
              seedConceptId,
            };
          } catch (error) {
            log.error('Error processing streamed goal with graph', { error: error instanceof Error ? error.message : String(error) });
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

    // Step 3: Create the knowledge graph (node-based format)
    const graphId = generateConceptId();
    const now = Date.now();
    const nodeBasedGraph: NodeBasedKnowledgeGraph = {
      id: graphId,
      seedConceptId,
      createdAt: now,
      updatedAt: now,
      version: 1,
      name: normalizedSeedConcept.name,
      goalFocused,
      difficulty,
      focus,
      nodes: {
        [graphId]: createGraphNode(graphId, 'Graph', {
          id: graphId,
          seedConceptId,
          createdAt: now,
          updatedAt: now,
        }),
        [seedConceptId]: createGraphNode(seedConceptId, 'Concept', {
          id: seedConceptId,
          name: normalizedSeedConcept.name,
          description: normalizedSeedConcept.description,
          isSeed: true,
        }),
      },
      nodeTypes: {
        ...createEmptyNodeTypeIndex(),
        Graph: [graphId],
        Concept: [seedConceptId],
      },
      relationships: [
        createRelationship(graphId, seedConceptId, 'containsConcept', 'forward'),
        createRelationship(graphId, seedConceptId, 'hasSeedConcept', 'forward'),
      ],
    };
    await knowledgeGraphAccess.saveGraph(uid, nodeBasedGraph);
    await invalidateLearningPaths(uid);
    await invalidateJumpBackIn(uid);

    // Step 4: Save the goal with graphId
    const goalWithGraphId = {
      ...normalResult.goal,
      graphId,
    };
    const savedGoal = await saveGoal(uid, goalWithGraphId);

    res.json({
      goal: savedGoal,
      graphId,
      seedConceptId,
    });
  } catch (error) {
    log.error('Error creating graph with goal', { error: error instanceof Error ? error.message : String(error) });
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
    const uid = req.firebaseUser?.uid;
    if (!uid) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const goalId = singleParam(req.params.goalId);
    if (!goalId) {
      res.status(400).json({ error: 'Goal ID is required' });
      return;
    }
    const updates = req.body;

    // Remove fields that shouldn't be updated directly
    const { id, createdAt, ...allowedUpdates } = updates;

    const updatedGoal = await updateGoal(uid, goalId, allowedUpdates);

    res.json(updatedGoal);
  } catch (error) {
    log.error('Error updating goal', { error: error instanceof Error ? error.message : String(error) });
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
    const uid = req.firebaseUser?.uid;
    if (!uid) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const goalId = singleParam(req.params.goalId);
    if (!goalId) {
      res.status(400).json({ error: 'Goal ID is required' });
      return;
    }

    await deleteGoal(uid, goalId);

    res.json({ message: 'Goal deleted successfully' });
  } catch (error) {
    log.error('Error deleting goal', { error: error instanceof Error ? error.message : String(error) });
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
    const uid = req.firebaseUser?.uid;
    if (!uid) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const graphId = singleQueryParam(req.query.graphId);

    if (graphId) {
      // Get goals for a specific graph
      const goals = await getGoalsByGraphId(uid, graphId);
      res.json({ goals });
    } else {
      // Get all goals for the user
      const goals = await getUserGoals(uid);
      res.json({ goals });
    }
  } catch (error) {
    log.error('Error getting user goals', { error: error instanceof Error ? error.message : String(error) });
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
    const uid = req.firebaseUser?.uid;
    if (!uid) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const goalId = singleParam(req.params.goalId);
    if (!goalId) {
      res.status(400).json({ error: 'Goal ID is required' });
      return;
    }

    const goal = await getGoalById(uid, goalId);

    if (!goal) {
      res.status(404).json({ error: 'Goal not found' });
      return;
    }

    res.json({ goal });
  } catch (error) {
    log.error('Error getting goal', { error: error instanceof Error ? error.message : String(error) });
    res.status(500).json({
      error: 'Failed to get goal',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

