/**
 * LessonCard Organism Component
 * 
 * A card component for displaying lessons with title, description, duration, progress, status, and actions.
 * Uses Card, ButtonGroup molecules and Typography, Badge, ProgressBar, Button, Icon atoms.
 */

import React from 'react';
import type { LucideIcon } from 'lucide-react';
import { Lock, Unlock, Play, CheckCircle } from 'lucide-react';
import { Card } from '../../molecules/Card';
import { ButtonGroup } from '../../molecules/ButtonGroup';
import { Typography } from '../../atoms/Typography';
import { Badge } from '../../atoms/Badge';
import { ProgressBar } from '../../atoms/ProgressBar';
import { Button } from '../../atoms/Button';
import { Icon } from '../../atoms/Icon';
import { cn } from '../../../utils/theme';

export type LessonStatus = 'not-started' | 'in-progress' | 'completed' | 'locked';

export interface LessonCardProps {
  /**
   * Lesson ID
   */
  id: string;
  
  /**
   * Lesson title
   */
  title: string;
  
  /**
   * Lesson description
   */
  description?: string;
  
  /**
   * Lesson duration (in minutes)
   */
  duration?: number;
  
  /**
   * Completion progress (0-100)
   */
  progress?: number;
  
  /**
   * Lesson status
   * @default 'not-started'
   */
  status?: LessonStatus;
  
  /**
   * Lesson icon
   */
  icon?: LucideIcon;
  
  /**
   * On lesson click
   */
  onClick?: () => void;
  
  /**
   * Action buttons
   */
  actions?: React.ReactNode;
  
  /**
   * Additional CSS classes
   */
  className?: string;
}

const statusConfig: Record<LessonStatus, { label: string; variant: 'default' | 'primary' | 'success' | 'warning' }> = {
  'not-started': { label: 'Not Started', variant: 'default' },
  'in-progress': { label: 'In Progress', variant: 'primary' },
  'completed': { label: 'Completed', variant: 'success' },
  'locked': { label: 'Locked', variant: 'warning' },
};

export const LessonCard: React.FC<LessonCardProps> = ({
  id,
  title,
  description,
  duration,
  progress,
  status = 'not-started',
  icon,
  onClick,
  actions,
  className,
}) => {
  const isLocked = status === 'locked';
  const statusInfo = statusConfig[status];

  return (
    <Card
      variant={isLocked ? 'default' : 'interactive'}
      onClick={!isLocked ? onClick : undefined}
      className={cn(
        isLocked && 'opacity-60',
        className
      )}
    >
      <div className="space-y-3">
        {/* Header */}
        <div className="flex items-start gap-3">
          {icon && (
            <div className="flex-shrink-0">
              <Icon icon={icon} size="lg" />
            </div>
          )}

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <Typography variant="h6">{title}</Typography>
              <Badge variant={statusInfo.variant} size="sm">
                {statusInfo.label}
              </Badge>
              {isLocked && (
                <Icon icon={Lock} size="sm" className="text-gray-400" />
              )}
              {status === 'completed' && (
                <Icon icon={CheckCircle} size="sm" className="text-green-500" />
              )}
            </div>
            {description && (
              <Typography variant="small" color="secondary">
                {description}
              </Typography>
            )}
          </div>
        </div>

        {/* Metadata */}
        <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
          {duration !== undefined && (
            <div className="flex items-center gap-1">
              <Icon icon={Play} size="sm" />
              <Typography variant="small">{duration} min</Typography>
            </div>
          )}
        </div>

        {/* Progress */}
        {progress !== undefined && progress > 0 && (
          <div>
            <div className="flex items-center justify-between mb-1">
              <Typography variant="small" color="secondary">
                Progress
              </Typography>
              <Typography variant="small" color="secondary">
                {progress}%
              </Typography>
            </div>
            <ProgressBar
              value={progress}
              color={progress === 100 ? 'success' : 'primary'}
            />
          </div>
        )}

        {/* Actions */}
        {actions && (
          <div className="pt-2">
            {actions}
          </div>
        )}
      </div>
    </Card>
  );
};

LessonCard.displayName = 'LessonCard';
