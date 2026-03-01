/**
 * Translation hooks exports
 */

export {
  // Query hooks
  useSupportedLanguages,
  useCachedTranslation,
  useTranslationStaleness,
  useTranslatedLesson,
  useTranslatedFlashcards,
  
  // Mutation hooks
  useTranslateContent,
  useTranslateLesson,
  useTranslateFlashcards,
  useBulkTranslate,
  useInvalidateTranslation,
  useRegenerateTranslation,
  
  // Types
  type LanguageInfo,
  type TranslatedContent,
  type TranslatedLesson,
  type TranslatedFlashcard,
  type CachedTranslation,
  type TranslationOptions,
  type BulkTranslationItem,
  type BulkTranslationResult,
} from './useTranslation';
