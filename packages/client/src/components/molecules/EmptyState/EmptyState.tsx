/**
 * EmptyState Molecule Component
 * 
 * A component for displaying empty states with icon, title, description, and optional action.
 * Uses Icon, Typography, and Button atoms.
 */

import React from 'react';
import type { LucideIcon } from 'lucide-react';
import { Icon } from '../../atoms/Icon';
import { Typography } from '../../atoms/Typography';
import { Button } from '../../atoms/Button';
import { cn } from '../../../utils/theme';

export interface EmptyStateProps {
  /**
   * Icon to display
   */
  icon?: LucideIcon;
  
  /**
   * Title text
   */
  title?: string;
  
  /**
   * Description text
   */
  description?: string;
  
  /**
   * Action button label
   */
  actionLabel?: string;
  
  /**
   * Action button click handler
   */
  onAction?: () => void;
  
  /**
   * Custom content to display
   */
  children?: React.ReactNode;
  
  /**
   * Additional CSS classes
   */
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  actionLabel,
  onAction,
  children,
  className,
}) => {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center text-center py-12 px-4',
        className
      )}
    >
      {icon && (
        <div className="mb-4 text-gray-400 dark:text-gray-500">
          <Icon icon={icon} size="xl" />
        </div>
      )}
      
      {title && (
        <Typography variant="h4" className="mb-2 text-gray-900 dark:text-gray-100">
          {title}
        </Typography>
      )}
      
      {description && (
        <Typography variant="body" color="secondary" className="mb-6 max-w-md">
          {description}
        </Typography>
      )}
      
      {children}
      
      {actionLabel && onAction && (
        <Button variant="primary" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
};

EmptyState.displayName = 'EmptyState';

