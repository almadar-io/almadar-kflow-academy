/**
 * Radio Atom Component
 * 
 * A radio button component with label support and accessibility.
 */

import React from 'react';
import { cn } from '../../../utils/theme';

export interface RadioProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type' | 'size'> {
  /**
   * Label text displayed next to the radio button
   */
  label?: string;
  
  /**
   * Helper text displayed below the radio button
   */
  helperText?: string;
  
  /**
   * Error message displayed below the radio button
   */
  error?: string;
  
  /**
   * Size of the radio button
   * @default 'md'
   */
  size?: 'sm' | 'md' | 'lg';
}

export const Radio = React.forwardRef<HTMLInputElement, RadioProps>(
  (
    {
      label,
      helperText,
      error,
      size = 'md',
      className,
      id,
      checked,
      disabled,
      ...props
    },
    ref
  ) => {
    const radioId = id || `radio-${Math.random().toString(36).substr(2, 9)}`;
    const hasError = !!error;

    const sizeClasses = {
      sm: 'w-4 h-4',
      md: 'w-5 h-5',
      lg: 'w-6 h-6',
    };

    const dotSizeClasses = {
      sm: 'w-2 h-2',
      md: 'w-2.5 h-2.5',
      lg: 'w-3 h-3',
    };

    return (
      <>
        <div className="flex items-start gap-3">
          <div className="relative flex-shrink-0 mt-0.5">
            <input
              ref={ref}
              type="radio"
              id={radioId}
              checked={checked}
              disabled={disabled}
              className={cn(
                'sr-only peer',
                className
              )}
              aria-invalid={hasError}
              aria-describedby={
                error
                  ? `${radioId}-error`
                  : helperText
                  ? `${radioId}-helper`
                  : undefined
              }
              {...props}
            />
            <label
              htmlFor={radioId}
              className={cn(
                'flex items-center justify-center',
                'border-2 rounded-full transition-all cursor-pointer',
                sizeClasses[size],
                hasError
                  ? 'border-red-500 peer-focus:ring-red-500/20'
                  : 'border-gray-300 peer-focus:ring-indigo-500/20 dark:border-gray-600',
                checked
                  ? hasError
                    ? 'border-red-500'
                    : 'border-indigo-600 dark:border-indigo-500'
                  : '',
                'peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-offset-2',
                disabled && 'opacity-50 cursor-not-allowed',
                !disabled && 'hover:border-indigo-500 dark:hover:border-indigo-400'
              )}
            >
              {checked && (
                <div
                  className={cn(
                    'rounded-full transition-all',
                    dotSizeClasses[size],
                    hasError
                      ? 'bg-red-500'
                      : 'bg-indigo-600 dark:bg-indigo-500'
                  )}
                />
              )}
            </label>
          </div>
          
          {label && (
            <div className="flex-1 min-w-0">
              <label
                htmlFor={radioId}
                className={cn(
                  'block text-sm font-medium cursor-pointer select-none',
                  hasError
                    ? 'text-red-600 dark:text-red-400'
                    : 'text-gray-700 dark:text-gray-300',
                  disabled && 'opacity-50 cursor-not-allowed'
                )}
              >
                {label}
              </label>
            </div>
          )}
        </div>
        
        {(helperText || error) && (
          <div className="mt-1.5 ml-8">
            {error && (
              <p
                id={`${radioId}-error`}
                className="text-sm text-red-600 dark:text-red-400"
                role="alert"
              >
                {error}
              </p>
            )}
            {!error && helperText && (
              <p
                id={`${radioId}-helper`}
                className="text-sm text-gray-500 dark:text-gray-400"
              >
                {helperText}
              </p>
            )}
          </div>
        )}
      </>
    );
  }
);

Radio.displayName = 'Radio';

