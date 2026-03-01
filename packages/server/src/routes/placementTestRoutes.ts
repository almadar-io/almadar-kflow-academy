/**
 * Routes for placement test endpoints
 */

import { Router } from 'express';
import authenticateFirebase from '../middlewares/authenticateFirebase';
import {
  generatePlacementQuestionsHandler,
  createPlacementTestHandler,
  getPlacementTestByIdHandler,
  updatePlacementTestQuestionsHandler,
  submitPlacementTestHandler,
  getUserPlacementTestsHandler,
  getPlacementTestsByGoalIdHandler,
  deletePlacementTestHandler,
} from '../controllers/placementTestController';

const router = Router();

// Generate placement questions
router.post(
  '/generate-questions',
  authenticateFirebase,
  generatePlacementQuestionsHandler
);

// Create placement test
router.post(
  '/tests',
  authenticateFirebase,
  createPlacementTestHandler
);

// Get placement test by ID
router.get(
  '/tests/:testId',
  authenticateFirebase,
  getPlacementTestByIdHandler
);

// Update placement test with questions
router.put(
  '/tests/:testId/questions',
  authenticateFirebase,
  updatePlacementTestQuestionsHandler
);

// Submit placement test answers
router.post(
  '/tests/:testId/submit',
  authenticateFirebase,
  submitPlacementTestHandler
);

// Get all placement tests for user
router.get(
  '/tests',
  authenticateFirebase,
  getUserPlacementTestsHandler
);

// Get placement tests for a specific goal
router.get(
  '/goals/:goalId/tests',
  authenticateFirebase,
  getPlacementTestsByGoalIdHandler
);

// Delete placement test
router.delete(
  '/tests/:testId',
  authenticateFirebase,
  deletePlacementTestHandler
);

export default router;

