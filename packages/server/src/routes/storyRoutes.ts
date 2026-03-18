/**
 * Story Routes
 *
 * REST API routes for stories and series stored in a dedicated
 * knowledge graph per user. Stories are stored as nodes with
 * Story/Series/Season/Episode types.
 */

import { Router } from 'express';
import authenticateFirebase from '../middlewares/authenticateFirebase';
import {
  listStoriesHandler,
  getStoryHandler,
  createStoryHandler,
  updateStoryHandler,
  deleteStoryHandler,
  listSeriesHandler,
  getSeriesHandler,
  createSeriesHandler,
  updateSeriesHandler,
  deleteSeriesHandler,
  getStoryProgressHandler,
  saveStoryProgressHandler,
} from '../controllers/storyController';

const router = Router();

// Public story routes (no auth required for reading)
router.get('/stories', listStoriesHandler);
router.get('/stories/:storyId', getStoryHandler);
router.get('/series', listSeriesHandler);
router.get('/series/:seriesId', getSeriesHandler);

// Protected story routes (auth required for writes)
router.post('/stories', authenticateFirebase, createStoryHandler);
router.put('/stories/:storyId', authenticateFirebase, updateStoryHandler);
router.delete('/stories/:storyId', authenticateFirebase, deleteStoryHandler);

router.post('/series', authenticateFirebase, createSeriesHandler);
router.put('/series/:seriesId', authenticateFirebase, updateSeriesHandler);
router.delete('/series/:seriesId', authenticateFirebase, deleteSeriesHandler);

// Progress routes (always authenticated)
router.get('/progress', authenticateFirebase, getStoryProgressHandler);
router.post('/progress', authenticateFirebase, saveStoryProgressHandler);

export default router;
