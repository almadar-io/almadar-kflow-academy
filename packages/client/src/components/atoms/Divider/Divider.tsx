/**
 * Divider Atom Component
 * 
 * A divider component for separating content sections.
 */

import React from 'react';
import { cn } from '../../../utils/theme';

export type DividerOrientation = 'horizontal' | 'vertical';

export interface DividerProps {
  /**
   * Orientation of the divider
   * @default 'horizontal'
   */
  orientation?: DividerOrientation;
  
  /**
   * Text label to display in the divider
   */
  label?: string;
  
  /**
   * Additional CSS classes
   */
  className?: string;
}

export const Divider: React.FC<DividerProps> = ({
  orientation = 'horizontal',
  label,
  className,
}) => {
  if (orientation === 'vertical') {
    return (
      <div
        className={cn(
          'w-px h-full bg-gray-200 dark:bg-gray-700',
          className
        )}
        role="separator"
        aria-orientation="vertical"
      />
    );
  }

  if (label) {
    return (
      <div
        className={cn('flex items-center gap-3 my-4', className)}
        role="separator"
        aria-label={label}
      >
        <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
        <span className="text-sm text-gray-500 dark:text-gray-400 font-medium">
          {label}
        </span>
        <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
      </div>
    );
  }

  return (
    <div
      className={cn(
        'w-full h-px bg-gray-200 dark:bg-gray-700 my-4',
        className
      )}
      role="separator"
      aria-orientation="horizontal"
    />
  );
};

Divider.displayName = 'Divider';

