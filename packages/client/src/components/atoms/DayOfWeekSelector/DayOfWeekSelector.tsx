/**
 * DayOfWeekSelector Atom Component
 * 
 * A dropdown selector for selecting day of the week.
 */

import React from 'react';
import { SelectDropdown, SelectOption } from '../../molecules/SelectDropdown';
import { cn } from '../../../utils/theme';

export type DayOfWeek = '0' | '1' | '2' | '3' | '4' | '5' | '6';

export interface DayOfWeekSelectorProps {
  /**
   * Label text
   */
  label?: string;
  
  /**
   * Selected day value (0-6, where 0 is Sunday)
   */
  value?: DayOfWeek;
  
  /**
   * Callback when day changes
   */
  onChange?: (day: DayOfWeek) => void;
  
  /**
   * Error message
   */
  error?: string;
  
  /**
   * Helper text
   */
  helperText?: string;
  
  /**
   * Disable selector
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
   * Selector ID
   */
  id?: string;
}

const dayOptions: SelectOption[] = [
  { value: '0', label: 'Sunday' },
  { value: '1', label: 'Monday' },
  { value: '2', label: 'Tuesday' },
  { value: '3', label: 'Wednesday' },
  { value: '4', label: 'Thursday' },
  { value: '5', label: 'Friday' },
  { value: '6', label: 'Saturday' },
];

export const DayOfWeekSelector: React.FC<DayOfWeekSelectorProps> = ({
  label = 'Day of Week',
  value,
  onChange,
  error,
  helperText,
  disabled = false,
  required = false,
  className,
  id,
}) => {
  const handleChange = (selectedValue: string | string[]) => {
    if (typeof selectedValue === 'string') {
      onChange?.(selectedValue as DayOfWeek);
    }
  };

  return (
    <div className={cn('w-full', className)}>
      {label && (
        <label
          htmlFor={id}
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
      <SelectDropdown
        options={dayOptions}
        value={value}
        onChange={handleChange}
        placeholder="Select day"
        disabled={disabled}
        searchable={false}
        className={cn(error && 'border-red-500')}
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

DayOfWeekSelector.displayName = 'DayOfWeekSelector';
