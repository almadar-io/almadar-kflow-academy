/**
 * ConceptCard Organism Component
 * 
 * A card component for displaying concepts with header, description, metadata, actions, and children list.
 * Uses Card, ButtonGroup, Alert molecules and Typography, Badge, Button, Icon, ProgressBar, Avatar atoms.
 */

import React, { useState } from 'react';
import type { LucideIcon } from 'lucide-react';
import { ChevronDown, ChevronRight, Edit, Trash2, Plus, BookOpen, Check, Circle } from 'lucide-react';
import { Card } from '../../molecules/Card';
import { ButtonGroup } from '../../molecules/ButtonGroup';
import { Alert } from '../../molecules/Alert';
import { Typography } from '../../atoms/Typography';
import { Badge } from '../../atoms/Badge';
import { Button } from '../../atoms/Button';
import { Icon } from '../../atoms/Icon';
import { ProgressBar } from '../../atoms/ProgressBar';
import { Avatar } from '../../atoms/Avatar';
import { cn } from '../../../utils/theme';

export interface ConceptCardProps {
  /**
   * Concept ID
   */
  id: string;
  
  /**
   * Concept name/title
   */
  name: string;
  
  /**
   * Concept description
   */
  description?: string;
  
  /**
   * Concept layer
   */
  layer?: number;
  
  /**
   * Prerequisites
   */
  prerequisites?: string[];
  
  /**
   * Parent concepts
   */
  parents?: string[];
  
  /**
   * Child concepts
   */
  childConcepts?: ConceptCardProps[];
  
  /**
   * Completion progress (0-100)
   */
  progress?: number;
  
  /**
   * Whether this concept has a generated lesson
   */
  hasLesson?: boolean;
  
  /**
   * Visual highlighting (shows lesson-ready state with distinct color)
   */
  highlighted?: boolean;
  
  /**
   * Whether this is the current/active concept
   */
  isCurrent?: boolean;
  
  /**
   * Whether this concept is completed
   */
  isCompleted?: boolean;
  
  /**
   * Hide the lesson status badges (Lesson Ready / No Lesson)
   */
  hideLessonBadge?: boolean;
  
  /**
   * Concept icon
   */
  icon?: LucideIcon;
  
  /**
   * Concept avatar
   */
  avatar?: {
    src?: string;
    alt?: string;
    initials?: string;
  };
  
  /**
   * Is expanded (showing children)
   */
  expanded?: boolean;
  
  /**
   * Callback when expanded state changes
   */
  onExpandChange?: (expanded: boolean) => void;
  
  /**
   * Operation buttons
   */
  operations?: Array<{
    label: string;
    icon?: LucideIcon;
    onClick: () => void;
    variant?: 'primary' | 'secondary' | 'danger';
  }>;
  
  /**
   * On concept click
   */
  onClick?: () => void;
  
  /**
   * Additional CSS classes
   */
  className?: string;
}

export const ConceptCard: React.FC<ConceptCardProps> = ({
  id,
  name,
  description,
  layer,
  prerequisites,
  parents,
  childConcepts,
  progress,
  hasLesson,
  highlighted,
  isCurrent,
  isCompleted,
  hideLessonBadge,
  icon,
  avatar,
  expanded: controlledExpanded,
  onExpandChange,
  operations,
  onClick,
  className,
}) => {
  const [internalExpanded, setInternalExpanded] = useState(false);
  const expanded = controlledExpanded !== undefined ? controlledExpanded : internalExpanded;
  const hasChildren = Array.isArray(childConcepts) && childConcepts.length > 0;
  
  // Determine highlight state - explicit highlighted prop or derived from hasLesson
  const isHighlighted = highlighted ?? hasLesson;

  const handleExpand = () => {
    if (hasChildren) {
      const newExpanded = !expanded;
      if (controlledExpanded === undefined) {
        setInternalExpanded(newExpanded);
      }
      onExpandChange?.(newExpanded);
    }
  };

  return (
    <Card
      variant="elevated"
      className={cn(
        'transition-all duration-200',
        // Highlighted state (lesson ready)
        isHighlighted && !isCurrent && !isCompleted && 'border-l-4 border-l-emerald-500 bg-emerald-50/50 dark:bg-emerald-900/10',
        // Current/active state
        isCurrent && !isCompleted && 'ring-2 ring-indigo-500 border-l-4 border-l-indigo-500 bg-indigo-50 dark:bg-indigo-900/20',
        // Completed state
        isCompleted && 'opacity-60',
        // Default non-highlighted state
        !isHighlighted && !isCurrent && !isCompleted && 'border-l-4 border-l-gray-200 dark:border-l-gray-700',
        className
      )}
      onClick={onClick}
    >
      <div className="space-y-3">
        {/* Header */}
        <div className="flex items-start gap-3">
          {hasChildren && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleExpand();
              }}
              className="flex-shrink-0 mt-1"
            >
              <Icon
                icon={expanded ? ChevronDown : ChevronRight}
                size="sm"
                className="text-gray-500 dark:text-gray-400"
              />
            </button>
          )}

          {/* Status indicator - shows lesson/completion status */}
          {!avatar && !icon && (
            <div className={cn(
              "flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center",
              isCompleted && "bg-green-500 text-white",
              isCurrent && !isCompleted && "bg-indigo-500 text-white",
              isHighlighted && !isCompleted && !isCurrent && "bg-emerald-500 text-white",
              !isHighlighted && !isCompleted && !isCurrent && "bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400"
            )}>
              {isCompleted ? (
                <Check size={18} />
              ) : isHighlighted ? (
                <BookOpen size={16} />
              ) : (
                <Circle size={18} />
              )}
            </div>
          )}

          {avatar && (
            <Avatar
              src={avatar.src}
              alt={avatar.alt}
              initials={avatar.initials}
              size="md"
            />
          )}

          {icon && !avatar && (
            <div className="flex-shrink-0">
              <Icon icon={icon} size="md" />
            </div>
          )}

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <Typography variant="h6">
                {name}
              </Typography>
              {!hideLessonBadge && isHighlighted && !isCompleted && (
                <Badge variant="success" size="sm" className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 text-xs">
                  Lesson Ready
                </Badge>
              )}
              {!hideLessonBadge && !isHighlighted && !isCompleted && (
                <Badge variant="default" size="sm" className="bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400 text-xs">
                  No Lesson
                </Badge>
              )}
            </div>
            {description && (
              <Typography variant="small" color="secondary" className="mb-2">
                {description}
              </Typography>
            )}
            {/* Prerequisites displayed under description - more prominent */}
            {prerequisites && prerequisites.length > 0 && (
              <div className="flex flex-wrap items-center gap-2 mt-2 mb-1">
                <Typography variant="small" weight="semibold" className="text-xs text-indigo-600 dark:text-indigo-400">
                  Prerequisites:
                </Typography>
                {prerequisites.map((prereq, idx) => (
                  <Badge key={idx} variant="primary" size="sm" className="font-medium">
                    {prereq}
                  </Badge>
                ))}
              </div>
            )}
            {/* Parents displayed under description - less prominent */}
            {parents && parents.length > 0 && (
              <div className="flex flex-wrap items-center gap-2 mt-1">
                <Typography variant="small" color="muted" className="text-xs">
                  Parents:
                </Typography>
                {parents.map((parent, idx) => (
                  <Badge key={idx} variant="default" size="sm" className="bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
                    {parent}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Progress Bar */}
        {progress !== undefined && (
          <div className="mt-2">
            <ProgressBar value={progress} color="primary" className="w-full" />
          </div>
        )}

        {/* Operations */}
        {operations && operations.length > 0 && (
          <div className="flex gap-2">
            {operations.map((op, idx) => (
              <Button
                key={idx}
                variant={op.variant || 'secondary'}
                size="sm"
                icon={op.icon}
                onClick={(e) => {
                  e.stopPropagation();
                  op.onClick();
                }}
              >
                {op.label}
              </Button>
            ))}
          </div>
        )}

        {/* Children */}
        {hasChildren && expanded && Array.isArray(childConcepts) && (
          <div className="pl-6 border-l-2 border-gray-200 dark:border-gray-700 space-y-2 mt-3">
            {childConcepts
              .filter((child): child is ConceptCardProps => 
                child != null && 
                typeof child === 'object' && 
                'id' in child && 
                'name' in child &&
                typeof child.id === 'string' &&
                typeof child.name === 'string'
              )
              .map((child) => (
                <ConceptCard
                  key={child.id}
                  id={child.id}
                  name={child.name}
                  description={child.description}
                  layer={child.layer}
                  prerequisites={child.prerequisites}
                  childConcepts={child.childConcepts}
                  progress={child.progress}
                  icon={child.icon}
                  avatar={child.avatar}
                  operations={child.operations}
                  onClick={child.onClick}
                  className="mb-2"
                />
              ))}
          </div>
        )}
      </div>
    </Card>
  );
};

ConceptCard.displayName = 'ConceptCard';
