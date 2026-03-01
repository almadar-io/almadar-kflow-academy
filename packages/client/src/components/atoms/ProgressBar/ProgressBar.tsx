/**
 * ProgressBar Atom Component
 * 
 * A progress bar component with linear, circular, and stepped variants.
 */

import React from 'react';
import { cn } from '../../../utils/theme';

export type ProgressBarVariant = 'linear' | 'circular' | 'stepped';
export type ProgressBarColor = 'primary' | 'success' | 'warning' | 'danger';

export interface ProgressBarProps {
  /**
   * Progress value (0-100)
   */
  value: number;
  
  /**
   * Maximum value (for calculating percentage)
   * @default 100
   */
  max?: number;
  
  /**
   * Variant of the progress bar
   * @default 'linear'
   */
  variant?: ProgressBarVariant;
  
  /**
   * Color variant
   * @default 'primary'
   */
  color?: ProgressBarColor;
  
  /**
   * Show percentage text
   * @default false
   */
  showPercentage?: boolean;
  
  /**
   * Label text
   */
  label?: string;
  
  /**
   * Size (for circular variant)
   * @default 'md'
   */
  size?: 'sm' | 'md' | 'lg';
  
  /**
   * Number of steps (for stepped variant)
   * @default 5
   */
  steps?: number;
  
  /**
   * Additional CSS classes
   */
  className?: string;
}

const colorClasses: Record<ProgressBarColor, string> = {
  primary: 'bg-indigo-600 dark:bg-indigo-500',
  success: 'bg-green-600 dark:bg-green-500',
  warning: 'bg-yellow-500 dark:bg-yellow-400',
  danger: 'bg-red-600 dark:bg-red-500',
};

const circularSizeClasses = {
  sm: 'w-16 h-16',
  md: 'w-24 h-24',
  lg: 'w-32 h-32',
};

export const ProgressBar: React.FC<ProgressBarProps> = ({
  value,
  max = 100,
  variant = 'linear',
  color = 'primary',
  showPercentage = false,
  label,
  size = 'md',
  steps = 5,
  className,
}) => {
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100);

  if (variant === 'linear') {
    return (
      <div className={cn('w-full', className)}>
        {label && (
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {label}
            </span>
            {showPercentage && (
              <span className="text-sm text-gray-600 dark:text-gray-400">
                {Math.round(percentage)}%
              </span>
            )}
          </div>
        )}
        <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
          <div
            className={cn(
              'h-full transition-all duration-300 ease-out rounded-full',
              colorClasses[color]
            )}
            style={{ width: `${percentage}%` }}
            role="progressbar"
            aria-valuenow={value}
            aria-valuemin={0}
            aria-valuemax={max}
            aria-label={label || `Progress: ${Math.round(percentage)}%`}
          />
        </div>
      </div>
    );
  }

  if (variant === 'circular') {
    const radius = size === 'sm' ? 28 : size === 'md' ? 40 : 56;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (percentage / 100) * circumference;

    return (
      <div className={cn('relative inline-flex items-center justify-center', className)}>
        <svg
          className={cn('transform -rotate-90', circularSizeClasses[size])}
          viewBox="0 0 100 100"
        >
          {/* Background circle */}
          <circle
            cx="50"
            cy="50"
            r={radius}
            stroke="currentColor"
            strokeWidth="8"
            fill="none"
            className="text-gray-200 dark:text-gray-700"
          />
          {/* Progress circle */}
          <circle
            cx="50"
            cy="50"
            r={radius}
            stroke="currentColor"
            strokeWidth="8"
            fill="none"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            className={cn(
              'transition-all duration-300 ease-out',
              colorClasses[color]
            )}
          />
        </svg>
        {showPercentage && (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
              {Math.round(percentage)}%
            </span>
          </div>
        )}
      </div>
    );
  }

  if (variant === 'stepped') {
    const stepValue = max / steps;
    const activeSteps = Math.floor(value / stepValue);
    const partialStep = (value % stepValue) / stepValue;

    return (
      <div className={cn('w-full', className)}>
        {label && (
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {label}
            </span>
            {showPercentage && (
              <span className="text-sm text-gray-600 dark:text-gray-400">
                {Math.round(percentage)}%
              </span>
            )}
          </div>
        )}
        <div className="flex gap-1">
          {Array.from({ length: steps }).map((_, index) => {
            const isActive = index < activeSteps;
            const isPartial = index === activeSteps && partialStep > 0;

            return (
              <div
                key={index}
                className="flex-1 h-2 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden"
              >
                <div
                  className={cn(
                    'h-full transition-all duration-300 ease-out rounded-full',
                    (isActive || isPartial) && colorClasses[color]
                  )}
                  style={{ width: isPartial ? `${partialStep * 100}%` : isActive ? '100%' : '0%' }}
                />
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return null;
};

ProgressBar.displayName = 'ProgressBar';

