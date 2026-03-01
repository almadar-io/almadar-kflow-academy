/**
 * Spinner Atom Component
 * 
 * A loading spinner component with multiple variants and sizes.
 */

import React from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '../../../utils/theme';

export type SpinnerVariant = 'circular' | 'dots' | 'pulse';
export type SpinnerSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';
export type SpinnerColor = 'primary' | 'white' | 'gray';

export interface SpinnerProps {
  /**
   * Spinner variant
   * @default 'circular'
   */
  variant?: SpinnerVariant;
  
  /**
   * Size of the spinner
   * @default 'md'
   */
  size?: SpinnerSize;
  
  /**
   * Color of the spinner
   * @default 'primary'
   */
  color?: SpinnerColor;
  
  /**
   * Additional CSS classes
   */
  className?: string;
  
  /**
   * Accessibility label
   * @default 'Loading'
   */
  'aria-label'?: string;
}

const sizeClasses: Record<SpinnerSize, string> = {
  xs: 'w-3 h-3',
  sm: 'w-4 h-4',
  md: 'w-5 h-5',
  lg: 'w-6 h-6',
  xl: 'w-8 h-8',
};

const colorClasses: Record<SpinnerColor, string> = {
  primary: 'text-indigo-600 dark:text-indigo-500',
  white: 'text-white',
  gray: 'text-gray-400 dark:text-gray-500',
};

const dotSizeClasses: Record<SpinnerSize, string> = {
  xs: 'w-1 h-1',
  sm: 'w-1.5 h-1.5',
  md: 'w-2 h-2',
  lg: 'w-2.5 h-2.5',
  xl: 'w-3 h-3',
};

export const Spinner: React.FC<SpinnerProps> = ({
  variant = 'circular',
  size = 'md',
  color = 'primary',
  className,
  'aria-label': ariaLabel = 'Loading',
}) => {
  if (variant === 'circular') {
    return (
      <Loader2
        className={cn(
          'animate-spin',
          sizeClasses[size],
          colorClasses[color],
          className
        )}
        aria-label={ariaLabel}
        role="status"
      />
    );
  }

  if (variant === 'dots') {
    return (
      <div
        className={cn('flex items-center gap-1', className)}
        aria-label={ariaLabel}
        role="status"
      >
        <div
          className={cn(
            'rounded-full animate-pulse',
            dotSizeClasses[size],
            color === 'primary'
              ? 'bg-indigo-600 dark:bg-indigo-500'
              : color === 'white'
              ? 'bg-white'
              : 'bg-gray-400 dark:bg-gray-500'
          )}
          style={{ animationDelay: '0ms' }}
        />
        <div
          className={cn(
            'rounded-full animate-pulse',
            dotSizeClasses[size],
            color === 'primary'
              ? 'bg-indigo-600 dark:bg-indigo-500'
              : color === 'white'
              ? 'bg-white'
              : 'bg-gray-400 dark:bg-gray-500'
          )}
          style={{ animationDelay: '150ms' }}
        />
        <div
          className={cn(
            'rounded-full animate-pulse',
            dotSizeClasses[size],
            color === 'primary'
              ? 'bg-indigo-600 dark:bg-indigo-500'
              : color === 'white'
              ? 'bg-white'
              : 'bg-gray-400 dark:bg-gray-500'
          )}
          style={{ animationDelay: '300ms' }}
        />
      </div>
    );
  }

  if (variant === 'pulse') {
    return (
      <div
        className={cn(
          'rounded-full animate-pulse',
          sizeClasses[size],
          color === 'primary'
            ? 'bg-indigo-600 dark:bg-indigo-500'
            : color === 'white'
            ? 'bg-white'
            : 'bg-gray-400 dark:bg-gray-500',
          className
        )}
        aria-label={ariaLabel}
        role="status"
      />
    );
  }

  return null;
};

Spinner.displayName = 'Spinner';

