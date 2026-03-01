/**
 * Toast Molecule Component
 * 
 * A toast notification component with auto-dismiss and action buttons.
 * Uses Icon, Typography, Button, and Badge atoms.
 */

import React, { useEffect } from 'react';
import { X, CheckCircle, AlertCircle, AlertTriangle, Info } from 'lucide-react';
import { Icon } from '../../atoms/Icon';
import { Typography } from '../../atoms/Typography';
import { Button } from '../../atoms/Button';
import { Badge } from '../../atoms/Badge';
import { cn } from '../../../utils/theme';

export type ToastVariant = 'success' | 'error' | 'info' | 'warning';

export interface ToastProps {
  /**
   * Toast variant
   * @default 'info'
   */
  variant?: ToastVariant;
  
  /**
   * Toast message
   */
  message: string;
  
  /**
   * Toast title (optional)
   */
  title?: string;
  
  /**
   * Auto-dismiss duration in milliseconds (0 = no auto-dismiss)
   * @default 5000
   */
  duration?: number;
  
  /**
   * Show dismiss button
   * @default true
   */
  dismissible?: boolean;
  
  /**
   * Callback when toast is dismissed
   */
  onDismiss?: () => void;
  
  /**
   * Action button label
   */
  actionLabel?: string;
  
  /**
   * Action button click handler
   */
  onAction?: () => void;
  
  /**
   * Badge count (optional)
   */
  badge?: string | number;
  
  /**
   * Additional CSS classes
   */
  className?: string;
}

const variantClasses: Record<ToastVariant, string> = {
  success: 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800',
  error: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800',
  info: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800',
  warning: 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800',
};

const iconMap: Record<ToastVariant, typeof Info> = {
  success: CheckCircle,
  error: AlertCircle,
  info: Info,
  warning: AlertTriangle,
};

export const Toast: React.FC<ToastProps> = ({
  variant = 'info',
  message,
  title,
  duration = 5000,
  dismissible = true,
  onDismiss,
  actionLabel,
  onAction,
  badge,
  className,
}) => {
  useEffect(() => {
    if (duration > 0 && onDismiss) {
      const timer = setTimeout(() => {
        onDismiss();
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [duration, onDismiss]);

  return (
    <div
      className={cn(
        'rounded-lg border-l-4 p-4 shadow-lg min-w-[300px] max-w-md',
        variantClasses[variant],
        className
      )}
      role="alert"
    >
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 mt-0.5">
          <Icon icon={iconMap[variant]} size="md" />
        </div>
        
        <div className="flex-1 min-w-0">
          {title && (
            <Typography variant="h6" className="mb-1">
              {title}
            </Typography>
          )}
          <Typography variant="small" className="text-sm">
            {message}
          </Typography>
          
          {actionLabel && onAction && (
            <div className="mt-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={onAction}
              >
                {actionLabel}
              </Button>
            </div>
          )}
        </div>
        
        <div className="flex items-start gap-2 flex-shrink-0">
          {badge !== undefined && (
            <Badge variant="default" size="sm">
              {badge}
            </Badge>
          )}
          {dismissible && (
            <button
              type="button"
              onClick={onDismiss}
              className={cn(
                'flex-shrink-0 rounded-md p-1 transition-colors',
                'hover:bg-black/10 dark:hover:bg-white/10',
                'focus:outline-none focus:ring-2 focus:ring-offset-2'
              )}
              aria-label="Dismiss toast"
            >
              <Icon icon={X} size="sm" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

Toast.displayName = 'Toast';

