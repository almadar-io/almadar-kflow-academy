/**
 * React Query hooks for translation management
 * 
 * These hooks provide type-safe, cached access to translation data with
 * automatic cache invalidation and optimistic updates.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { translationKeys } from '../../knowledge-graph/hooks/queryKeys';
import {
  translationApi,
  type LanguageInfo,
  type TranslatedContent,
  type TranslatedLesson,
  type TranslatedFlashcard,
  type CachedTranslation,
  type TranslationOptions,
  type BulkTranslationItem,
  type BulkTranslationResult,
} from '../translationApi';

// ============================================================================
// Re-export types
// ============================================================================

export type {
  LanguageInfo,
  TranslatedContent,
  TranslatedLesson,
  TranslatedFlashcard,
  CachedTranslation,
  TranslationOptions,
  BulkTranslationItem,
  BulkTranslationResult,
};

// ============================================================================
// Query Hooks
// ============================================================================

/**
 * Get list of supported languages
 */
export function useSupportedLanguages() {
  return useQuery({
    queryKey: translationKeys.languages(),
    queryFn: async () => {
      const response = await translationApi.getSupportedLanguages();
      return response.languages;
    },
    staleTime: 24 * 60 * 60 * 1000, // Languages rarely change, cache for 24 hours
  });
}

/**
 * Get cached translation for a specific node
 */
export function useCachedTranslation(
  graphId: string | undefined,
  nodeId: string | undefined,
  targetLanguage: string | undefined
) {
  return useQuery({
    queryKey: graphId && nodeId && targetLanguage 
      ? translationKeys.cached(nodeId, targetLanguage)
      : ['disabled'],
    queryFn: async () => {
      const response = await translationApi.getCachedTranslation(graphId!, nodeId!, targetLanguage!);
      return response.translation;
    },
    enabled: !!graphId && !!nodeId && !!targetLanguage,
  });
}

/**
 * Check if a translation is stale
 */
export function useTranslationStaleness(
  graphId: string | undefined,
  nodeId: string | undefined,
  targetLanguage: string | undefined
) {
  return useQuery({
    queryKey: graphId && nodeId && targetLanguage
      ? translationKeys.staleness(graphId, nodeId, targetLanguage)
      : ['disabled'],
    queryFn: async () => {
      const response = await translationApi.isTranslationStale(graphId!, nodeId!, targetLanguage!);
      return response;
    },
    enabled: !!graphId && !!nodeId && !!targetLanguage,
    staleTime: 60 * 1000, // Check staleness every minute
  });
}

/**
 * Get or translate a lesson
 * First checks cache, then translates if needed
 */
export function useTranslatedLesson(
  graphId: string | undefined,
  conceptId: string | undefined,
  targetLanguage: string | undefined,
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: graphId && conceptId && targetLanguage
      ? translationKeys.lesson(graphId, conceptId, targetLanguage)
      : ['disabled'],
    queryFn: async () => {
      // First check cache
      const cached = await translationApi.getCachedTranslation(graphId!, conceptId!, targetLanguage!);
      if (cached.translation) {
        // Check if stale
        const staleness = await translationApi.isTranslationStale(graphId!, conceptId!, targetLanguage!);
        if (!staleness.isStale) {
          return {
            translation: cached.translation,
            fromCache: true,
          };
        }
      }
      
      // Translate if not cached or stale
      const response = await translationApi.translateLesson(graphId!, conceptId!, targetLanguage!);
      return {
        translation: response.translation,
        fromCache: false,
      };
    },
    enabled: (options?.enabled ?? true) && !!graphId && !!conceptId && !!targetLanguage,
  });
}

/**
 * Get or translate flashcards
 */
export function useTranslatedFlashcards(
  graphId: string | undefined,
  conceptId: string | undefined,
  targetLanguage: string | undefined,
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: graphId && conceptId && targetLanguage
      ? translationKeys.flashcards(graphId, conceptId, targetLanguage)
      : ['disabled'],
    queryFn: async () => {
      const response = await translationApi.translateFlashcards(graphId!, conceptId!, targetLanguage!);
      return response.flashcards;
    },
    enabled: (options?.enabled ?? true) && !!graphId && !!conceptId && !!targetLanguage,
  });
}

// ============================================================================
// Mutation Hooks
// ============================================================================

/**
 * Translate arbitrary content
 */
export function useTranslateContent() {
  return useMutation({
    mutationFn: async ({
      content,
      sourceLanguage,
      targetLanguage,
      options,
    }: {
      content: string;
      sourceLanguage: string;
      targetLanguage: string;
      options?: TranslationOptions;
    }) => {
      const response = await translationApi.translateContent(
        content,
        sourceLanguage,
        targetLanguage,
        options
      );
      return response.translation;
    },
  });
}

/**
 * Translate a lesson (with cache update)
 */
export function useTranslateLesson() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({
      graphId,
      conceptId,
      targetLanguage,
      options,
    }: {
      graphId: string;
      conceptId: string;
      targetLanguage: string;
      options?: TranslationOptions;
    }) => {
      const response = await translationApi.translateLesson(
        graphId,
        conceptId,
        targetLanguage,
        options
      );
      return response.translation;
    },
    onSuccess: (data, variables) => {
      // Update cache with new translation
      queryClient.setQueryData(
        translationKeys.lesson(variables.graphId, variables.conceptId, variables.targetLanguage),
        { translation: data, fromCache: false }
      );
      
      // Invalidate staleness check
      queryClient.invalidateQueries({
        queryKey: translationKeys.staleness(
          variables.graphId,
          variables.conceptId,
          variables.targetLanguage
        ),
      });
    },
  });
}

/**
 * Translate flashcards (with cache update)
 */
export function useTranslateFlashcards() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({
      graphId,
      conceptId,
      targetLanguage,
      options,
    }: {
      graphId: string;
      conceptId: string;
      targetLanguage: string;
      options?: TranslationOptions;
    }) => {
      const response = await translationApi.translateFlashcards(
        graphId,
        conceptId,
        targetLanguage,
        options
      );
      return response.flashcards;
    },
    onSuccess: (data, variables) => {
      queryClient.setQueryData(
        translationKeys.flashcards(variables.graphId, variables.conceptId, variables.targetLanguage),
        data
      );
    },
  });
}

/**
 * Bulk translate multiple items
 */
export function useBulkTranslate() {
  return useMutation({
    mutationFn: async ({
      items,
      sourceLanguage,
      targetLanguage,
      options,
    }: {
      items: BulkTranslationItem[];
      sourceLanguage: string;
      targetLanguage: string;
      options?: TranslationOptions;
    }) => {
      const result = await translationApi.bulkTranslate(
        items,
        sourceLanguage,
        targetLanguage,
        options
      );
      return result;
    },
  });
}

/**
 * Invalidate cached translation (force re-translation)
 */
export function useInvalidateTranslation() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({
      graphId,
      nodeId,
      targetLanguage,
    }: {
      graphId: string;
      nodeId: string;
      targetLanguage?: string;
    }) => {
      await translationApi.invalidateTranslation(graphId, nodeId, targetLanguage);
      return { graphId, nodeId, targetLanguage };
    },
    onSuccess: ({ graphId, nodeId, targetLanguage }) => {
      if (targetLanguage) {
        // Invalidate specific translation
        queryClient.invalidateQueries({
          queryKey: translationKeys.cached(nodeId, targetLanguage),
        });
        queryClient.invalidateQueries({
          queryKey: translationKeys.lesson(graphId, nodeId, targetLanguage),
        });
        queryClient.invalidateQueries({
          queryKey: translationKeys.flashcards(graphId, nodeId, targetLanguage),
        });
      } else {
        // Invalidate all translations for this node
        queryClient.invalidateQueries({
          queryKey: ['translation', 'cached', nodeId],
        });
        queryClient.invalidateQueries({
          queryKey: ['translation', 'lesson', graphId, nodeId],
        });
        queryClient.invalidateQueries({
          queryKey: ['translation', 'flashcards', graphId, nodeId],
        });
      }
    },
  });
}

/**
 * Regenerate a stale translation
 */
export function useRegenerateTranslation() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({
      graphId,
      nodeId,
      targetLanguage,
      type,
    }: {
      graphId: string;
      nodeId: string;
      targetLanguage: string;
      type: 'lesson' | 'flashcards';
    }) => {
      // First invalidate
      await translationApi.invalidateTranslation(graphId, nodeId, targetLanguage);
      
      // Then re-translate
      if (type === 'lesson') {
        const response = await translationApi.translateLesson(graphId, nodeId, targetLanguage);
        return { type, data: response.translation };
      } else {
        const response = await translationApi.translateFlashcards(graphId, nodeId, targetLanguage);
        return { type, data: response.flashcards };
      }
    },
    onSuccess: (result, variables) => {
      // Update cache with new translation
      if (result.type === 'lesson') {
        queryClient.setQueryData(
          translationKeys.lesson(variables.graphId, variables.nodeId, variables.targetLanguage),
          { translation: result.data, fromCache: false }
        );
      } else {
        queryClient.setQueryData(
          translationKeys.flashcards(variables.graphId, variables.nodeId, variables.targetLanguage),
          result.data
        );
      }
      
      // Invalidate staleness check
      queryClient.invalidateQueries({
        queryKey: translationKeys.staleness(
          variables.graphId,
          variables.nodeId,
          variables.targetLanguage
        ),
      });
    },
  });
}
