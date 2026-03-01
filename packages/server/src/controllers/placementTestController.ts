/**
 * Controller for placement test endpoints
 */

import { Request, Response } from 'express';
import {
  createPlacementTest,
  getPlacementTestById,
  updatePlacementTestQuestions,
  submitPlacementTest,
  getUserPlacementTests,
  getPlacementTestsByGoalId,
  deletePlacementTest,
} from '../services/placementTestService';
import { generatePlacementQuestions } from '../operations/generatePlacementQuestions';

/**
 * Generate placement test questions
 */
export async function generatePlacementQuestionsHandler(
  req: Request,
  res: Response
): Promise<void | Response> {
  try {
    const { goalId, graphId, topic } = req.body;
    const uid = req.firebaseUser?.uid;

    if (!uid) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!goalId || !graphId || !topic) {
      return res.status(400).json({ error: 'goalId, graphId, and topic are required' });
    }

    const result = await generatePlacementQuestions({
      goalId,
      graphId,
      topic,
      uid,
    });

    res.json(result);
  } catch (error) {
    console.error('Error generating placement questions:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ error: 'Failed to generate placement questions', details: errorMessage });
  }
}

/**
 * Create a new placement test
 */
export async function createPlacementTestHandler(
  req: Request,
  res: Response
): Promise<void | Response> {
  try {
    const { goalId, graphId, topic } = req.body;
    const uid = req.firebaseUser?.uid;

    if (!uid) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!goalId || !graphId || !topic) {
      return res.status(400).json({ error: 'goalId, graphId, and topic are required' });
    }

    const test = await createPlacementTest({
      goalId,
      graphId,
      topic,
      uid,
    });

    res.json({ test });
  } catch (error) {
    console.error('Error creating placement test:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ error: 'Failed to create placement test', details: errorMessage });
  }
}

/**
 * Get a placement test by ID
 */
export async function getPlacementTestByIdHandler(
  req: Request,
  res: Response
): Promise<void | Response> {
  try {
    const { testId } = req.params;
    const uid = req.firebaseUser?.uid;

    if (!uid) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const test = await getPlacementTestById(uid, testId);

    if (!test) {
      return res.status(404).json({ error: 'Placement test not found' });
    }

    res.json({ test });
  } catch (error) {
    console.error('Error fetching placement test:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ error: 'Failed to fetch placement test', details: errorMessage });
  }
}

/**
 * Update placement test with generated questions
 */
export async function updatePlacementTestQuestionsHandler(
  req: Request,
  res: Response
): Promise<void | Response> {
  try {
    const { testId } = req.params;
    const { questions } = req.body;
    const uid = req.firebaseUser?.uid;

    if (!uid) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!Array.isArray(questions)) {
      return res.status(400).json({ error: 'questions must be an array' });
    }

    const test = await updatePlacementTestQuestions(uid, testId, questions);

    res.json({ test });
  } catch (error) {
    console.error('Error updating placement test questions:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ error: 'Failed to update placement test questions', details: errorMessage });
  }
}

/**
 * Submit placement test answers and get results
 */
export async function submitPlacementTestHandler(
  req: Request,
  res: Response
): Promise<void | Response> {
  try {
    const { testId } = req.params;
    const { answers } = req.body;
    const uid = req.firebaseUser?.uid;

    if (!uid) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!Array.isArray(answers)) {
      return res.status(400).json({ error: 'answers must be an array' });
    }

    const result = await submitPlacementTest({
      testId,
      answers,
      uid,
    });

    res.json({ result });
  } catch (error) {
    console.error('Error submitting placement test:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ error: 'Failed to submit placement test', details: errorMessage });
  }
}

/**
 * Get all placement tests for the current user
 */
export async function getUserPlacementTestsHandler(
  req: Request,
  res: Response
): Promise<void | Response> {
  try {
    const uid = req.firebaseUser?.uid;

    if (!uid) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const tests = await getUserPlacementTests(uid);

    res.json({ tests });
  } catch (error) {
    console.error('Error fetching user placement tests:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ error: 'Failed to fetch placement tests', details: errorMessage });
  }
}

/**
 * Get placement tests for a specific goal
 */
export async function getPlacementTestsByGoalIdHandler(
  req: Request,
  res: Response
): Promise<void | Response> {
  try {
    const { goalId } = req.params;
    const uid = req.firebaseUser?.uid;

    if (!uid) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const tests = await getPlacementTestsByGoalId(uid, goalId);

    res.json({ tests });
  } catch (error) {
    console.error('Error fetching placement tests by goal:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ error: 'Failed to fetch placement tests', details: errorMessage });
  }
}

/**
 * Delete a placement test
 */
export async function deletePlacementTestHandler(
  req: Request,
  res: Response
): Promise<void | Response> {
  try {
    const { testId } = req.params;
    const uid = req.firebaseUser?.uid;

    if (!uid) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    await deletePlacementTest(uid, testId);

    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting placement test:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ error: 'Failed to delete placement test', details: errorMessage });
  }
}

