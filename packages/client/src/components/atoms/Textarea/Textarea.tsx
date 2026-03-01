/**
 * Textarea Atom Component
 * 
 * A textarea component with auto-resize, character counter, and validation states.
 */

import React, { useRef, useEffect } from 'react';
import { cn } from '../../../utils/theme';

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  /**
   * Label text displayed above the textarea
   */
  label?: string;
  
  /**
   * Helper text displayed below the textarea
   */
  helperText?: string;
  
  /**
   * Error message displayed below the textarea
   */
  error?: string;
  
  /**
   * Show character counter
   * @default false
   */
  showCounter?: boolean;
  
  /**
   * Maximum character count (used with showCounter)
   */
  maxLength?: number;
  
  /**
   * Auto-resize textarea to fit content
   * @default false
   */
  autoResize?: boolean;
  
  /**
   * Minimum number of rows
   * @default 3
   */
  minRows?: number;
  
  /**
   * Maximum number of rows (for auto-resize)
   */
  maxRows?: number;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  (
    {
      label,
      helperText,
      error,
      showCounter = false,
      maxLength,
      autoResize = false,
      minRows = 3,
      maxRows,
      className,
      id,
      value,
      onChange,
      ...props
    },
    ref
  ) => {
    const textareaRef = useRef<HTMLTextAreaElement | null>(null);
    const combinedRef = (node: HTMLTextAreaElement | null) => {
      textareaRef.current = node;
      if (typeof ref === 'function') {
        ref(node);
      } else if (ref) {
        ref.current = node;
      }
    };

    const currentLength = typeof value === 'string' ? value.length : 0;
    const hasError = !!error;
    const textareaId = id || `textarea-${Math.random().toString(36).substr(2, 9)}`;

    // Auto-resize functionality
    useEffect(() => {
      if (autoResize && textareaRef.current) {
        const textarea = textareaRef.current;
        
        const resize = () => {
          textarea.style.height = 'auto';
          const scrollHeight = textarea.scrollHeight;
          const lineHeight = parseInt(getComputedStyle(textarea).lineHeight) || 24;
          const minHeight = minRows * lineHeight;
          const maxHeight = maxRows ? maxRows * lineHeight : Infinity;
          
          const newHeight = Math.min(Math.max(scrollHeight, minHeight), maxHeight);
          textarea.style.height = `${newHeight}px`;
        };

        resize();
        
        if (onChange) {
          // Store original onChange
          const originalOnChange = onChange;
          onChange = ((e: React.ChangeEvent<HTMLTextAreaElement>) => {
            originalOnChange(e);
            setTimeout(resize, 0);
          }) as typeof onChange;
        }
      }
    }, [autoResize, minRows, maxRows, value, onChange]);

    const baseClasses = cn(
      'w-full px-3 py-2 rounded-lg border transition-colors',
      'focus:outline-none focus:ring-2 focus:ring-offset-0',
      'disabled:opacity-50 disabled:cursor-not-allowed',
      'resize-none',
      hasError
        ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20 dark:border-red-500 dark:focus:border-red-500'
        : 'border-gray-300 focus:border-indigo-500 focus:ring-indigo-500/20 dark:border-gray-600 dark:focus:border-indigo-500',
      'bg-white dark:bg-gray-800',
      'text-gray-900 dark:text-gray-100',
      'placeholder:text-gray-400 dark:placeholder:text-gray-500',
      className
    );

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={textareaId}
            className={cn(
              'block text-sm font-medium mb-1.5',
              hasError
                ? 'text-red-600 dark:text-red-400'
                : 'text-gray-700 dark:text-gray-300'
            )}
          >
            {label}
          </label>
        )}
        
        <textarea
          ref={combinedRef}
          id={textareaId}
          value={value}
          onChange={onChange}
          maxLength={maxLength}
          rows={autoResize ? minRows : undefined}
          className={baseClasses}
          aria-invalid={hasError}
          aria-describedby={
            error
              ? `${textareaId}-error`
              : helperText
              ? `${textareaId}-helper`
              : undefined
          }
          {...props}
        />
        
        {(helperText || error || showCounter) && (
          <div className="mt-1.5 flex items-center justify-between">
            <div className="flex-1">
              {error && (
                <p
                  id={`${textareaId}-error`}
                  className="text-sm text-red-600 dark:text-red-400"
                  role="alert"
                >
                  {error}
                </p>
              )}
              {!error && helperText && (
                <p
                  id={`${textareaId}-helper`}
                  className="text-sm text-gray-500 dark:text-gray-400"
                >
                  {helperText}
                </p>
              )}
            </div>
            
            {showCounter && maxLength && (
              <span
                className={cn(
                  'text-sm ml-2',
                  currentLength >= maxLength
                    ? 'text-red-600 dark:text-red-400'
                    : 'text-gray-500 dark:text-gray-400'
                )}
              >
                {currentLength}/{maxLength}
              </span>
            )}
          </div>
        )}
      </div>
    );
  }
);

Textarea.displayName = 'Textarea';

