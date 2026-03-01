/**
 * Card Molecule Component
 * 
 * A versatile card component for displaying content in a contained format.
 */

import React from 'react';
import { cn } from '../../../utils/theme';
import { Spinner } from '../../atoms/Spinner';

export type CardVariant = 'default' | 'elevated' | 'outlined' | 'interactive';

export interface CardProps {
  /**
   * Card content
   */
  children: React.ReactNode;
  
  /**
   * Visual variant
   * @default 'default'
   */
  variant?: CardVariant;
  
  /**
   * Header content
   */
  header?: React.ReactNode;
  
  /**
   * Footer content
   */
  footer?: React.ReactNode;
  
  /**
   * Actions (buttons, etc.) displayed in the card
   */
  actions?: React.ReactNode;
  
  /**
   * Click handler (makes card interactive)
   */
  onClick?: () => void;
  
  /**
   * Show loading state
   * @default false
   */
  loading?: boolean;
  
  /**
   * Additional CSS classes
   */
  className?: string;
}

export const Card: React.FC<CardProps> = ({
  children,
  variant = 'default',
  header,
  footer,
  actions,
  onClick,
  loading = false,
  className,
}) => {
  const variantClasses = {
    default: 'bg-white dark:bg-gray-800',
    elevated: 'bg-white dark:bg-gray-800 shadow-lg dark:shadow-gray-900/50',
    outlined: 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700',
    interactive: 'bg-white dark:bg-gray-800 hover:shadow-md transition-shadow cursor-pointer',
  };

  return (
    <div
      className={cn(
        'rounded-lg overflow-hidden',
        variantClasses[variant],
        onClick && 'cursor-pointer',
        className
      )}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      {header && (
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          {header}
        </div>
      )}
      
      <div className={cn('px-6 py-4', loading && 'opacity-50 pointer-events-none')}>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Spinner size="lg" color="primary" />
          </div>
        ) : (
          children
        )}
      </div>
      
      {actions && (
        <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex items-center justify-end gap-2">
          {actions}
        </div>
      )}
      
      {footer && (
        <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
          {footer}
        </div>
      )}
    </div>
  );
};

Card.displayName = 'Card';

