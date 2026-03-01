/**
 * ProgressCard Molecule Component
 * 
 * A card component displaying progress with title, progress bar, statistics, and icon.
 * Uses Card molecule, ProgressBar, Typography, and Icon atoms.
 */

import React from 'react';
import type { LucideIcon } from 'lucide-react';
import { Card } from '../Card';
import { ProgressBar } from '../../atoms/ProgressBar';
import { Typography } from '../../atoms/Typography';
import { Icon } from '../../atoms/Icon';
import { cn } from '../../../utils/theme';

export interface ProgressCardProps {
  /**
   * Card title
   */
  title: string;
  
  /**
   * Progress value (0-100)
   */
  progress: number;
  
  /**
   * Statistics to display
   */
  statistics?: Array<{
    label: string;
    value: string | number;
  }>;
  
  /**
   * Icon to display
   */
  icon?: LucideIcon;
  
  /**
   * Progress bar color variant
   */
  progressVariant?: 'primary' | 'success' | 'warning' | 'danger';
  
  /**
   * Additional CSS classes
   */
  className?: string;
}

export const ProgressCard: React.FC<ProgressCardProps> = ({
  title,
  progress,
  statistics,
  icon,
  progressVariant = 'primary',
  className,
}) => {
  return (
    <Card className={cn('', className)}>
      <div className="flex items-start gap-4">
        {icon && (
          <div className="flex-shrink-0">
            <div className="w-12 h-12 rounded-lg bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
              <Icon icon={icon} size="lg" color="text-indigo-600 dark:text-indigo-400" />
            </div>
          </div>
        )}
        
        <div className="flex-1 min-w-0">
          <Typography variant="h6" className="mb-2">
            {title}
          </Typography>
          
          <ProgressBar
            value={progress}
            color={progressVariant}
            className="mb-3"
          />
          
          {statistics && statistics.length > 0 && (
            <div className="flex gap-4 flex-wrap">
              {statistics.map((stat, index) => (
                <div key={index}>
                  <Typography variant="small" color="muted" className="text-xs">
                    {stat.label}
                  </Typography>
                  <Typography variant="body" weight="semibold">
                    {stat.value}
                  </Typography>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Card>
  );
};

ProgressCard.displayName = 'ProgressCard';
