/**
 * TranslatedContentViewer Organism Component
 * 
 * A viewer for translated content with toggle to switch between
 * original and translated versions.
 */

import React, { useState } from 'react';
import { Languages, RefreshCw } from 'lucide-react';
import { Card } from '../../molecules/Card';
import { Typography } from '../../atoms/Typography';
import { Button } from '../../atoms/Button';
import { Icon } from '../../atoms/Icon';
import { TranslationBanner } from '../../molecules/TranslationBanner';
import { LanguageSelector, LanguageOption, DEFAULT_LANGUAGES } from '../../molecules/LanguageSelector';
import { cn } from '../../../utils/theme';

export interface TranslatedContentViewerProps {
  /**
   * Original content
   */
  originalContent: string;
  
  /**
   * Translated content
   */
  translatedContent?: string;
  
  /**
   * Original content title
   */
  title?: string;
  
  /**
   * Source language code
   */
  sourceLanguage: string;
  
  /**
   * Target language code
   */
  targetLanguage: string;
  
  /**
   * Available languages
   */
  availableLanguages?: LanguageOption[];
  
  /**
   * Translation timestamp
   */
  translatedAt?: Date | number;
  
  /**
   * Whether translation is stale
   */
  isStale?: boolean;
  
  /**
   * Whether translation is loading
   */
  isTranslating?: boolean;
  
  /**
   * Callback when language changes
   */
  onLanguageChange?: (code: string) => void;
  
  /**
   * Callback to regenerate translation
   */
  onRegenerate?: () => void;
  
  /**
   * Custom content renderer (for markdown, etc.)
   */
  renderContent?: (content: string) => React.ReactNode;
  
  /**
   * Show language selector
   * @default true
   */
  showLanguageSelector?: boolean;
  
  /**
   * Additional CSS classes
   */
  className?: string;
}

export const TranslatedContentViewer: React.FC<TranslatedContentViewerProps> = ({
  originalContent,
  translatedContent,
  title,
  sourceLanguage,
  targetLanguage,
  availableLanguages = DEFAULT_LANGUAGES,
  translatedAt,
  isStale = false,
  isTranslating = false,
  onLanguageChange,
  onRegenerate,
  renderContent,
  showLanguageSelector = true,
  className,
}) => {
  const [showOriginal, setShowOriginal] = useState(false);
  
  const isViewingOriginal = showOriginal || sourceLanguage === targetLanguage;
  const currentContent = isViewingOriginal ? originalContent : (translatedContent || originalContent);
  
  const getTranslationStatus = () => {
    if (isTranslating) return 'translating';
    if (sourceLanguage === targetLanguage) return 'original';
    if (!translatedContent) return 'error';
    if (isStale) return 'stale';
    return 'translated';
  };
  
  return (
    <Card className={cn('', className)}>
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-4">
        <div className="flex-1">
          {title && (
            <Typography variant="h5" className="mb-2">
              {title}
            </Typography>
          )}
          
          {sourceLanguage !== targetLanguage && (
            <TranslationBanner
              status={getTranslationStatus()}
              sourceLanguage={sourceLanguage}
              targetLanguage={targetLanguage}
              translatedAt={translatedAt}
              onViewOriginal={!isViewingOriginal ? () => setShowOriginal(true) : undefined}
              onRegenerate={onRegenerate}
              isRegenerating={isTranslating}
              compact
            />
          )}
        </div>
        
        {showLanguageSelector && (
          <div className="w-48 flex-shrink-0">
            <LanguageSelector
              languages={availableLanguages}
              value={targetLanguage}
              onChange={onLanguageChange}
              size="sm"
              showNativeName={false}
            />
          </div>
        )}
      </div>
      
      {/* Content */}
      <div className={cn(
        'prose dark:prose-invert max-w-none',
        isTranslating && 'opacity-50'
      )}>
        {renderContent ? (
          renderContent(currentContent)
        ) : (
          <div className="whitespace-pre-wrap">{currentContent}</div>
        )}
      </div>
      
      {/* Footer: Toggle original */}
      {sourceLanguage !== targetLanguage && translatedContent && !isTranslating && (
        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowOriginal(!showOriginal)}
          >
            <Icon icon={Languages} size="sm" className="mr-2" />
            {showOriginal ? 'View Translation' : 'View Original'}
          </Button>
        </div>
      )}
    </Card>
  );
};

TranslatedContentViewer.displayName = 'TranslatedContentViewer';





