/**
 * ContentReadinessIndicator Molecule Component
 * 
 * Shows the readiness status of course content (lesson, flashcards, quiz).
 * Uses Badge, Icon, and Tooltip atoms.
 */

import React from 'react';
import { 
  Check, 
  X, 
  Clock, 
  AlertCircle,
  FileText,
  Layers,
  HelpCircle,
  BookOpen,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Badge } from '../../atoms/Badge';
import { Icon } from '../../atoms/Icon';
import { Tooltip } from '../Tooltip';
import { cn } from '../../../utils/theme';

export type ContentStatus = 'ready' | 'draft' | 'missing' | 'error';
export type ContentType = 'lesson' | 'flashcards' | 'quiz' | 'assessment';

export interface ContentReadinessIndicatorProps {
  /**
   * Content type
   */
  type: ContentType;
  
  /**
   * Status of the content
   */
  status: ContentStatus;
  
  /**
   * Optional count (e.g., number of flashcards)
   */
  count?: number;
  
  /**
   * Custom tooltip message
   */
  tooltipMessage?: string;
  
  /**
   * Show label text
   * @default false
   */
  showLabel?: boolean;
  
  /**
   * Size variant
   * @default 'md'
   */
  size?: 'sm' | 'md' | 'lg';
  
  /**
   * Additional CSS classes
   */
  className?: string;
}

const statusConfig: Record<ContentStatus, { 
  icon: LucideIcon; 
  variant: 'success' | 'warning' | 'danger' | 'default';
  label: string;
}> = {
  ready: { icon: Check, variant: 'success', label: 'Ready' },
  draft: { icon: Clock, variant: 'warning', label: 'Draft' },
  missing: { icon: X, variant: 'default', label: 'Missing' },
  error: { icon: AlertCircle, variant: 'danger', label: 'Error' },
};

const contentTypeConfig: Record<ContentType, { 
  icon: LucideIcon; 
  label: string;
}> = {
  lesson: { icon: BookOpen, label: 'Lesson' },
  flashcards: { icon: Layers, label: 'Flashcards' },
  quiz: { icon: HelpCircle, label: 'Quiz' },
  assessment: { icon: FileText, label: 'Assessment' },
};

const sizeClasses = {
  sm: 'text-xs gap-1',
  md: 'text-sm gap-1.5',
  lg: 'text-base gap-2',
};

export const ContentReadinessIndicator: React.FC<ContentReadinessIndicatorProps> = ({
  type,
  status,
  count,
  tooltipMessage,
  showLabel = false,
  size = 'md',
  className,
}) => {
  const statusInfo = statusConfig[status];
  const contentInfo = contentTypeConfig[type];
  
  const defaultTooltip = count !== undefined 
    ? `${contentInfo.label}: ${count} items - ${statusInfo.label}`
    : `${contentInfo.label}: ${statusInfo.label}`;
  
  const content = (
    <div className={cn(
      'inline-flex items-center',
      sizeClasses[size],
      className
    )}>
      <Badge variant={statusInfo.variant} size={size === 'lg' ? 'md' : 'sm'}>
        <span className="flex items-center gap-1">
          <Icon icon={contentInfo.icon} size={size === 'sm' ? 'xs' : 'sm'} />
          {showLabel && (
            <span>{contentInfo.label}</span>
          )}
          {count !== undefined && (
            <span className="font-medium">({count})</span>
          )}
          <Icon icon={statusInfo.icon} size={size === 'sm' ? 'xs' : 'sm'} />
        </span>
      </Badge>
    </div>
  );
  
  return (
    <Tooltip content={tooltipMessage || defaultTooltip}>
      {content}
    </Tooltip>
  );
};

ContentReadinessIndicator.displayName = 'ContentReadinessIndicator';
