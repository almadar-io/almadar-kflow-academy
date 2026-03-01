/**
 * TextHighlight Atom Component
 * 
 * A styled span component for highlighting text with annotations (questions or notes).
 * Uses different colors for different annotation types:
 * - Questions: Blue highlight
 * - Notes: Yellow highlight
 */

import React from 'react';
import { cn } from '../../../utils/theme';

export type HighlightType = 'question' | 'note';

export interface TextHighlightProps {
  /**
   * Type of highlight (determines color)
   */
  type: HighlightType;
  
  /**
   * Whether the highlight is currently active/focused
   * @default false
   */
  isActive?: boolean;
  
  /**
   * Callback when highlight is clicked
   */
  onClick?: () => void;
  
  /**
   * Callback when highlight is hovered
   */
  onMouseEnter?: () => void;
  
  /**
   * Callback when hover ends
   */
  onMouseLeave?: () => void;
  
  /**
   * Unique ID for the annotation
   */
  annotationId?: string;
  
  /**
   * Additional CSS classes
   */
  className?: string;
  
  /**
   * Highlighted text content
   */
  children: React.ReactNode;
}

/**
 * TextHighlight component for rendering highlighted text annotations
 */
export const TextHighlight: React.FC<TextHighlightProps> = ({
  type,
  isActive = false,
  onClick,
  onMouseEnter,
  onMouseLeave,
  annotationId,
  className,
  children,
}) => {
  const baseStyles = 'cursor-pointer rounded-sm transition-all duration-150';
  
  const typeStyles = {
    question: cn(
      // Blue for questions
      'bg-blue-100 dark:bg-blue-900/40',
      'hover:bg-blue-200 dark:hover:bg-blue-800/50',
      isActive && 'bg-blue-300 dark:bg-blue-700/60 ring-2 ring-blue-500 dark:ring-blue-400'
    ),
    note: cn(
      // Yellow for notes
      'bg-yellow-100 dark:bg-yellow-900/40',
      'hover:bg-yellow-200 dark:hover:bg-yellow-800/50',
      isActive && 'bg-yellow-300 dark:bg-yellow-700/60 ring-2 ring-yellow-500 dark:ring-yellow-400'
    ),
  };

  return (
    <span
      data-highlight="true"
      data-highlight-type={type}
      data-annotation-id={annotationId}
      className={cn(baseStyles, typeStyles[type], className)}
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick?.();
        }
      }}
    >
      {children}
    </span>
  );
};

TextHighlight.displayName = 'TextHighlight';

