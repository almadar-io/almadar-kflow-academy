/**
 * Unit Tests for TranslationService
 */

import { TranslationService } from '../../../services/translation/TranslationService';
import type { KnowledgeGraphAccessLayer } from '../../../services/knowledgeGraphAccess/KnowledgeGraphAccessLayer';
import * as llmModule from '../../../services/llm';
import {
  extractCodeBlocks,
  restoreCodeBlocks,
  isLanguageSupported,
  getLanguageInfo,
} from '../../../types/translation';

// Mock LLM service
jest.mock('../../../services/llm', () => ({
  callLLM: jest.fn(),
}));

const mockCallLLM = llmModule.callLLM as jest.MockedFunction<typeof llmModule.callLLM>;

describe('TranslationService', () => {
  let translationService: TranslationService;
  let mockAccessLayer: jest.Mocked<KnowledgeGraphAccessLayer>;

  const mockUid = 'user-123';
  const mockGraphId = 'graph-456';
  const mockConceptId = 'concept-789';

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock KnowledgeGraphAccessLayer
    mockAccessLayer = {
      getLessonContentForPublishing: jest.fn().mockResolvedValue({
        content: '# Introduction\n\nThis is a lesson about React.',
        flashCards: [
          { front: 'What is React?', back: 'A JavaScript library for building UIs' },
        ],
      }),
      getCourseSettings: jest.fn().mockResolvedValue({
        title: 'Test Course',
        defaultLanguage: 'en',
      }),
      getGraph: jest.fn().mockResolvedValue({
        id: mockGraphId,
        nodes: {},
        nodeTypes: { Translation: [] },
        relationships: [],
      }),
      getNode: jest.fn().mockResolvedValue({
        id: mockConceptId,
        type: 'Concept',
        properties: { name: 'Test Concept' },
        updatedAt: Date.now() - 1000000,
      }),
      createNode: jest.fn().mockResolvedValue({}),
      updateNode: jest.fn().mockResolvedValue({}),
      createRelationship: jest.fn().mockResolvedValue({}),
    } as unknown as jest.Mocked<KnowledgeGraphAccessLayer>;

    // Mock LLM responses
    mockCallLLM.mockResolvedValue({
      content: 'Contenido traducido',
      raw: {},
      model: 'gpt-4o-mini',
    });

    translationService = new TranslationService(mockAccessLayer);
  });

  // ==================== Helper Function Tests ====================

  describe('extractCodeBlocks', () => {
    it('should extract fenced code blocks', () => {
      const content = `Here is some code:

\`\`\`javascript
const x = 1;
\`\`\`

More text here.`;

      const result = extractCodeBlocks(content);

      expect(result.codeBlocks.length).toBe(1);
      expect(result.codeBlocks[0].language).toBe('javascript');
      expect(result.contentWithPlaceholders).toContain('__CODE_BLOCK_0__');
      expect(result.contentWithPlaceholders).not.toContain('const x = 1');
    });

    it('should extract inline code', () => {
      const content = 'Use the `useState` hook to manage state.';

      const result = extractCodeBlocks(content);

      expect(result.codeBlocks.length).toBe(1);
      expect(result.contentWithPlaceholders).toContain('__CODE_BLOCK_0__');
      expect(result.contentWithPlaceholders).not.toContain('useState');
    });

    it('should handle multiple code blocks', () => {
      const content = `
\`\`\`js
code1
\`\`\`

Some text with \`inline\` code.

\`\`\`python
code2
\`\`\``;

      const result = extractCodeBlocks(content);

      expect(result.codeBlocks.length).toBe(3);
    });
  });

  describe('restoreCodeBlocks', () => {
    it('should restore code blocks from placeholders', () => {
      const originalContent = `Here is code:

\`\`\`javascript
const x = 1;
\`\`\``;

      const { contentWithPlaceholders, codeBlocks } = extractCodeBlocks(originalContent);
      const restored = restoreCodeBlocks(contentWithPlaceholders, codeBlocks);

      expect(restored).toContain('```javascript');
      expect(restored).toContain('const x = 1;');
    });
  });

  describe('isLanguageSupported', () => {
    it('should return true for supported languages', () => {
      expect(isLanguageSupported('en')).toBe(true);
      expect(isLanguageSupported('es')).toBe(true);
      expect(isLanguageSupported('ar')).toBe(true);
      expect(isLanguageSupported('zh')).toBe(true);
    });

    it('should return false for unsupported languages', () => {
      expect(isLanguageSupported('xyz')).toBe(false);
      expect(isLanguageSupported('')).toBe(false);
    });
  });

  describe('getLanguageInfo', () => {
    it('should return language info for supported languages', () => {
      const info = getLanguageInfo('es');
      expect(info?.name).toBe('Spanish');
      expect(info?.nativeName).toBe('Español');
      expect(info?.direction).toBe('ltr');
    });

    it('should return RTL direction for Arabic', () => {
      const info = getLanguageInfo('ar');
      expect(info?.direction).toBe('rtl');
    });

    it('should return null for unsupported languages', () => {
      expect(getLanguageInfo('xyz')).toBeNull();
    });
  });

  // ==================== TranslationService Tests ====================

  describe('translateContent', () => {
    it('should translate simple content', async () => {
      mockCallLLM.mockResolvedValueOnce({
        content: 'Hola mundo',
        raw: {},
        model: 'gpt-4o-mini',
      });

      const result = await translationService.translateContent(
        'Hello world',
        'en',
        'es'
      );

      expect(result.content).toBe('Hola mundo');
      expect(result.sourceLanguage).toBe('en');
      expect(result.targetLanguage).toBe('es');
      expect(result.translationMethod).toBe('ai');
    });

    it('should preserve code blocks during translation', async () => {
      const originalContent = `# Title

Here is some code:

\`\`\`javascript
const greeting = "Hello";
\`\`\`

Please translate the text.`;

      mockCallLLM.mockResolvedValueOnce({
        content: `# Título

Aquí hay algo de código:

__CODE_BLOCK_0__

Por favor traduce el texto.`,
        raw: {},
        model: 'gpt-4o-mini',
      });

      const result = await translationService.translateContent(
        originalContent,
        'en',
        'es',
        { preserveCodeBlocks: true }
      );

      // Code should be preserved
      expect(result.content).toContain('```javascript');
      expect(result.content).toContain('const greeting = "Hello"');
    });

    it('should return same content if source equals target language', async () => {
      const content = 'Hello world';
      
      const result = await translationService.translateContent(content, 'en', 'en');

      expect(result.content).toBe(content);
      expect(mockCallLLM).not.toHaveBeenCalled();
    });

    it('should throw error for unsupported language', async () => {
      await expect(
        translationService.translateContent('Hello', 'en', 'xyz')
      ).rejects.toThrow('Unsupported language');
    });

    it('should retry on failure', async () => {
      mockCallLLM
        .mockRejectedValueOnce(new Error('API Error'))
        .mockResolvedValueOnce({
          content: 'Hola',
          raw: {},
          model: 'gpt-4o-mini',
        });

      const result = await translationService.translateContent(
        'Hello',
        'en',
        'es',
        { maxRetries: 2 }
      );

      expect(result.content).toBe('Hola');
      expect(mockCallLLM).toHaveBeenCalledTimes(2);
    });
  });

  describe('translateLesson', () => {
    it('should translate lesson content', async () => {
      mockCallLLM.mockResolvedValueOnce({
        content: '# Introducción\n\nEsta es una lección sobre React.',
        raw: {},
        model: 'gpt-4o-mini',
      });

      const result = await translationService.translateLesson(
        mockUid,
        mockGraphId,
        mockConceptId,
        'es',
        { cacheInGraph: false }
      );

      expect(result.conceptId).toBe(mockConceptId);
      expect(result.translatedContent).toContain('Introducción');
      expect(result.sourceLanguage).toBe('en');
      expect(result.targetLanguage).toBe('es');
    });

    it('should throw error if lesson content not found', async () => {
      mockAccessLayer.getLessonContentForPublishing.mockResolvedValueOnce(null);

      await expect(
        translationService.translateLesson(mockUid, mockGraphId, mockConceptId, 'es')
      ).rejects.toThrow('Lesson content not found');
    });

    it('should use cached translation if available and not stale', async () => {
      const now = Date.now();
      const cachedTranslation = {
        id: 'trans-1',
        sourceNodeId: mockConceptId,
        sourceNodeType: 'Lesson',
        language: 'es',
        translatedContent: { content: 'Cached content in Spanish' },
        translatedAt: now,
        status: 'approved' as const,
        createdAt: now,
        updatedAt: now,
      };

      const mockGraphWithCache = {
        id: mockGraphId,
        nodes: {
          'trans-1': {
            id: 'trans-1',
            type: 'Translation' as const,
            properties: cachedTranslation,
            createdAt: now,
          },
        },
        nodeTypes: {
          Graph: [],
          Concept: [],
          Layer: [],
          LearningGoal: [],
          Milestone: [],
          PracticeExercise: [],
          Lesson: [],
          ConceptMetadata: [],
          GraphMetadata: [],
          FlashCard: [],
          Translation: ['trans-1'],
        },
        relationships: [],
        seedConceptId: 'seed',
        createdAt: now,
        updatedAt: now,
      };

      // First call: getCachedTranslation
      mockAccessLayer.getGraph.mockResolvedValueOnce(mockGraphWithCache as any);
      
      // Second call: isTranslationStale -> getCachedTranslation
      mockAccessLayer.getGraph.mockResolvedValueOnce(mockGraphWithCache as any);

      // Node older than translation so it's not stale
      const oldNodeTime = now - 100000;
      mockAccessLayer.getNode.mockResolvedValue({
        id: mockConceptId,
        type: 'Concept' as const,
        properties: { name: 'Test' },
        updatedAt: oldNodeTime,
        createdAt: oldNodeTime - 10000,
      });

      const result = await translationService.translateLesson(
        mockUid,
        mockGraphId,
        mockConceptId,
        'es'
      );

      // Should use cached content
      expect(result.translatedContent).toBe('Cached content in Spanish');
      // LLM should not be called
      expect(mockCallLLM).not.toHaveBeenCalled();
    });
  });

  describe('translateFlashcards', () => {
    it('should translate all flashcards', async () => {
      mockCallLLM
        .mockResolvedValueOnce({ content: '¿Qué es React?', raw: {}, model: 'gpt-4o-mini' })
        .mockResolvedValueOnce({ content: 'Una biblioteca de JavaScript para construir interfaces de usuario', raw: {}, model: 'gpt-4o-mini' });

      const result = await translationService.translateFlashcards(
        mockUid,
        mockGraphId,
        mockConceptId,
        'es'
      );

      expect(result.length).toBe(1);
      expect(result[0].translatedFront).toBe('¿Qué es React?');
      expect(result[0].translatedBack).toContain('biblioteca');
    });

    it('should return empty array if no flashcards', async () => {
      mockAccessLayer.getLessonContentForPublishing.mockResolvedValueOnce({
        content: 'Lesson content',
        flashCards: [],
      });

      const result = await translationService.translateFlashcards(
        mockUid,
        mockGraphId,
        mockConceptId,
        'es'
      );

      expect(result).toEqual([]);
    });
  });

  describe('bulkTranslate', () => {
    it('should translate multiple items', async () => {
      mockCallLLM
        .mockResolvedValueOnce({ content: 'Item 1 traducido', raw: {}, model: 'gpt-4o-mini' })
        .mockResolvedValueOnce({ content: 'Item 2 traducido', raw: {}, model: 'gpt-4o-mini' });

      const result = await translationService.bulkTranslate({
        items: [
          { id: '1', content: 'Item 1', type: 'lesson' },
          { id: '2', content: 'Item 2', type: 'description' },
        ],
        sourceLanguage: 'en',
        targetLanguage: 'es',
      });

      expect(result.totalItems).toBe(2);
      expect(result.successCount).toBe(2);
      expect(result.failureCount).toBe(0);
      expect(result.translations[0].translatedContent).toBe('Item 1 traducido');
    });

    it('should handle partial failures', async () => {
      mockCallLLM
        .mockResolvedValueOnce({ content: 'Success', raw: {}, model: 'gpt-4o-mini' })
        .mockRejectedValueOnce(new Error('API Error'))
        .mockRejectedValueOnce(new Error('API Error'))
        .mockRejectedValueOnce(new Error('API Error')); // All retries fail

      const result = await translationService.bulkTranslate({
        items: [
          { id: '1', content: 'Item 1', type: 'lesson' },
          { id: '2', content: 'Item 2', type: 'lesson' },
        ],
        sourceLanguage: 'en',
        targetLanguage: 'es',
      });

      expect(result.successCount).toBe(1);
      expect(result.failureCount).toBe(1);
      expect(result.translations[1].success).toBe(false);
      expect(result.translations[1].error).toBeDefined();
    });
  });

  describe('isTranslationStale', () => {
    it('should return true if no translation exists', async () => {
      const isStale = await translationService.isTranslationStale(
        mockUid,
        mockGraphId,
        mockConceptId,
        'es'
      );

      expect(isStale).toBe(true);
    });

    it('should return true if source updated after translation', async () => {
      const translatedAt = Date.now() - 10000;
      
      mockAccessLayer.getGraph.mockResolvedValueOnce({
        id: mockGraphId,
        nodes: {
          'trans-1': {
            id: 'trans-1',
            type: 'Translation' as const,
            properties: {
              sourceNodeId: mockConceptId,
              language: 'es',
              translatedAt,
            },
            createdAt: translatedAt,
          },
        },
        nodeTypes: {
          Graph: [],
          Concept: [],
          Layer: [],
          LearningGoal: [],
          Milestone: [],
          PracticeExercise: [],
          Lesson: [],
          ConceptMetadata: [],
          GraphMetadata: [],
          FlashCard: [],
          Translation: ['trans-1'],
        },
        relationships: [],
        seedConceptId: 'seed',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      } as any);

      // Source updated after translation
      mockAccessLayer.getNode.mockResolvedValueOnce({
        id: mockConceptId,
        type: 'Concept',
        properties: {},
        updatedAt: Date.now(), // Updated now, after translation
        createdAt: Date.now() - 100000,
      });

      const isStale = await translationService.isTranslationStale(
        mockUid,
        mockGraphId,
        mockConceptId,
        'es'
      );

      expect(isStale).toBe(true);
    });
  });

  describe('getSupportedLanguages', () => {
    it('should return list of supported languages', () => {
      const languages = translationService.getSupportedLanguages();

      expect(languages.length).toBeGreaterThan(0);
      expect(languages.some(l => l.code === 'en')).toBe(true);
      expect(languages.some(l => l.code === 'es')).toBe(true);
      expect(languages.some(l => l.code === 'ar')).toBe(true);
      
      // Check structure
      const english = languages.find(l => l.code === 'en');
      expect(english?.name).toBe('English');
      expect(english?.direction).toBe('ltr');
    });
  });
});
