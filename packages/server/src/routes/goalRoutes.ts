import { Router } from 'express';
import authenticateFirebase from '../middlewares/authenticateFirebase';
import {
  generateGoalQuestionsHandler,
  createGoalHandler,
  createGraphWithGoalHandler,
  updateGoalHandler,
  deleteGoalHandler,
  getUserGoalsHandler,
  getGoalByIdHandler,
} from '../controllers/goalController';

const router = Router();

// Goal question generation
router.post(
  '/generate-goal-questions',
  authenticateFirebase,
  generateGoalQuestionsHandler
);

// Goal CRUD operations
router.post('/goals', authenticateFirebase, createGoalHandler);
router.post('/goals/with-graph', authenticateFirebase, createGraphWithGoalHandler);
router.put('/goals/:goalId', authenticateFirebase, updateGoalHandler);
router.delete('/goals/:goalId', authenticateFirebase, deleteGoalHandler);
router.get('/goals', authenticateFirebase, getUserGoalsHandler);
router.get('/goals/:goalId', authenticateFirebase, getGoalByIdHandler);

export default router;

