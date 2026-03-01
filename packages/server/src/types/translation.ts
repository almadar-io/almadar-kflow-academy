/**
 * Translation types for the translation service
 */

/**
 * Supported languages with their codes
 */
export const SUPPORTED_LANGUAGES = {
  en: { name: 'English', nativeName: 'English', direction: 'ltr' as const },
  es: { name: 'Spanish', nativeName: 'Español', direction: 'ltr' as const },
  ar: { name: 'Arabic', nativeName: 'العربية', direction: 'rtl' as const },
  zh: { name: 'Chinese', nativeName: '中文', direction: 'ltr' as const },
  fr: { name: 'French', nativeName: 'Français', direction: 'ltr' as const },
  de: { name: 'German', nativeName: 'Deutsch', direction: 'ltr' as const },
  pt: { name: 'Portuguese', nativeName: 'Português', direction: 'ltr' as const },
  ja: { name: 'Japanese', nativeName: '日本語', direction: 'ltr' as const },
  ko: { name: 'Korean', nativeName: '한국어', direction: 'ltr' as const },
  hi: { name: 'Hindi', nativeName: 'हिन्दी', direction: 'ltr' as const },
  ru: { name: 'Russian', nativeName: 'Русский', direction: 'ltr' as const },
  it: { name: 'Italian', nativeName: 'Italiano', direction: 'ltr' as const },
  nl: { name: 'Dutch', nativeName: 'Nederlands', direction: 'ltr' as const },
  tr: { name: 'Turkish', nativeName: 'Türkçe', direction: 'ltr' as const },
  vi: { name: 'Vietnamese', nativeName: 'Tiếng Việt', direction: 'ltr' as const },
  th: { name: 'Thai', nativeName: 'ไทย', direction: 'ltr' as const },
  id: { name: 'Indonesian', nativeName: 'Bahasa Indonesia', direction: 'ltr' as const },
} as const;

export type LanguageCode = keyof typeof SUPPORTED_LANGUAGES;

/**
 * Translation quality tiers
 */
export type TranslationQuality = 'basic' | 'standard' | 'premium';

/**
 * Translation method
 */
export type TranslationMethod = 'ai' | 'manual' | 'hybrid';

/**
 * Translation status
 */
export type TranslationStatus = 'pending' | 'completed' | 'failed' | 'stale';

/**
 * Options for translation
 */
export interface TranslationOptions {
  quality?: TranslationQuality;
  preserveCodeBlocks?: boolean;
  preserveFormatting?: boolean;
  customTerminology?: Record<string, string>;
  maxRetries?: number;
}

/**
 * Translated content result
 */
export interface TranslatedContent {
  content: string;
  sourceLanguage: string;
  targetLanguage: string;
  translatedAt: number;
  translationMethod: TranslationMethod;
  quality: TranslationQuality;
  model?: string;
  tokensUsed?: number;
}

/**
 * Translated lesson content
 */
export interface TranslatedLesson {
  conceptId: string;
  originalContent: string;
  translatedContent: string;
  sourceLanguage: string;
  targetLanguage: string;
  translatedAt: number;
  isStale: boolean;
  sourceVersion?: number;
}

/**
 * Translated flashcard
 */
export interface TranslatedFlashcard {
  id: string;
  originalFront: string;
  originalBack: string;
  translatedFront: string;
  translatedBack: string;
  sourceLanguage: string;
  targetLanguage: string;
  translatedAt: number;
}

/**
 * Translation cache entry (stored in graph as Translation node)
 */
export interface TranslationCacheEntry {
  id: string;
  sourceNodeId: string;
  sourceNodeType: string;
  sourceLanguage: string;
  targetLanguage: string;
  translatedContent: Record<string, string>; // property name -> translated value
  translatedAt: number;
  translationMethod: TranslationMethod;
  quality: TranslationQuality;
  sourceVersion: number;
  isStale: boolean;
  model?: string;
}

/**
 * Bulk translation request
 */
export interface BulkTranslationRequest {
  items: Array<{
    id: string;
    content: string;
    type: 'lesson' | 'flashcard_front' | 'flashcard_back' | 'description';
  }>;
  sourceLanguage: string;
  targetLanguage: string;
  options?: TranslationOptions;
}

/**
 * Bulk translation result
 */
export interface BulkTranslationResult {
  translations: Array<{
    id: string;
    originalContent: string;
    translatedContent: string;
    success: boolean;
    error?: string;
  }>;
  totalItems: number;
  successCount: number;
  failureCount: number;
  translatedAt: number;
}

/**
 * Language config for a course
 */
export interface CourseLanguageConfig {
  primaryLanguage: string;
  supportedLanguages: string[];
  autoTranslateEnabled: boolean;
  translationQuality: TranslationQuality;
  allowStudentTranslation: boolean;
  customTerminology?: Record<string, Record<string, string>>; // language -> term -> translation
}

/**
 * Code block placeholder for preserving code during translation
 */
export interface CodeBlockPlaceholder {
  placeholder: string;
  originalCode: string;
  language?: string;
}

/**
 * Extract code blocks from content and replace with placeholders
 */
export function extractCodeBlocks(content: string): { 
  contentWithPlaceholders: string; 
  codeBlocks: CodeBlockPlaceholder[];
} {
  const codeBlocks: CodeBlockPlaceholder[] = [];
  let index = 0;

  // Match both fenced code blocks (```...```) and inline code (`...`)
  const codeBlockRegex = /```(\w*)\n?([\s\S]*?)```|`([^`]+)`/g;

  const contentWithPlaceholders = content.replace(codeBlockRegex, (match, lang, fencedCode, inlineCode) => {
    const placeholder = `__CODE_BLOCK_${index}__`;
    codeBlocks.push({
      placeholder,
      originalCode: match,
      language: lang || undefined,
    });
    index++;
    return placeholder;
  });

  return { contentWithPlaceholders, codeBlocks };
}

/**
 * Restore code blocks from placeholders
 */
export function restoreCodeBlocks(
  content: string, 
  codeBlocks: CodeBlockPlaceholder[]
): string {
  let result = content;
  
  for (const block of codeBlocks) {
    result = result.replace(block.placeholder, block.originalCode);
  }
  
  return result;
}

/**
 * Check if a language is supported
 */
export function isLanguageSupported(code: string): code is LanguageCode {
  return code in SUPPORTED_LANGUAGES;
}

/**
 * Get language info
 */
export function getLanguageInfo(code: string) {
  if (isLanguageSupported(code)) {
    return SUPPORTED_LANGUAGES[code];
  }
  return null;
}
