/**
 * Badge Atom Component
 * 
 * A badge component for displaying labels, statuses, and notifications.
 */

import React from 'react';
import { X } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '../../../utils/theme';

export type BadgeVariant = 'default' | 'primary' | 'success' | 'warning' | 'danger' | 'info';
export type BadgeSize = 'sm' | 'md' | 'lg';

export interface BadgeProps {
  /**
   * Badge content (not required for dot variant)
   */
  children?: React.ReactNode;
  
  /**
   * Visual style variant
   * @default 'default'
   */
  variant?: BadgeVariant;
  
  /**
   * Size of the badge
   * @default 'md'
   */
  size?: BadgeSize;
  
  /**
   * Icon to display on the left
   */
  icon?: LucideIcon;
  
  /**
   * Show dismiss button
   * @default false
   */
  dismissible?: boolean;
  
  /**
   * Callback when badge is dismissed
   */
  onDismiss?: () => void;
  
  /**
   * Dot variant (notification style, no text)
   * @default false
   */
  dot?: boolean;
  
  /**
   * Additional CSS classes
   */
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'default',
  size = 'md',
  icon: Icon,
  dismissible = false,
  onDismiss,
  dot = false,
  className,
}) => {
  const variantClasses = {
    default: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
    primary: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300',
    success: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
    warning: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
    danger: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
    info: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  };

  const sizeClasses = {
    sm: dot ? 'w-2 h-2' : 'px-1.5 py-0.5 text-xs',
    md: dot ? 'w-2.5 h-2.5' : 'px-2 py-1 text-sm',
    lg: dot ? 'w-3 h-3' : 'px-2.5 py-1.5 text-base',
  };

  const iconSizeClasses = {
    sm: 'w-3 h-3',
    md: 'w-3.5 h-3.5',
    lg: 'w-4 h-4',
  };

  if (dot) {
    return (
      <span
        className={cn(
          'inline-block rounded-full',
          variantClasses[variant],
          sizeClasses[size],
          className
        )}
        aria-label="Notification"
      />
    );
  }

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 font-medium rounded-full',
        variantClasses[variant],
        sizeClasses[size],
        className
      )}
    >
      {Icon && <Icon className={iconSizeClasses[size]} />}
      {children}
      {dismissible && (
        <button
          type="button"
          onClick={onDismiss}
          className={cn(
            'ml-0.5 rounded-full p-0.5 transition-colors',
            'hover:bg-black/10 dark:hover:bg-white/10',
            'focus:outline-none focus:ring-2 focus:ring-offset-1',
            iconSizeClasses[size]
          )}
          aria-label="Dismiss"
        >
          <X className={iconSizeClasses[size]} />
        </button>
      )}
    </span>
  );
};

Badge.displayName = 'Badge';

