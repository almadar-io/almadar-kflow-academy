/**
 * StatCard Molecule Component
 * 
 * A card component displaying statistics with icon, label, value, and optional change indicator.
 * Uses Card molecule, Icon, Typography, and Badge atoms.
 */

import React from 'react';
import type { LucideIcon } from 'lucide-react';
import { Card } from '../Card';
import { Icon } from '../../atoms/Icon';
import { Typography } from '../../atoms/Typography';
import { Badge } from '../../atoms/Badge';
import { cn } from '../../../utils/theme';

export interface StatCardProps {
  /**
   * Icon to display
   */
  icon?: LucideIcon;
  
  /**
   * Stat label
   */
  label: string;
  
  /**
   * Stat value
   */
  value: string | number;
  
  /**
   * Change indicator (e.g., "+12%", "-5")
   */
  change?: string;
  
  /**
   * Change type (positive/negative)
   */
  changeType?: 'positive' | 'negative' | 'neutral';
  
  /**
   * Icon background color variant
   */
  iconVariant?: 'primary' | 'success' | 'warning' | 'danger' | 'info';
  
  /**
   * Additional CSS classes
   */
  className?: string;
}

const iconVariantClasses = {
  primary: 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400',
  success: 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400',
  warning: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400',
  danger: 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400',
  info: 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400',
};

const changeTypeClasses = {
  positive: 'text-green-600 dark:text-green-400',
  negative: 'text-red-600 dark:text-red-400',
  neutral: 'text-gray-600 dark:text-gray-400',
};

export const StatCard: React.FC<StatCardProps> = ({
  icon,
  label,
  value,
  change,
  changeType = 'neutral',
  iconVariant = 'primary',
  className,
}) => {
  return (
    <Card className={cn('', className)}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <Typography variant="small" color="secondary" className="mb-1">
            {label}
          </Typography>
          <Typography variant="h3" className="mb-2">
            {value}
          </Typography>
          {change && (
            <Typography
              variant="small"
              className={cn('font-medium', changeTypeClasses[changeType])}
            >
              {change}
            </Typography>
          )}
        </div>
        
        {icon && (
          <div className={cn(
            'w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0',
            iconVariantClasses[iconVariant]
          )}>
            <Icon icon={icon} size="lg" />
          </div>
        )}
      </div>
    </Card>
  );
};

StatCard.displayName = 'StatCard';

