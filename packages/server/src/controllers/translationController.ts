/**
 * Translation Controller
 * 
 * Handles translation-related HTTP endpoints for course content.
 */

import { Request, Response } from 'express';
import { TranslationService } from '../services/translation/TranslationService';
import { KnowledgeGraphAccessLayer } from '../services/knowledgeGraphAccess/KnowledgeGraphAccessLayer';
import type { TranslationOptions, BulkTranslationRequest } from '../types/translation';

type ErrorResponse = { error: string };

// Create singleton instances
const accessLayer = new KnowledgeGraphAccessLayer();
const translationService = new TranslationService(accessLayer);

// ==================== Content Translation ====================

/**
 * Translate arbitrary content
 */
export const translateContentHandler = async (
  req: Request<
    {},
    { translation: any } | ErrorResponse,
    { content: string; sourceLanguage: string; targetLanguage: string; options?: TranslationOptions }
  >,
  res: Response<{ translation: any } | ErrorResponse>
) => {
  try {
    const uid = req.firebaseUser?.uid;

    if (!uid) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { content, sourceLanguage, targetLanguage, options } = req.body;

    if (!content || !sourceLanguage || !targetLanguage) {
      return res.status(400).json({ error: 'content, sourceLanguage, and targetLanguage are required' });
    }

    const translation = await translationService.translateContent(
      content,
      sourceLanguage,
      targetLanguage,
      options
    );

    return res.json({ translation });
  } catch (error: any) {
    console.error('Failed to translate content:', error);
    return res.status(500).json({ error: error.message || 'Failed to translate content' });
  }
};

/**
 * Translate a lesson
 */
export const translateLessonHandler = async (
  req: Request<
    { graphId: string; conceptId: string },
    { translation: any } | ErrorResponse,
    { targetLanguage: string; options?: TranslationOptions & { cacheInGraph?: boolean } }
  >,
  res: Response<{ translation: any } | ErrorResponse>
) => {
  try {
    const uid = req.firebaseUser?.uid;

    if (!uid) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { graphId, conceptId } = req.params;
    const { targetLanguage, options } = req.body;

    if (!targetLanguage) {
      return res.status(400).json({ error: 'targetLanguage is required' });
    }

    const translation = await translationService.translateLesson(
      uid,
      graphId,
      conceptId,
      targetLanguage,
      options
    );

    return res.json({ translation });
  } catch (error: any) {
    console.error('Failed to translate lesson:', error);
    return res.status(500).json({ error: error.message || 'Failed to translate lesson' });
  }
};

/**
 * Translate flashcards for a concept
 */
export const translateFlashcardsHandler = async (
  req: Request<
    { graphId: string; conceptId: string },
    { flashcards: any[] } | ErrorResponse,
    { targetLanguage: string; options?: TranslationOptions }
  >,
  res: Response<{ flashcards: any[] } | ErrorResponse>
) => {
  try {
    const uid = req.firebaseUser?.uid;

    if (!uid) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { graphId, conceptId } = req.params;
    const { targetLanguage, options } = req.body;

    if (!targetLanguage) {
      return res.status(400).json({ error: 'targetLanguage is required' });
    }

    const flashcards = await translationService.translateFlashcards(
      uid,
      graphId,
      conceptId,
      targetLanguage,
      options
    );

    return res.json({ flashcards });
  } catch (error: any) {
    console.error('Failed to translate flashcards:', error);
    return res.status(500).json({ error: error.message || 'Failed to translate flashcards' });
  }
};

/**
 * Bulk translate multiple items
 */
export const bulkTranslateHandler = async (
  req: Request<{}, { result: any } | ErrorResponse, BulkTranslationRequest>,
  res: Response<{ result: any } | ErrorResponse>
) => {
  try {
    const uid = req.firebaseUser?.uid;

    if (!uid) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { items, sourceLanguage, targetLanguage, options } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'items array is required and cannot be empty' });
    }

    if (!sourceLanguage || !targetLanguage) {
      return res.status(400).json({ error: 'sourceLanguage and targetLanguage are required' });
    }

    const result = await translationService.bulkTranslate({
      items,
      sourceLanguage,
      targetLanguage,
      options,
    });

    return res.json({ result });
  } catch (error: any) {
    console.error('Failed to bulk translate:', error);
    return res.status(500).json({ error: error.message || 'Failed to bulk translate' });
  }
};

// ==================== Translation Cache ====================

/**
 * Get cached translation for a node
 */
export const getCachedTranslationHandler = async (
  req: Request<
    { graphId: string; nodeId: string },
    { translation: any | null } | ErrorResponse,
    {},
    { targetLanguage: string }
  >,
  res: Response<{ translation: any | null } | ErrorResponse>
) => {
  try {
    const uid = req.firebaseUser?.uid;

    if (!uid) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { graphId, nodeId } = req.params;
    const { targetLanguage } = req.query;

    if (!targetLanguage) {
      return res.status(400).json({ error: 'targetLanguage query parameter is required' });
    }

    const translation = await translationService.getCachedTranslation(
      uid,
      graphId,
      nodeId,
      targetLanguage
    );

    return res.json({ translation });
  } catch (error: any) {
    console.error('Failed to get cached translation:', error);
    return res.status(500).json({ error: error.message || 'Failed to get cached translation' });
  }
};

/**
 * Check if translation is stale
 */
export const checkTranslationStaleHandler = async (
  req: Request<
    { graphId: string; nodeId: string },
    { isStale: boolean } | ErrorResponse,
    {},
    { targetLanguage: string }
  >,
  res: Response<{ isStale: boolean } | ErrorResponse>
) => {
  try {
    const uid = req.firebaseUser?.uid;

    if (!uid) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { graphId, nodeId } = req.params;
    const { targetLanguage } = req.query;

    if (!targetLanguage) {
      return res.status(400).json({ error: 'targetLanguage query parameter is required' });
    }

    const isStale = await translationService.isTranslationStale(
      uid,
      graphId,
      nodeId,
      targetLanguage
    );

    return res.json({ isStale });
  } catch (error: any) {
    console.error('Failed to check translation staleness:', error);
    return res.status(500).json({ error: error.message || 'Failed to check translation staleness' });
  }
};

/**
 * Invalidate cached translation
 */
export const invalidateTranslationHandler = async (
  req: Request<
    { graphId: string; nodeId: string },
    { success: boolean } | ErrorResponse,
    { targetLanguage?: string }
  >,
  res: Response<{ success: boolean } | ErrorResponse>
) => {
  try {
    const uid = req.firebaseUser?.uid;

    if (!uid) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { graphId, nodeId } = req.params;
    const { targetLanguage } = req.body;

    await translationService.invalidateTranslation(
      uid,
      graphId,
      nodeId,
      targetLanguage
    );

    return res.json({ success: true });
  } catch (error: any) {
    console.error('Failed to invalidate translation:', error);
    return res.status(500).json({ error: error.message || 'Failed to invalidate translation' });
  }
};

// ==================== Language Info ====================

/**
 * Get list of supported languages
 */
export const getSupportedLanguagesHandler = async (
  _req: Request,
  res: Response<{ languages: any[] } | ErrorResponse>
) => {
  try {
    const languages = translationService.getSupportedLanguages();
    return res.json({ languages });
  } catch (error: any) {
    console.error('Failed to get supported languages:', error);
    return res.status(500).json({ error: error.message || 'Failed to get supported languages' });
  }
};
