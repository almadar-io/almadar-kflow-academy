/**
 * TranslationBanner Molecule Component
 * 
 * Shows translation status on content with options to view original,
 * regenerate translation, or switch languages.
 */

import React from 'react';
import { 
  Globe, 
  RefreshCw, 
  Eye, 
  AlertTriangle, 
  Check,
  Clock,
  X,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Button } from '../../atoms/Button';
import { Icon } from '../../atoms/Icon';
import { Typography } from '../../atoms/Typography';
import { cn } from '../../../utils/theme';

export type TranslationStatus = 'translated' | 'stale' | 'translating' | 'error' | 'original';

export interface TranslationBannerProps {
  /**
   * Translation status
   */
  status: TranslationStatus;
  
  /**
   * Source language code
   */
  sourceLanguage: string;
  
  /**
   * Target language code (current view)
   */
  targetLanguage: string;
  
  /**
   * When the translation was last updated
   */
  translatedAt?: Date | number;
  
  /**
   * Callback to view original content
   */
  onViewOriginal?: () => void;
  
  /**
   * Callback to regenerate translation
   */
  onRegenerate?: () => void;
  
  /**
   * Callback to dismiss the banner
   */
  onDismiss?: () => void;
  
  /**
   * Whether regeneration is in progress
   */
  isRegenerating?: boolean;
  
  /**
   * Whether to show the banner compactly
   * @default false
   */
  compact?: boolean;
  
  /**
   * Additional CSS classes
   */
  className?: string;
}

const statusConfig: Record<TranslationStatus, {
  icon: LucideIcon;
  bgColor: string;
  borderColor: string;
  textColor: string;
  message: string;
}> = {
  translated: {
    icon: Check,
    bgColor: 'bg-blue-50 dark:bg-blue-900/20',
    borderColor: 'border-blue-200 dark:border-blue-800',
    textColor: 'text-blue-800 dark:text-blue-200',
    message: 'This content has been translated',
  },
  stale: {
    icon: AlertTriangle,
    bgColor: 'bg-yellow-50 dark:bg-yellow-900/20',
    borderColor: 'border-yellow-200 dark:border-yellow-800',
    textColor: 'text-yellow-800 dark:text-yellow-200',
    message: 'Translation may be outdated',
  },
  translating: {
    icon: RefreshCw,
    bgColor: 'bg-indigo-50 dark:bg-indigo-900/20',
    borderColor: 'border-indigo-200 dark:border-indigo-800',
    textColor: 'text-indigo-800 dark:text-indigo-200',
    message: 'Translating content...',
  },
  error: {
    icon: AlertTriangle,
    bgColor: 'bg-red-50 dark:bg-red-900/20',
    borderColor: 'border-red-200 dark:border-red-800',
    textColor: 'text-red-800 dark:text-red-200',
    message: 'Translation failed',
  },
  original: {
    icon: Globe,
    bgColor: 'bg-gray-50 dark:bg-gray-800',
    borderColor: 'border-gray-200 dark:border-gray-700',
    textColor: 'text-gray-800 dark:text-gray-200',
    message: 'Viewing original content',
  },
};

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

const formatDate = (date: Date | number | undefined) => {
  if (!date) return null;
  const d = date instanceof Date ? date : new Date(date);
  return d.toLocaleDateString(undefined, { 
    month: 'short', 
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export const TranslationBanner: React.FC<TranslationBannerProps> = ({
  status,
  sourceLanguage,
  targetLanguage,
  translatedAt,
  onViewOriginal,
  onRegenerate,
  onDismiss,
  isRegenerating = false,
  compact = false,
  className,
}) => {
  const config = statusConfig[status];
  const isTranslating = status === 'translating' || isRegenerating;
  
  if (compact) {
    return (
      <div className={cn(
        'inline-flex items-center gap-2 px-3 py-1.5 rounded-full',
        config.bgColor,
        config.textColor,
        className
      )}>
        <Icon 
          icon={config.icon} 
          size="sm" 
          className={cn(isTranslating && 'animate-spin')}
        />
        <Typography variant="small" className="font-medium">
          {getLanguageName(sourceLanguage)} → {getLanguageName(targetLanguage)}
        </Typography>
      </div>
    );
  }
  
  return (
    <div className={cn(
      'rounded-lg border p-3',
      config.bgColor,
      config.borderColor,
      config.textColor,
      className
    )}>
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 mt-0.5">
          <Icon 
            icon={config.icon} 
            size="md" 
            className={cn(isTranslating && 'animate-spin')}
          />
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <Typography variant="small" className="font-medium">
              {config.message}
            </Typography>
            <span className="text-xs opacity-75">
              ({getLanguageName(sourceLanguage)} → {getLanguageName(targetLanguage)})
            </span>
          </div>
          
          {translatedAt && status !== 'translating' && (
            <Typography variant="small" className="mt-1 opacity-75 flex items-center gap-1">
              <Icon icon={Clock} size="xs" />
              Last updated: {formatDate(translatedAt)}
            </Typography>
          )}
          
          {(onViewOriginal || onRegenerate) && status !== 'translating' && (
            <div className="mt-2 flex gap-2 flex-wrap">
              {onViewOriginal && status !== 'original' && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={onViewOriginal}
                >
                  <Icon icon={Eye} size="sm" className="mr-1" />
                  View Original
                </Button>
              )}
              {onRegenerate && status !== 'original' && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={onRegenerate}
                  disabled={isRegenerating}
                >
                  <Icon 
                    icon={RefreshCw} 
                    size="sm" 
                    className={cn('mr-1', isRegenerating && 'animate-spin')}
                  />
                  {isRegenerating ? 'Regenerating...' : 'Regenerate'}
                </Button>
              )}
            </div>
          )}
        </div>
        
        {onDismiss && (
          <button
            type="button"
            onClick={onDismiss}
            className={cn(
              'flex-shrink-0 rounded-md p-1 transition-colors',
              'hover:bg-black/10 dark:hover:bg-white/10',
              'focus:outline-none focus:ring-2 focus:ring-offset-2'
            )}
            aria-label="Dismiss"
          >
            <Icon icon={X} size="sm" />
          </button>
        )}
      </div>
    </div>
  );
};

TranslationBanner.displayName = 'TranslationBanner';
