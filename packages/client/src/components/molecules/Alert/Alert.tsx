/**
 * Alert Molecule Component
 * 
 * A component for displaying alert messages with different variants and actions.
 */

import React from 'react';
import { X, AlertCircle, CheckCircle, AlertTriangle, Info } from 'lucide-react';
import { cn } from '../../../utils/theme';
import { Button } from '../../atoms/Button';
import { Icon } from '../../atoms/Icon';
import { Typography } from '../../atoms/Typography';

export type AlertVariant = 'info' | 'success' | 'warning' | 'error';

export interface AlertProps {
  /**
   * Alert content
   */
  children: React.ReactNode;
  
  /**
   * Alert variant
   * @default 'info'
   */
  variant?: AlertVariant;
  
  /**
   * Alert title
   */
  title?: string;
  
  /**
   * Show dismiss button
   * @default false
   */
  dismissible?: boolean;
  
  /**
   * Callback when alert is dismissed
   */
  onDismiss?: () => void;
  
  /**
   * Action buttons
   */
  actions?: React.ReactNode;
  
  /**
   * Additional CSS classes
   */
  className?: string;
}

const variantClasses: Record<AlertVariant, string> = {
  info: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-200',
  success: 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-800 dark:text-green-200',
  warning: 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800 text-yellow-800 dark:text-yellow-200',
  error: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-800 dark:text-red-200',
};

const iconMap: Record<AlertVariant, typeof Info> = {
  info: Info,
  success: CheckCircle,
  warning: AlertTriangle,
  error: AlertCircle,
};

export const Alert: React.FC<AlertProps> = ({
  children,
  variant = 'info',
  title,
  dismissible = false,
  onDismiss,
  actions,
  className,
}) => {

  return (
    <div
      className={cn(
        'rounded-lg border-l-4 p-4',
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
            {children}
          </Typography>
          {actions && (
            <div className="mt-3 flex gap-2">
              {actions}
            </div>
          )}
        </div>
        {dismissible && (
          <button
            type="button"
            onClick={onDismiss}
            className={cn(
              'flex-shrink-0 rounded-md p-1 transition-colors',
              'hover:bg-black/10 dark:hover:bg-white/10',
              'focus:outline-none focus:ring-2 focus:ring-offset-2'
            )}
            aria-label="Dismiss alert"
          >
            <Icon icon={X} size="sm" />
          </button>
        )}
      </div>
    </div>
  );
};

Alert.displayName = 'Alert';

