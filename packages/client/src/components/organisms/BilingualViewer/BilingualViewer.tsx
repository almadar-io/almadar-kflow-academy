/**
 * BilingualViewer Organism Component
 * 
 * A side-by-side viewer for original and translated content.
 * Supports tabs for switching between side-by-side and single view.
 */

import React, { useState } from 'react';
import { Columns, RefreshCw } from 'lucide-react';
import { Card } from '../../molecules/Card';
import { Typography } from '../../atoms/Typography';
import { Button } from '../../atoms/Button';
import { Icon } from '../../atoms/Icon';
import { Badge } from '../../atoms/Badge';
import { TranslationBanner } from '../../molecules/TranslationBanner';
import { cn } from '../../../utils/theme';

export type BilingualViewMode = 'side-by-side' | 'original' | 'translated';

export interface BilingualViewerProps {
  /**
   * Original content
   */
  originalContent: string;
  
  /**
   * Translated content
   */
  translatedContent: string;
  
  /**
   * Content title
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
   * Translation timestamp
   */
  translatedAt?: Date | number;
  
  /**
   * Whether translation is stale
   */
  isStale?: boolean;
  
  /**
   * Whether regeneration is in progress
   */
  isRegenerating?: boolean;
  
  /**
   * Initial view mode
   * @default 'side-by-side'
   */
  initialViewMode?: BilingualViewMode;
  
  /**
   * Callback to regenerate translation
   */
  onRegenerate?: () => void;
  
  /**
   * Custom content renderer
   */
  renderContent?: (content: string) => React.ReactNode;
  
  /**
   * Additional CSS classes
   */
  className?: string;
}

// Simple language name map
const languageNames: Record<string, string> = {
  en: 'English',
  es: 'Spanish',
  ar: 'Arabic',
  zh: 'Chinese',
  fr: 'French',
  de: 'German',
  pt: 'Portuguese',
  ja: 'Japanese',
  ko: 'Korean',
  hi: 'Hindi',
  ru: 'Russian',
  it: 'Italian',
};

const getLanguageName = (code: string) => languageNames[code] || code.toUpperCase();

export const BilingualViewer: React.FC<BilingualViewerProps> = ({
  originalContent,
  translatedContent,
  title,
  sourceLanguage,
  targetLanguage,
  translatedAt,
  isStale = false,
  isRegenerating = false,
  initialViewMode = 'side-by-side',
  onRegenerate,
  renderContent,
  className,
}) => {
  const [viewMode, setViewMode] = useState<BilingualViewMode>(initialViewMode);
  
  const tabOptions = [
    { id: 'side-by-side' as const, label: 'Side by Side', icon: Columns },
    { id: 'original' as const, label: getLanguageName(sourceLanguage) },
    { id: 'translated' as const, label: getLanguageName(targetLanguage) },
  ];
  
  const ContentPanel: React.FC<{ content: string; label: string; isRtl?: boolean }> = ({ 
    content, 
    label,
    isRtl = false,
  }) => (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-2 px-1">
        <Badge variant="default" size="sm">{label}</Badge>
      </div>
      <div 
        className={cn(
          'flex-1 p-4 rounded-lg bg-gray-50 dark:bg-gray-800 overflow-auto',
          'prose dark:prose-invert max-w-none'
        )}
        dir={isRtl ? 'rtl' : 'ltr'}
      >
        {renderContent ? renderContent(content) : (
          <div className="whitespace-pre-wrap">{content}</div>
        )}
      </div>
    </div>
  );
  
  const isTargetRtl = ['ar', 'he', 'fa', 'ur'].includes(targetLanguage);
  const isSourceRtl = ['ar', 'he', 'fa', 'ur'].includes(sourceLanguage);
  
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
          
          <TranslationBanner
            status={isStale ? 'stale' : 'translated'}
            sourceLanguage={sourceLanguage}
            targetLanguage={targetLanguage}
            translatedAt={translatedAt}
            onRegenerate={onRegenerate}
            isRegenerating={isRegenerating}
            compact
          />
        </div>
        
        {onRegenerate && !isRegenerating && (
          <Button variant="secondary" size="sm" onClick={onRegenerate}>
            <Icon icon={RefreshCw} size="sm" className="mr-1" />
            Refresh
          </Button>
        )}
      </div>
      
      {/* View Mode Tabs */}
      <div className="mb-4 flex gap-1 p-1 bg-gray-100 dark:bg-gray-800 rounded-lg">
        {tabOptions.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setViewMode(tab.id)}
            className={cn(
              'flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors',
              viewMode === tab.id
                ? 'bg-white dark:bg-gray-700 text-indigo-600 dark:text-indigo-400 shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
            )}
          >
            {tab.icon && <Icon icon={tab.icon} size="sm" />}
            {tab.label}
          </button>
        ))}
      </div>
      
      {/* Content */}
      <div className={cn(
        isRegenerating && 'opacity-50 pointer-events-none'
      )}>
        {viewMode === 'side-by-side' && (
          <div className="grid grid-cols-2 gap-4">
            <ContentPanel 
              content={originalContent} 
              label={getLanguageName(sourceLanguage)}
              isRtl={isSourceRtl}
            />
            <ContentPanel 
              content={translatedContent} 
              label={getLanguageName(targetLanguage)}
              isRtl={isTargetRtl}
            />
          </div>
        )}
        
        {viewMode === 'original' && (
          <ContentPanel 
            content={originalContent} 
            label={getLanguageName(sourceLanguage)}
            isRtl={isSourceRtl}
          />
        )}
        
        {viewMode === 'translated' && (
          <ContentPanel 
            content={translatedContent} 
            label={getLanguageName(targetLanguage)}
            isRtl={isTargetRtl}
          />
        )}
      </div>
    </Card>
  );
};

BilingualViewer.displayName = 'BilingualViewer';





