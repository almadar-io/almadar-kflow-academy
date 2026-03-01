/**
 * Translation services
 */

export { TranslationService } from './TranslationService';

// Re-export types
export type {
  TranslationOptions,
  TranslatedContent,
  TranslatedLesson,
  TranslatedFlashcard,
  BulkTranslationRequest,
  BulkTranslationResult,
  TranslationQuality,
  TranslationMethod,
  TranslationStatus,
  LanguageCode,
  CourseLanguageConfig,
  TranslationCacheEntry,
  CodeBlockPlaceholder,
} from '../../types/translation';

export {
  SUPPORTED_LANGUAGES,
  extractCodeBlocks,
  restoreCodeBlocks,
  isLanguageSupported,
  getLanguageInfo,
} from '../../types/translation';
