import { Router } from 'express';
import {
  saveUserProgressHandler,
  getUserProgressHandler,
  getAllUserProgressHandler,
  trackConceptAccessHandler,
  getConceptsMasteredHandler,
  getLearningStreakHandler,
  getRecentActivityHandler,
  getStatisticsSummaryHandler,
  getUserPreferencesHandler,
  updateUserPreferencesHandler,
  getDailyProgressHandler,
  getRecommendedCoursesHandler,
  getContinueLearningCoursesHandler,
  getAchievementsHandler,
  checkAchievementsHandler,
  getDetailedStatisticsHandler,
  getJumpBackInHandler,
} from '../controllers/userProgressController';
import authenticateFirebase from '../middlewares/authenticateFirebase';

const router = Router();

// UserProgress endpoints
router.post('/progress', authenticateFirebase, saveUserProgressHandler);
router.get('/progress/:conceptId', authenticateFirebase, getUserProgressHandler);
router.post('/progress/:conceptId/track-access', authenticateFirebase, trackConceptAccessHandler);
router.get('/progress', authenticateFirebase, getAllUserProgressHandler);

// User Preferences endpoints
router.get('/preferences', authenticateFirebase, getUserPreferencesHandler);
router.put('/preferences', authenticateFirebase, updateUserPreferencesHandler);

// Statistics endpoints
router.get('/statistics/concepts-mastered', authenticateFirebase, getConceptsMasteredHandler);
router.get('/statistics/streak', authenticateFirebase, getLearningStreakHandler);
router.get('/statistics/recent-activity', authenticateFirebase, getRecentActivityHandler);
router.get('/statistics/summary', authenticateFirebase, getStatisticsSummaryHandler);
router.get('/statistics/daily-progress', authenticateFirebase, getDailyProgressHandler);
router.get('/statistics/detailed', authenticateFirebase, getDetailedStatisticsHandler);

// Recommendations endpoints
router.get('/recommendations/courses', authenticateFirebase, getRecommendedCoursesHandler);
router.get('/recommendations/continue-learning', authenticateFirebase, getContinueLearningCoursesHandler);

// Achievements endpoints
router.get('/achievements', authenticateFirebase, getAchievementsHandler);
router.post('/achievements/check', authenticateFirebase, checkAchievementsHandler);

// Jump Back In endpoint
router.get('/jump-back-in', authenticateFirebase, getJumpBackInHandler);

export default router;

