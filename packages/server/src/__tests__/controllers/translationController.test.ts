/**
 * Unit Tests for Translation Controller
 */

import { Request, Response } from 'express';
import {
  translateContentHandler,
  translateLessonHandler,
  translateFlashcardsHandler,
  bulkTranslateHandler,
  getCachedTranslationHandler,
  checkTranslationStaleHandler,
  invalidateTranslationHandler,
  getSupportedLanguagesHandler,
} from '../../controllers/translationController';

// Mock the services
jest.mock('../../services/translation/TranslationService', () => {
  return {
    TranslationService: jest.fn().mockImplementation(() => ({
      translateContent: jest.fn().mockResolvedValue({
        content: 'Translated content',
        sourceLanguage: 'en',
        targetLanguage: 'es',
        translatedAt: Date.now(),
        translationMethod: 'ai',
        quality: 'standard',
      }),
      translateLesson: jest.fn().mockResolvedValue({
        conceptId: 'concept-123',
        originalContent: 'Original lesson',
        translatedContent: 'Translated lesson',
        sourceLanguage: 'en',
        targetLanguage: 'es',
        translatedAt: Date.now(),
        isStale: false,
      }),
      translateFlashcards: jest.fn().mockResolvedValue([
        {
          id: 'flashcard-1',
          originalFront: 'Front',
          originalBack: 'Back',
          translatedFront: 'Frente',
          translatedBack: 'Dorso',
          sourceLanguage: 'en',
          targetLanguage: 'es',
          translatedAt: Date.now(),
        },
      ]),
      bulkTranslate: jest.fn().mockResolvedValue({
        translations: [{ id: '1', translatedContent: 'Translated', success: true }],
        totalItems: 1,
        successCount: 1,
        failureCount: 0,
        translatedAt: Date.now(),
      }),
      getCachedTranslation: jest.fn().mockResolvedValue(null),
      isTranslationStale: jest.fn().mockResolvedValue(true),
      invalidateTranslation: jest.fn().mockResolvedValue(undefined),
      getSupportedLanguages: jest.fn().mockReturnValue([
        { code: 'en', name: 'English', nativeName: 'English', direction: 'ltr' },
        { code: 'es', name: 'Spanish', nativeName: 'Español', direction: 'ltr' },
      ]),
    })),
  };
});

jest.mock('../../services/knowledgeGraphAccess/KnowledgeGraphAccessLayer', () => {
  return {
    KnowledgeGraphAccessLayer: jest.fn().mockImplementation(() => ({})),
  };
});

describe('Translation Controller', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let responseJson: jest.Mock;
  let responseStatus: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();

    responseJson = jest.fn().mockReturnThis();
    responseStatus = jest.fn().mockReturnThis();

    mockResponse = {
      json: responseJson,
      status: responseStatus,
    };
  });

  // ==================== translateContentHandler ====================

  describe('translateContentHandler', () => {
    it('should translate content successfully', async () => {
      mockRequest = {
        firebaseUser: { uid: 'user-123' },
        body: {
          content: 'Hello world',
          sourceLanguage: 'en',
          targetLanguage: 'es',
        },
      } as any;

      await translateContentHandler(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(responseJson).toHaveBeenCalledWith({
        translation: expect.objectContaining({
          content: 'Translated content',
          sourceLanguage: 'en',
          targetLanguage: 'es',
        }),
      });
    });

    it('should return 401 if not authenticated', async () => {
      mockRequest = {
        firebaseUser: undefined,
        body: {
          content: 'Hello',
          sourceLanguage: 'en',
          targetLanguage: 'es',
        },
      } as any;

      await translateContentHandler(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(responseStatus).toHaveBeenCalledWith(401);
      expect(responseJson).toHaveBeenCalledWith({ error: 'Unauthorized' });
    });

    it('should return 400 if missing required fields', async () => {
      mockRequest = {
        firebaseUser: { uid: 'user-123' },
        body: {
          content: 'Hello',
          // Missing sourceLanguage and targetLanguage
        },
      } as any;

      await translateContentHandler(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(responseStatus).toHaveBeenCalledWith(400);
      expect(responseJson).toHaveBeenCalledWith({
        error: 'content, sourceLanguage, and targetLanguage are required',
      });
    });
  });

  // ==================== translateLessonHandler ====================

  describe('translateLessonHandler', () => {
    it('should translate lesson successfully', async () => {
      mockRequest = {
        firebaseUser: { uid: 'user-123' },
        params: { graphId: 'graph-123', conceptId: 'concept-456' },
        body: { targetLanguage: 'es' },
      } as any;

      await translateLessonHandler(
        mockRequest as any,
        mockResponse as any
      );

      expect(responseJson).toHaveBeenCalledWith({
        translation: expect.objectContaining({
          conceptId: 'concept-123',
          translatedContent: 'Translated lesson',
        }),
      });
    });

    it('should return 400 if targetLanguage missing', async () => {
      mockRequest = {
        firebaseUser: { uid: 'user-123' },
        params: { graphId: 'graph-123', conceptId: 'concept-456' },
        body: {},
      } as any;

      await translateLessonHandler(
        mockRequest as any,
        mockResponse as any
      );

      expect(responseStatus).toHaveBeenCalledWith(400);
      expect(responseJson).toHaveBeenCalledWith({
        error: 'targetLanguage is required',
      });
    });
  });

  // ==================== translateFlashcardsHandler ====================

  describe('translateFlashcardsHandler', () => {
    it('should translate flashcards successfully', async () => {
      mockRequest = {
        firebaseUser: { uid: 'user-123' },
        params: { graphId: 'graph-123', conceptId: 'concept-456' },
        body: { targetLanguage: 'es' },
      } as any;

      await translateFlashcardsHandler(
        mockRequest as any,
        mockResponse as any
      );

      expect(responseJson).toHaveBeenCalledWith({
        flashcards: expect.arrayContaining([
          expect.objectContaining({
            translatedFront: 'Frente',
            translatedBack: 'Dorso',
          }),
        ]),
      });
    });
  });

  // ==================== bulkTranslateHandler ====================

  describe('bulkTranslateHandler', () => {
    it('should bulk translate successfully', async () => {
      mockRequest = {
        firebaseUser: { uid: 'user-123' },
        body: {
          items: [{ id: '1', content: 'Hello', type: 'lesson' }],
          sourceLanguage: 'en',
          targetLanguage: 'es',
        },
      } as any;

      await bulkTranslateHandler(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(responseJson).toHaveBeenCalledWith({
        result: expect.objectContaining({
          totalItems: 1,
          successCount: 1,
        }),
      });
    });

    it('should return 400 if items is empty', async () => {
      mockRequest = {
        firebaseUser: { uid: 'user-123' },
        body: {
          items: [],
          sourceLanguage: 'en',
          targetLanguage: 'es',
        },
      } as any;

      await bulkTranslateHandler(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(responseStatus).toHaveBeenCalledWith(400);
      expect(responseJson).toHaveBeenCalledWith({
        error: 'items array is required and cannot be empty',
      });
    });
  });

  // ==================== getCachedTranslationHandler ====================

  describe('getCachedTranslationHandler', () => {
    it('should return cached translation', async () => {
      mockRequest = {
        firebaseUser: { uid: 'user-123' },
        params: { graphId: 'graph-123', nodeId: 'node-456' },
        query: { targetLanguage: 'es' },
      } as any;

      await getCachedTranslationHandler(
        mockRequest as any,
        mockResponse as any
      );

      expect(responseJson).toHaveBeenCalledWith({
        translation: null, // Mocked to return null
      });
    });

    it('should return 400 if targetLanguage missing', async () => {
      mockRequest = {
        firebaseUser: { uid: 'user-123' },
        params: { graphId: 'graph-123', nodeId: 'node-456' },
        query: {},
      } as any;

      await getCachedTranslationHandler(
        mockRequest as any,
        mockResponse as any
      );

      expect(responseStatus).toHaveBeenCalledWith(400);
    });
  });

  // ==================== checkTranslationStaleHandler ====================

  describe('checkTranslationStaleHandler', () => {
    it('should check staleness successfully', async () => {
      mockRequest = {
        firebaseUser: { uid: 'user-123' },
        params: { graphId: 'graph-123', nodeId: 'node-456' },
        query: { targetLanguage: 'es' },
      } as any;

      await checkTranslationStaleHandler(
        mockRequest as any,
        mockResponse as any
      );

      expect(responseJson).toHaveBeenCalledWith({
        isStale: true,
      });
    });
  });

  // ==================== invalidateTranslationHandler ====================

  describe('invalidateTranslationHandler', () => {
    it('should invalidate translation successfully', async () => {
      mockRequest = {
        firebaseUser: { uid: 'user-123' },
        params: { graphId: 'graph-123', nodeId: 'node-456' },
        body: { targetLanguage: 'es' },
      } as any;

      await invalidateTranslationHandler(
        mockRequest as any,
        mockResponse as any
      );

      expect(responseJson).toHaveBeenCalledWith({
        success: true,
      });
    });
  });

  // ==================== getSupportedLanguagesHandler ====================

  describe('getSupportedLanguagesHandler', () => {
    it('should return supported languages', async () => {
      mockRequest = {} as any;

      await getSupportedLanguagesHandler(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(responseJson).toHaveBeenCalledWith({
        languages: expect.arrayContaining([
          expect.objectContaining({ code: 'en', name: 'English' }),
          expect.objectContaining({ code: 'es', name: 'Spanish' }),
        ]),
      });
    });
  });
});
