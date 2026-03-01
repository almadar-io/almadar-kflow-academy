/**
 * Translation Service
 * 
 * Handles translation of course content using LLM integration.
 * Supports:
 * - Lesson content translation
 * - Flashcard translation
 * - Code block preservation
 * - Translation caching in graph
 * - Staleness detection
 */

import { callLLM } from '../llm';
import type { KnowledgeGraphAccessLayer } from '../knowledgeGraphAccess/KnowledgeGraphAccessLayer';
import {
  createTranslationNode,
  createPublishingRelationship,
  type TranslationNodeProperties,
} from '../../types/nodeBasedKnowledgeGraph';
import {
  type TranslationOptions,
  type TranslatedContent,
  type TranslatedLesson,
  type TranslatedFlashcard,
  type BulkTranslationRequest,
  type BulkTranslationResult,
  type TranslationQuality,
  extractCodeBlocks,
  restoreCodeBlocks,
  isLanguageSupported,
  getLanguageInfo,
  SUPPORTED_LANGUAGES,
} from '../../types/translation';

// Default translation options
const DEFAULT_OPTIONS: Required<TranslationOptions> = {
  quality: 'standard',
  preserveCodeBlocks: true,
  preserveFormatting: true,
  customTerminology: {},
  maxRetries: 2,
};

export class TranslationService {
  constructor(private accessLayer: KnowledgeGraphAccessLayer) {}

  /**
   * Translate content from one language to another
   */
  async translateContent(
    content: string,
    sourceLanguage: string,
    targetLanguage: string,
    options?: TranslationOptions
  ): Promise<TranslatedContent> {
    const opts = { ...DEFAULT_OPTIONS, ...options };

    // Validate languages
    if (!isLanguageSupported(sourceLanguage) || !isLanguageSupported(targetLanguage)) {
      throw new Error(`Unsupported language. Supported: ${Object.keys(SUPPORTED_LANGUAGES).join(', ')}`);
    }

    if (sourceLanguage === targetLanguage) {
      return {
        content,
        sourceLanguage,
        targetLanguage,
        translatedAt: Date.now(),
        translationMethod: 'ai',
        quality: opts.quality,
      };
    }

    // Extract code blocks if needed
    let contentToTranslate = content;
    let codeBlocks: ReturnType<typeof extractCodeBlocks>['codeBlocks'] = [];
    
    if (opts.preserveCodeBlocks) {
      const extracted = extractCodeBlocks(content);
      contentToTranslate = extracted.contentWithPlaceholders;
      codeBlocks = extracted.codeBlocks;
    }

    // Build translation prompt
    const systemPrompt = this.buildTranslationSystemPrompt(
      sourceLanguage,
      targetLanguage,
      opts.quality,
      opts.customTerminology
    );

    const userPrompt = this.buildTranslationUserPrompt(
      contentToTranslate,
      sourceLanguage,
      targetLanguage,
      opts.preserveFormatting
    );

    // Call LLM with retries
    let translatedContent = '';
    let lastError: Error | null = null;
    
    for (let attempt = 0; attempt <= opts.maxRetries; attempt++) {
      try {
        const response = await callLLM({
          systemPrompt,
          userPrompt,
          model: this.getModelForQuality(opts.quality),
        });
        
        translatedContent = this.extractTranslation(response.content);
        break;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Translation failed');
        if (attempt === opts.maxRetries) {
          throw lastError;
        }
        // Wait before retry
        await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
      }
    }

    // Restore code blocks
    if (opts.preserveCodeBlocks && codeBlocks.length > 0) {
      translatedContent = restoreCodeBlocks(translatedContent, codeBlocks);
    }

    return {
      content: translatedContent,
      sourceLanguage,
      targetLanguage,
      translatedAt: Date.now(),
      translationMethod: 'ai',
      quality: opts.quality,
    };
  }

  /**
   * Translate a lesson and optionally cache in graph
   */
  async translateLesson(
    uid: string,
    graphId: string,
    conceptId: string,
    targetLanguage: string,
    options?: TranslationOptions & { cacheInGraph?: boolean }
  ): Promise<TranslatedLesson> {
    // Get lesson content
    const lessonContent = await this.accessLayer.getLessonContentForPublishing(uid, graphId, conceptId);
    if (!lessonContent?.content) {
      throw new Error('Lesson content not found');
    }

    // Get course settings for source language
    const courseSettings = await this.accessLayer.getCourseSettings(uid, graphId);
    const sourceLanguage = courseSettings?.defaultLanguage || 'en';

    // Check cache first
    const cached = await this.getCachedTranslation(uid, graphId, conceptId, targetLanguage);
    if (cached) {
      // Check if cached translation is stale
      const isStale = await this.isTranslationStale(uid, graphId, conceptId, targetLanguage);
      if (!isStale) {
        const cachedContent = cached.translatedContent as Record<string, string>;
        return {
          conceptId,
          originalContent: lessonContent.content,
          translatedContent: cachedContent.content || '',
          sourceLanguage,
          targetLanguage,
          translatedAt: cached.translatedAt,
          isStale: false,
        };
      }
    }

    // Translate
    const translated = await this.translateContent(
      lessonContent.content,
      sourceLanguage,
      targetLanguage,
      options
    );

    // Cache in graph if requested
    if (options?.cacheInGraph !== false) {
      await this.cacheTranslation(
        uid,
        graphId,
        conceptId,
        'Lesson',
        { content: translated.content },
        sourceLanguage,
        targetLanguage,
        options?.quality || 'standard'
      );
    }

    return {
      conceptId,
      originalContent: lessonContent.content,
      translatedContent: translated.content,
      sourceLanguage,
      targetLanguage,
      translatedAt: translated.translatedAt,
      isStale: false,
    };
  }

  /**
   * Translate flashcards for a concept
   */
  async translateFlashcards(
    uid: string,
    graphId: string,
    conceptId: string,
    targetLanguage: string,
    options?: TranslationOptions
  ): Promise<TranslatedFlashcard[]> {
    // Get flashcards
    const lessonContent = await this.accessLayer.getLessonContentForPublishing(uid, graphId, conceptId);
    if (!lessonContent?.flashCards || lessonContent.flashCards.length === 0) {
      return [];
    }

    // Get source language
    const courseSettings = await this.accessLayer.getCourseSettings(uid, graphId);
    const sourceLanguage = courseSettings?.defaultLanguage || 'en';

    const translatedFlashcards: TranslatedFlashcard[] = [];

    for (let i = 0; i < lessonContent.flashCards.length; i++) {
      const flashcard = lessonContent.flashCards[i];
      
      // Translate front and back
      const [translatedFront, translatedBack] = await Promise.all([
        this.translateContent(flashcard.front, sourceLanguage, targetLanguage, options),
        this.translateContent(flashcard.back, sourceLanguage, targetLanguage, options),
      ]);

      translatedFlashcards.push({
        id: `${conceptId}-flashcard-${i}`,
        originalFront: flashcard.front,
        originalBack: flashcard.back,
        translatedFront: translatedFront.content,
        translatedBack: translatedBack.content,
        sourceLanguage,
        targetLanguage,
        translatedAt: Date.now(),
      });
    }

    return translatedFlashcards;
  }

  /**
   * Bulk translate multiple items
   */
  async bulkTranslate(
    request: BulkTranslationRequest
  ): Promise<BulkTranslationResult> {
    const results: BulkTranslationResult['translations'] = [];
    let successCount = 0;
    let failureCount = 0;

    for (const item of request.items) {
      try {
        const translated = await this.translateContent(
          item.content,
          request.sourceLanguage,
          request.targetLanguage,
          request.options
        );
        
        results.push({
          id: item.id,
          originalContent: item.content,
          translatedContent: translated.content,
          success: true,
        });
        successCount++;
      } catch (error) {
        results.push({
          id: item.id,
          originalContent: item.content,
          translatedContent: '',
          success: false,
          error: error instanceof Error ? error.message : 'Translation failed',
        });
        failureCount++;
      }
    }

    return {
      translations: results,
      totalItems: request.items.length,
      successCount,
      failureCount,
      translatedAt: Date.now(),
    };
  }

  /**
   * Check if a translation is stale
   */
  async isTranslationStale(
    uid: string,
    graphId: string,
    sourceNodeId: string,
    targetLanguage: string
  ): Promise<boolean> {
    const cached = await this.getCachedTranslation(uid, graphId, sourceNodeId, targetLanguage);
    if (!cached) {
      return true; // No translation exists
    }

    // Get source node's updated timestamp
    const sourceNode = await this.accessLayer.getNode(uid, graphId, sourceNodeId);
    if (!sourceNode) {
      return true;
    }

    // Check if source was updated after translation
    const sourceUpdatedAt = sourceNode.updatedAt || 0;
    return sourceUpdatedAt > cached.translatedAt;
  }

  /**
   * Get cached translation from graph
   */
  async getCachedTranslation(
    uid: string,
    graphId: string,
    sourceNodeId: string,
    targetLanguage: string
  ): Promise<TranslationNodeProperties | null> {
    const graph = await this.accessLayer.getGraph(uid, graphId);
    
    // Find translation node
    const translationIds = graph.nodeTypes.Translation || [];
    
    for (const translationId of translationIds) {
      const node = graph.nodes[translationId];
      if (!node || node.type !== 'Translation') continue;
      
      const props = node.properties as TranslationNodeProperties;
      if (props.sourceNodeId === sourceNodeId && props.language === targetLanguage) {
        // Check staleness
        const sourceNode = graph.nodes[sourceNodeId];
        const isStale = sourceNode ? (sourceNode.updatedAt || 0) > props.translatedAt : false;
        
        return {
          ...props,
          status: isStale ? 'draft' : props.status, // Mark as draft if stale
        };
      }
    }

    return null;
  }

  /**
   * Cache translation in graph
   */
  async cacheTranslation(
    uid: string,
    graphId: string,
    sourceNodeId: string,
    sourceNodeType: string,
    translatedContent: Record<string, string>,
    _sourceLanguage: string,
    targetLanguage: string,
    quality: TranslationQuality
  ): Promise<void> {
    // Create translation node
    const translationNode = createTranslationNode(
      sourceNodeId,
      sourceNodeType as any,
      targetLanguage,
      translatedContent,
      {
        translatedBy: 'ai',
        aiModel: this.getModelForQuality(quality),
        status: 'approved',
        quality: quality === 'premium' ? 100 : quality === 'standard' ? 80 : 60,
      }
    );

    // Check if translation already exists
    const existing = await this.getCachedTranslation(uid, graphId, sourceNodeId, targetLanguage);
    
    if (existing) {
      // Update existing translation
      await this.accessLayer.updateNode(uid, graphId, existing.id, {
        properties: {
          ...existing,
          translatedContent,
          translatedAt: Date.now(),
          status: 'approved',
        },
      });
    } else {
      // Create new translation
      await this.accessLayer.createNode(uid, graphId, translationNode);
      
      // Create relationship
      const relationship = createPublishingRelationship(
        sourceNodeId,
        translationNode.id,
        'hasTranslation'
      );
      await this.accessLayer.createRelationship(uid, graphId, relationship);
    }
  }

  /**
   * Get supported languages
   */
  getSupportedLanguages(): Array<{ code: string; name: string; nativeName: string; direction: 'ltr' | 'rtl' }> {
    return Object.entries(SUPPORTED_LANGUAGES).map(([code, info]) => ({
      code,
      ...info,
    }));
  }

  /**
   * Invalidate cached translation
   */
  async invalidateTranslation(
    uid: string,
    graphId: string,
    sourceNodeId: string,
    targetLanguage?: string
  ): Promise<void> {
    const graph = await this.accessLayer.getGraph(uid, graphId);
    const translationIds = graph.nodeTypes.Translation || [];
    
    for (const translationId of translationIds) {
      const node = graph.nodes[translationId];
      if (!node || node.type !== 'Translation') continue;
      
      const props = node.properties as TranslationNodeProperties;
      if (props.sourceNodeId === sourceNodeId) {
        if (!targetLanguage || props.language === targetLanguage) {
          // Mark as stale
          await this.accessLayer.updateNode(uid, graphId, translationId, {
            properties: {
              ...props,
              status: 'draft',
            },
          });
        }
      }
    }
  }

  // ==================== Private Helper Methods ====================

  /**
   * Build system prompt for translation
   */
  private buildTranslationSystemPrompt(
    sourceLanguage: string,
    targetLanguage: string,
    quality: TranslationQuality,
    customTerminology?: Record<string, string>
  ): string {
    const sourceInfo = getLanguageInfo(sourceLanguage);
    const targetInfo = getLanguageInfo(targetLanguage);
    
    let prompt = `You are a professional translator specializing in educational content.
Your task is to translate text from ${sourceInfo?.name || sourceLanguage} to ${targetInfo?.name || targetLanguage}.

Translation guidelines:
- Maintain the original meaning and context
- Preserve all markdown formatting (headers, lists, bold, italic, links)
- Keep technical terms accurate
- Ensure the translation sounds natural in the target language
- Preserve any placeholders like __CODE_BLOCK_N__`;

    if (quality === 'premium') {
      prompt += `
- Use sophisticated vocabulary appropriate for advanced learners
- Pay special attention to idiomatic expressions
- Ensure cultural appropriateness`;
    } else if (quality === 'basic') {
      prompt += `
- Use simple, clear language
- Prioritize clarity over elegance`;
    }

    if (customTerminology && Object.keys(customTerminology).length > 0) {
      prompt += `

Custom terminology to use:`;
      for (const [term, translation] of Object.entries(customTerminology)) {
        prompt += `\n- "${term}" → "${translation}"`;
      }
    }

    prompt += `

IMPORTANT: Return ONLY the translated text, without any additional explanation or commentary.`;

    return prompt;
  }

  /**
   * Build user prompt for translation
   */
  private buildTranslationUserPrompt(
    content: string,
    sourceLanguage: string,
    targetLanguage: string,
    preserveFormatting: boolean
  ): string {
    const sourceInfo = getLanguageInfo(sourceLanguage);
    const targetInfo = getLanguageInfo(targetLanguage);

    let prompt = `Translate the following ${sourceInfo?.name || sourceLanguage} text to ${targetInfo?.name || targetLanguage}`;
    
    if (preserveFormatting) {
      prompt += ` while preserving all markdown formatting`;
    }
    
    prompt += `:\n\n${content}`;

    return prompt;
  }

  /**
   * Extract translation from LLM response
   */
  private extractTranslation(response: string): string {
    // The response should be just the translation
    // Remove any markdown code blocks if LLM wrapped it
    let translation = response.trim();
    
    // Remove markdown code block wrapper if present
    const codeBlockMatch = translation.match(/^```(?:\w*\n)?([\s\S]*?)```$/);
    if (codeBlockMatch) {
      translation = codeBlockMatch[1].trim();
    }

    return translation;
  }

  /**
   * Get appropriate model for quality tier
   */
  private getModelForQuality(quality: TranslationQuality): string {
    switch (quality) {
      case 'premium':
        return 'gpt-4o'; // Best quality
      case 'standard':
        return 'gpt-4o-mini'; // Good balance
      case 'basic':
      default:
        return 'gpt-4o-mini'; // Cost effective
    }
  }
}
