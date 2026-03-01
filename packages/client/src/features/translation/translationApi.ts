/**
 * Translation API client
 * 
 * Provides methods to interact with the translation service endpoints.
 */

import { apiClient } from '../../services/apiClient';
import { auth } from '../../config/firebase';

// Helper function for auth headers
const withAuthHeaders = async (): Promise<HeadersInit> => {
  const currentUser = auth.currentUser;
  if (!currentUser) {
    throw new Error('User is not authenticated');
  }
  const token = await currentUser.getIdToken();
  return {
    Authorization: `Bearer ${token}`,
  };
};

// ============================================================================
// Types
// ============================================================================

export interface LanguageInfo {
  code: string;
  name: string;
  nativeName: string;
  isRTL: boolean;
}

export interface TranslatedContent {
  content: string;
  sourceLanguage: string;
  targetLanguage: string;
  translatedAt: number;
  qualityTier: 'basic' | 'standard' | 'premium';
}

export interface TranslationOptions {
  qualityTier?: 'basic' | 'standard' | 'premium';
  preserveCodeBlocks?: boolean;
  customTerminology?: Record<string, string>;
}

export interface BulkTranslationItem {
  id: string;
  content: string;
  type: 'lesson' | 'flashcard' | 'assessment';
}

export interface BulkTranslationResult {
  translations: Array<{
    id: string;
    content: string;
    success: boolean;
    error?: string;
  }>;
  totalProcessed: number;
  successCount: number;
  failureCount: number;
}

export interface TranslatedLesson {
  conceptId: string;
  title: string;
  content: string;
  sourceLanguage: string;
  targetLanguage: string;
  translatedAt: number;
}

export interface TranslatedFlashcard {
  flashcardId: string;
  front: string;
  back: string;
  sourceLanguage: string;
  targetLanguage: string;
  translatedAt: number;
}

export interface CachedTranslation {
  sourceNodeId: string;
  sourceLanguage: string;
  targetLanguage: string;
  translatedContent: string;
  translatedAt: number;
  sourceUpdatedAt: number;
  qualityTier: 'basic' | 'standard' | 'premium';
}

// ============================================================================
// API Functions
// ============================================================================

export const translationApi = {
  /**
   * Get list of supported languages
   */
  getSupportedLanguages: async (): Promise<{ languages: LanguageInfo[] }> => {
    const headers = await withAuthHeaders();
    return apiClient.fetch('/api/translation/languages', {
      headers: { 'Content-Type': 'application/json', ...headers },
    });
  },

  /**
   * Translate arbitrary content
   */
  translateContent: async (
    content: string,
    sourceLanguage: string,
    targetLanguage: string,
    options?: TranslationOptions
  ): Promise<{ translation: TranslatedContent }> => {
    const headers = await withAuthHeaders();
    return apiClient.fetch('/api/translation/content', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...headers },
      body: JSON.stringify({
        content,
        sourceLanguage,
        targetLanguage,
        ...options,
      }),
    });
  },

  /**
   * Bulk translate multiple items
   */
  bulkTranslate: async (
    items: BulkTranslationItem[],
    sourceLanguage: string,
    targetLanguage: string,
    options?: TranslationOptions
  ): Promise<BulkTranslationResult> => {
    const headers = await withAuthHeaders();
    return apiClient.fetch('/api/translation/bulk', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...headers },
      body: JSON.stringify({
        items,
        sourceLanguage,
        targetLanguage,
        ...options,
      }),
    });
  },

  /**
   * Translate a lesson
   */
  translateLesson: async (
    graphId: string,
    conceptId: string,
    targetLanguage: string,
    options?: TranslationOptions
  ): Promise<{ translation: TranslatedLesson }> => {
    const headers = await withAuthHeaders();
    return apiClient.fetch(`/api/translation/graphs/${graphId}/lessons/${conceptId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...headers },
      body: JSON.stringify({
        targetLanguage,
        ...options,
      }),
    });
  },

  /**
   * Translate flashcards for a concept
   */
  translateFlashcards: async (
    graphId: string,
    conceptId: string,
    targetLanguage: string,
    options?: TranslationOptions
  ): Promise<{ flashcards: TranslatedFlashcard[] }> => {
    const headers = await withAuthHeaders();
    return apiClient.fetch(`/api/translation/graphs/${graphId}/lessons/${conceptId}/flashcards`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...headers },
      body: JSON.stringify({
        targetLanguage,
        ...options,
      }),
    });
  },

  /**
   * Get cached translation for a node
   */
  getCachedTranslation: async (
    graphId: string,
    nodeId: string,
    targetLanguage: string
  ): Promise<{ translation: CachedTranslation | null }> => {
    const headers = await withAuthHeaders();
    return apiClient.fetch(
      `/api/translation/graphs/${graphId}/nodes/${nodeId}/cache?language=${targetLanguage}`,
      {
        headers: { 'Content-Type': 'application/json', ...headers },
      }
    );
  },

  /**
   * Check if a translation is stale
   */
  isTranslationStale: async (
    graphId: string,
    nodeId: string,
    targetLanguage: string
  ): Promise<{ isStale: boolean; reason?: string }> => {
    const headers = await withAuthHeaders();
    return apiClient.fetch(
      `/api/translation/graphs/${graphId}/nodes/${nodeId}/stale?language=${targetLanguage}`,
      {
        headers: { 'Content-Type': 'application/json', ...headers },
      }
    );
  },

  /**
   * Invalidate cached translation
   */
  invalidateTranslation: async (
    graphId: string,
    nodeId: string,
    targetLanguage?: string
  ): Promise<{ invalidated: boolean }> => {
    const headers = await withAuthHeaders();
    const query = targetLanguage ? `?language=${targetLanguage}` : '';
    return apiClient.fetch(
      `/api/translation/graphs/${graphId}/nodes/${nodeId}/invalidate${query}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...headers },
      }
    );
  },
};
