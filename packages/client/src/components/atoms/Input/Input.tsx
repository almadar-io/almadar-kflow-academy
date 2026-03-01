/**
 * Input Atom Component
 * 
 * A versatile input component with support for labels, errors, icons, and helper text.
 * Fully accessible with proper ARIA attributes.
 */

import React from 'react';
import { X } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export type InputType = 'text' | 'email' | 'password' | 'number' | 'search' | 'url' | 'tel';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  /**
   * Input type
   * @default 'text'
   */
  type?: InputType;
  
  /**
   * Label text (rendered above input)
   */
  label?: string;
  
  /**
   * Helper text (rendered below input)
   */
  helperText?: string;
  
  /**
   * Error message (rendered below input, overrides helperText)
   */
  error?: string;
  
  /**
   * Icon to display on the left side
   */
  icon?: LucideIcon;
  
  /**
   * Icon to display on the right side
   */
  iconRight?: LucideIcon;
  
  /**
   * Show clear button
   * @default false
   */
  clearable?: boolean;
  
  /**
   * Callback when clear button is clicked
   */
  onClear?: () => void;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(({
  type = 'text',
  label,
  helperText,
  error,
  icon: Icon,
  iconRight: IconRight,
  clearable = false,
  onClear,
  className = '',
  id,
  disabled,
  ...props
}, ref) => {
  const inputId = id || `input-${Math.random().toString(36).substr(2, 9)}`;
  const hasError = !!error;
  const showClearButton = clearable && props.value && !disabled;

  const baseInputStyles = 'w-full px-4 py-2 border rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed';
  
  const inputStyles = [
    baseInputStyles,
    hasError
      ? 'border-red-300 focus:border-red-500 focus:ring-red-500 dark:border-red-700 dark:focus:border-red-500'
      : 'border-gray-300 focus:border-indigo-500 focus:ring-indigo-500 dark:border-gray-600 dark:focus:border-indigo-500',
    'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100',
    Icon ? 'pl-10' : '',
    (IconRight || showClearButton) ? 'pr-10' : '',
    className,
  ].filter(Boolean).join(' ');

  return (
    <div className="w-full">
      {label && (
        <label
          htmlFor={inputId}
          className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
        >
          {label}
        </label>
      )}
      
      <div className="relative">
        {Icon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 pointer-events-none">
            <Icon size={18} />
          </div>
        )}
        
        <input
          ref={ref}
          id={inputId}
          type={type}
          className={inputStyles}
          disabled={disabled}
          aria-invalid={hasError}
          aria-describedby={
            error ? `${inputId}-error` : helperText ? `${inputId}-helper` : undefined
          }
          {...props}
        />
        
        {showClearButton && (
          <button
            type="button"
            onClick={onClear}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 transition-colors"
            aria-label="Clear input"
          >
            <X size={18} />
          </button>
        )}
        
        {!showClearButton && IconRight && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 pointer-events-none">
            <IconRight size={18} />
          </div>
        )}
      </div>
      
      {(error || helperText) && (
        <div className="mt-1.5">
          {error ? (
            <p
              id={`${inputId}-error`}
              className="text-sm text-red-600 dark:text-red-400"
              role="alert"
            >
              {error}
            </p>
          ) : (
            <p
              id={`${inputId}-helper`}
              className="text-sm text-gray-500 dark:text-gray-400"
            >
              {helperText}
            </p>
          )}
        </div>
      )}
    </div>
  );
});

Input.displayName = 'Input';

export default Input;

