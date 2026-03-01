import { Request, Response } from 'express';
import {
  saveUserProgress,
  getUserProgress,
  getAllUserProgress,
  trackConceptAccess,
} from '../services/userProgressService';
import {
  getLearningStreak,
  getConceptsMasteredCount,
  getRecentActivity,
  getStatisticsSummary,
  getDailyProgress,
  getDetailedStatistics,
} from '../services/statisticsService';
import {
  getUserPreferences,
  updateUserPreferences,
} from '../services/userPreferencesService';
import {
  getRecommendedCourses,
  getContinueLearningCourses,
} from '../services/recommendationService';
import {
  getAllAchievementsWithProgress,
  checkAndAwardAchievements,
  type AchievementEvent,
} from '../services/achievementsService';
import {
  getJumpBackInItems,
} from '../services/jumpBackInService';

/**
 * Save or update UserProgress for a concept
 * POST /api/user/progress
 */
export async function saveUserProgressHandler(req: Request, res: Response): Promise<void> {
  try {
    const uid = (req as any).firebaseUser?.uid;
    if (!uid) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { conceptId, ...progressData } = req.body;
    if (!conceptId) {
      res.status(400).json({ error: 'conceptId is required' });
      return;
    }

    const progress = await saveUserProgress(uid, conceptId, progressData);
    res.json({ progress });
  } catch (error: any) {
    console.error('Error saving user progress:', error);
    res.status(500).json({ error: error.message || 'Failed to save user progress' });
  }
}

/**
 * Get UserProgress for a specific concept
 * GET /api/user/progress/:conceptId?trackAccess=true&conceptName=...&graphId=...
 */
export async function getUserProgressHandler(req: Request, res: Response): Promise<void> {
  try {
    const uid = (req as any).firebaseUser?.uid;
    if (!uid) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { conceptId } = req.params;
    const { trackAccess, conceptName, graphId } = req.query;
    
    // Decode conceptId in case it was URL-encoded (handles special characters like "/")
    const decodedConceptId = decodeURIComponent(conceptId);
    
    // If trackAccess is true, track the access (fire and forget)
    if (trackAccess === 'true') {
      trackConceptAccess(
        uid,
        decodedConceptId,
        (conceptName as string) || decodedConceptId,
        graphId as string | undefined
      ).catch(error => {
        console.warn('Failed to track concept access:', error);
        // Don't fail the request if tracking fails
      });
    }
    
    const progress = await getUserProgress(uid, decodedConceptId);

    if (!progress) {
      res.status(404).json({ error: 'User progress not found' });
      return;
    }

    res.json({ progress });
  } catch (error: any) {
    console.error('Error getting user progress:', error);
    res.status(500).json({ error: error.message || 'Failed to get user progress' });
  }
}

/**
 * Track concept access (lightweight endpoint for tracking only)
 * POST /api/user/progress/:conceptId/track-access
 */
export async function trackConceptAccessHandler(req: Request, res: Response): Promise<void> {
  try {
    const uid = (req as any).firebaseUser?.uid;
    if (!uid) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { conceptId } = req.params;
    const { conceptName, graphId } = req.body;

    // Decode conceptId in case it was URL-encoded (handles special characters like "/")
    const decodedConceptId = decodeURIComponent(conceptId);
    await trackConceptAccess(uid, decodedConceptId, conceptName || decodedConceptId, graphId);
    res.json({ success: true });
  } catch (error: any) {
    console.error('Error tracking concept access:', error);
    res.status(500).json({ error: error.message || 'Failed to track concept access' });
  }
}

/**
 * Get all UserProgress for the current user
 * GET /api/user/progress
 */
export async function getAllUserProgressHandler(req: Request, res: Response): Promise<void> {
  try {
    const uid = (req as any).firebaseUser?.uid;
    if (!uid) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const progressList = await getAllUserProgress(uid);
    res.json({ progress: progressList });
  } catch (error: any) {
    console.error('Error getting all user progress:', error);
    res.status(500).json({ error: error.message || 'Failed to get user progress' });
  }
}

/**
 * Get count of concepts mastered
 * GET /api/user/statistics/concepts-mastered
 */
export async function getConceptsMasteredHandler(req: Request, res: Response): Promise<void> {
  try {
    const uid = (req as any).firebaseUser?.uid;
    if (!uid) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const count = await getConceptsMasteredCount(uid);
    res.json({ count });
  } catch (error: any) {
    console.error('Error getting concepts mastered:', error);
    res.status(500).json({ error: error.message || 'Failed to get concepts mastered' });
  }
}

/**
 * Get learning streak
 * GET /api/user/statistics/streak
 */
export async function getLearningStreakHandler(req: Request, res: Response): Promise<void> {
  try {
    const uid = (req as any).firebaseUser?.uid;
    if (!uid) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const streak = await getLearningStreak(uid);
    res.json({ streak });
  } catch (error: any) {
    console.error('Error getting learning streak:', error);
    res.status(500).json({ error: error.message || 'Failed to get learning streak' });
  }
}

/**
 * Get recent activity
 * GET /api/user/statistics/recent-activity
 */
export async function getRecentActivityHandler(req: Request, res: Response): Promise<void> {
  try {
    const uid = (req as any).firebaseUser?.uid;
    if (!uid) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 10;
    const activity = await getRecentActivity(uid, limit);
    res.json({ activity });
  } catch (error: any) {
    console.error('Error getting recent activity:', error);
    res.status(500).json({ error: error.message || 'Failed to get recent activity' });
  }
}

/**
 * Get statistics summary (all stats in one call)
 * GET /api/user/statistics/summary
 */
export async function getStatisticsSummaryHandler(req: Request, res: Response): Promise<void> {
  try {
    const uid = (req as any).firebaseUser?.uid;
    if (!uid) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const activityLimit = req.query.activityLimit ? parseInt(req.query.activityLimit as string, 10) : 5;
    const summary = await getStatisticsSummary(uid, activityLimit);
    res.json({ statistics: summary });
  } catch (error: any) {
    console.error('Error getting statistics summary:', error);
    res.status(500).json({ error: error.message || 'Failed to get statistics summary' });
  }
}

/**
 * Get user preferences
 * GET /api/user/preferences
 */
export async function getUserPreferencesHandler(req: Request, res: Response): Promise<void> {
  try {
    const uid = (req as any).firebaseUser?.uid;
    if (!uid) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const preferences = await getUserPreferences(uid);
    res.json({ preferences });
  } catch (error: any) {
    console.error('Error getting user preferences:', error);
    res.status(500).json({ error: error.message || 'Failed to get user preferences' });
  }
}

/**
 * Update user preferences
 * PUT /api/user/preferences
 */
export async function updateUserPreferencesHandler(req: Request, res: Response): Promise<void> {
  try {
    const uid = (req as any).firebaseUser?.uid;
    if (!uid) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const preferences = await updateUserPreferences(uid, req.body);
    res.json({ preferences });
  } catch (error: any) {
    console.error('Error updating user preferences:', error);
    res.status(500).json({ error: error.message || 'Failed to update user preferences' });
  }
}

/**
 * Get daily progress
 * GET /api/user/statistics/daily-progress
 */
export async function getDailyProgressHandler(req: Request, res: Response): Promise<void> {
  try {
    const uid = (req as any).firebaseUser?.uid;
    if (!uid) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const progress = await getDailyProgress(uid);
    res.json({ progress });
  } catch (error: any) {
    console.error('Error getting daily progress:', error);
    res.status(500).json({ error: error.message || 'Failed to get daily progress' });
  }
}

/**
 * Get recommended courses
 * GET /api/user/recommendations/courses?limit=5
 */
export async function getRecommendedCoursesHandler(req: Request, res: Response): Promise<void> {
  try {
    const uid = (req as any).firebaseUser?.uid;
    if (!uid) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 5;
    const courses = await getRecommendedCourses(uid, limit);
    res.json({ courses });
  } catch (error: any) {
    console.error('Error getting recommended courses:', error);
    res.status(500).json({ error: error.message || 'Failed to get recommended courses' });
  }
}

/**
 * Get continue learning courses
 * GET /api/user/recommendations/continue-learning?limit=5
 */
export async function getContinueLearningCoursesHandler(req: Request, res: Response): Promise<void> {
  try {
    const uid = (req as any).firebaseUser?.uid;
    if (!uid) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 5;
    const courses = await getContinueLearningCourses(uid, limit);
    res.json({ courses });
  } catch (error: any) {
    console.error('Error getting continue learning courses:', error);
    res.status(500).json({ error: error.message || 'Failed to get continue learning courses' });
  }
}

/**
 * Get all achievements with progress
 * GET /api/user/achievements
 */
export async function getAchievementsHandler(req: Request, res: Response): Promise<void> {
  try {
    const uid = (req as any).firebaseUser?.uid;
    if (!uid) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const achievements = await getAllAchievementsWithProgress(uid);
    res.json({ achievements });
  } catch (error: any) {
    console.error('Error getting achievements:', error);
    res.status(500).json({ error: error.message || 'Failed to get achievements' });
  }
}

/**
 * Check and award achievements (called after events like lesson completion)
 * POST /api/user/achievements/check
 */
export async function checkAchievementsHandler(req: Request, res: Response): Promise<void> {
  try {
    const uid = (req as any).firebaseUser?.uid;
    if (!uid) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const event = req.body as AchievementEvent;
    const newlyAwarded = await checkAndAwardAchievements(uid, event);
    res.json({ achievements: newlyAwarded });
  } catch (error: any) {
    console.error('Error checking achievements:', error);
    res.status(500).json({ error: error.message || 'Failed to check achievements' });
  }
}

/**
 * Get detailed statistics
 * GET /api/user/statistics/detailed
 */
export async function getDetailedStatisticsHandler(req: Request, res: Response): Promise<void> {
  try {
    const uid = (req as any).firebaseUser?.uid;
    if (!uid) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const statistics = await getDetailedStatistics(uid);
    res.json({ statistics });
  } catch (error: any) {
    console.error('Error getting detailed statistics:', error);
    res.status(500).json({ error: error.message || 'Failed to get detailed statistics' });
  }
}

/**
 * Get all jump back in items (courses and learning paths)
 * GET /api/user/jump-back-in
 */
export async function getJumpBackInHandler(req: Request, res: Response): Promise<void> {
  try {
    const uid = (req as any).firebaseUser?.uid;
    if (!uid) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const items = await getJumpBackInItems(uid);
    res.json({ items });
  } catch (error: any) {
    console.error('Error getting jump back in items:', error);
    res.status(500).json({ error: error.message || 'Failed to get jump back in items' });
  }
}

