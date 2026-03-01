/**
 * Checkbox Atom Component
 * 
 * A checkbox component with label support, indeterminate state, and accessibility.
 */

import React from 'react';
import { Check } from 'lucide-react';
import { cn } from '../../../utils/theme';

export interface CheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type' | 'size'> {
  /**
   * Label text displayed next to the checkbox
   */
  label?: string;
  
  /**
   * Helper text displayed below the checkbox
   */
  helperText?: string;
  
  /**
   * Error message displayed below the checkbox
   */
  error?: string;
  
  /**
   * Indeterminate state (partially checked)
   * @default false
   */
  indeterminate?: boolean;
  
  /**
   * Size of the checkbox
   * @default 'md'
   */
  size?: 'sm' | 'md' | 'lg';
}

export const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  (
    {
      label,
      helperText,
      error,
      indeterminate = false,
      size = 'md',
      className,
      id,
      checked,
      disabled,
      ...props
    },
    ref
  ) => {
    const checkboxId = id || `checkbox-${Math.random().toString(36).substr(2, 9)}`;
    const hasError = !!error;

    const sizeClasses = {
      sm: 'w-4 h-4',
      md: 'w-5 h-5',
      lg: 'w-6 h-6',
    };

    const iconSizeClasses = {
      sm: 'w-3 h-3',
      md: 'w-4 h-4',
      lg: 'w-5 h-5',
    };

    const checkboxRef = React.useRef<HTMLInputElement | null>(null);
    const combinedRef = (node: HTMLInputElement | null) => {
      checkboxRef.current = node;
      if (typeof ref === 'function') {
        ref(node);
      } else if (ref) {
        ref.current = node;
      }
    };

    // Set indeterminate state
    React.useEffect(() => {
      if (checkboxRef.current) {
        checkboxRef.current.indeterminate = indeterminate;
      }
    }, [indeterminate]);

    return (
      <>
        <div className="flex items-start gap-3">
          <div className="relative flex-shrink-0 mt-0.5">
            <input
              ref={combinedRef}
              type="checkbox"
              id={checkboxId}
              checked={checked}
              disabled={disabled}
              className={cn(
                'sr-only peer',
                className
              )}
              aria-invalid={hasError}
              aria-describedby={
                error
                  ? `${checkboxId}-error`
                  : helperText
                  ? `${checkboxId}-helper`
                  : undefined
              }
              {...props}
            />
            <label
              htmlFor={checkboxId}
              className={cn(
                'flex items-center justify-center',
                'border-2 rounded transition-all cursor-pointer',
                sizeClasses[size],
                hasError
                  ? 'border-red-500 peer-focus:ring-red-500/20'
                  : 'border-gray-300 peer-focus:ring-indigo-500/20 dark:border-gray-600',
                checked || indeterminate
                  ? hasError
                    ? 'bg-red-500 border-red-500'
                    : 'bg-indigo-600 border-indigo-600 dark:bg-indigo-500 dark:border-indigo-500'
                  : 'bg-white dark:bg-gray-800',
                'peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-offset-2',
                disabled && 'opacity-50 cursor-not-allowed',
                !disabled && 'hover:border-indigo-500 dark:hover:border-indigo-400'
              )}
            >
              {(checked || indeterminate) && (
                <Check
                  className={cn(
                    'text-white transition-opacity',
                    iconSizeClasses[size],
                    indeterminate && !checked ? 'opacity-50' : 'opacity-100'
                  )}
                  strokeWidth={3}
                />
              )}
            </label>
          </div>
          
          {label && (
            <div className="flex-1 min-w-0">
              <label
                htmlFor={checkboxId}
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
                id={`${checkboxId}-error`}
                className="text-sm text-red-600 dark:text-red-400"
                role="alert"
              >
                {error}
              </p>
            )}
            {!error && helperText && (
              <p
                id={`${checkboxId}-helper`}
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

Checkbox.displayName = 'Checkbox';

