/**
 * Translation Routes
 * 
 * API endpoints for content translation.
 */

import { Router } from 'express';
import authenticateFirebase from '../middlewares/authenticateFirebase';
import {
  translateContentHandler,
  translateLessonHandler,
  translateFlashcardsHandler,
  bulkTranslateHandler,
  getCachedTranslationHandler,
  checkTranslationStaleHandler,
  invalidateTranslationHandler,
  getSupportedLanguagesHandler,
} from '../controllers/translationController';

const router = Router();

// Language info (no auth required)
router.get('/languages', getSupportedLanguagesHandler);

// Content translation
router.post('/content', authenticateFirebase, translateContentHandler);
router.post('/bulk', authenticateFirebase, bulkTranslateHandler);

// Lesson translation
router.post('/graphs/:graphId/lessons/:conceptId', authenticateFirebase, translateLessonHandler);
router.post('/graphs/:graphId/lessons/:conceptId/flashcards', authenticateFirebase, translateFlashcardsHandler);

// Translation cache
router.get('/graphs/:graphId/nodes/:nodeId/cache', authenticateFirebase, getCachedTranslationHandler);
router.get('/graphs/:graphId/nodes/:nodeId/stale', authenticateFirebase, checkTranslationStaleHandler);
router.post('/graphs/:graphId/nodes/:nodeId/invalidate', authenticateFirebase, invalidateTranslationHandler);

export default router;
