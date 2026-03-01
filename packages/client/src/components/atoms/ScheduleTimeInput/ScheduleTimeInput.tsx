/**
 * ScheduleTimeInput Atom Component
 * 
 * A time picker input component for schedule slots.
 */

import React from 'react';
import { cn } from '../../../utils/theme';

export interface ScheduleTimeInputProps {
  /**
   * Label text
   */
  label?: string;
  
  /**
   * Current time value (HH:mm format)
   */
  value?: string;
  
  /**
   * Callback when time changes
   */
  onChange?: (time: string) => void;
  
  /**
   * Error message
   */
  error?: string;
  
  /**
   * Helper text
   */
  helperText?: string;
  
  /**
   * Disable input
   * @default false
   */
  disabled?: boolean;
  
  /**
   * Required field
   * @default false
   */
  required?: boolean;
  
  /**
   * Additional CSS classes
   */
  className?: string;
  
  /**
   * Input ID
   */
  id?: string;
}

export const ScheduleTimeInput: React.FC<ScheduleTimeInputProps> = ({
  label = 'Time',
  value = '',
  onChange,
  error,
  helperText,
  disabled = false,
  required = false,
  className,
  id,
}) => {
  const inputId = id || `time-input-${Math.random().toString(36).substr(2, 9)}`;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const timeValue = e.target.value;
    // Validate HH:mm format
    if (timeValue === '' || /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/.test(timeValue)) {
      onChange?.(timeValue);
    }
  };

  return (
    <div className={cn('w-full', className)}>
      {label && (
        <label
          htmlFor={inputId}
          className={cn(
            'block text-sm font-medium mb-1.5',
            error
              ? 'text-red-600 dark:text-red-400'
              : 'text-gray-700 dark:text-gray-300'
          )}
        >
          {label}
          {required && (
            <span className="text-red-500 ml-1" aria-label="required">
              *
            </span>
          )}
        </label>
      )}
      <input
        id={inputId}
        type="time"
        value={value}
        onChange={handleChange}
        disabled={disabled}
        required={required}
        className={cn(
          'w-full px-4 py-2 border rounded-lg transition-colors duration-200',
          'focus:outline-none focus:ring-2 focus:ring-offset-1',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          error
            ? 'border-red-500 focus:ring-red-500 dark:border-red-400 dark:focus:ring-red-400'
            : 'border-gray-300 dark:border-gray-600 focus:ring-indigo-500 dark:focus:ring-indigo-400',
          'bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100'
        )}
      />
      {error && (
        <p className="mt-1 text-sm text-red-600 dark:text-red-400" role="alert">
          {error}
        </p>
      )}
      {helperText && !error && (
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          {helperText}
        </p>
      )}
    </div>
  );
};

ScheduleTimeInput.displayName = 'ScheduleTimeInput';
