/**
 * ContentReadinessCard Organism Component
 * 
 * A card displaying a concept with its publishing readiness status.
 * Shows lesson, flashcard, and quiz status with actions.
 */

import React from 'react';
import { 
  BookOpen, 
  Layers, 
  HelpCircle, 
  MoreVertical,
  Eye,
  Edit,
  Trash2,
  Copy,
  ExternalLink,
} from 'lucide-react';
import { Card } from '../../molecules/Card';
import { Typography } from '../../atoms/Typography';
import { Badge } from '../../atoms/Badge';
import { Button } from '../../atoms/Button';
import { Icon } from '../../atoms/Icon';
import { Checkbox } from '../../atoms/Checkbox';
import { Menu } from '../../molecules/Menu';
import { ContentReadinessIndicator, ContentStatus } from '../../molecules/ContentReadinessIndicator';
import { cn } from '../../../utils/theme';

export interface ContentReadinessCardProps {
  /**
   * Concept ID
   */
  id: string;
  
  /**
   * Concept name/title
   */
  title: string;
  
  /**
   * Concept description
   */
  description?: string;
  
  /**
   * Lesson status
   */
  lessonStatus: ContentStatus;
  
  /**
   * Number of flashcards
   */
  flashcardCount: number;
  
  /**
   * Flashcard status
   */
  flashcardStatus: ContentStatus;
  
  /**
   * Quiz status
   */
  quizStatus: ContentStatus;
  
  /**
   * Whether concept is published
   */
  isPublished: boolean;
  
  /**
   * Whether card is selected
   */
  isSelected?: boolean;
  
  /**
   * Whether to show checkbox
   */
  showCheckbox?: boolean;
  
  /**
   * Layer/module number
   */
  layerNumber?: number;
  
  /**
   * On card click
   */
  onClick?: () => void;
  
  /**
   * On checkbox change
   */
  onSelect?: (selected: boolean) => void;
  
  /**
   * On edit click
   */
  onEdit?: () => void;
  
  /**
   * On preview click
   */
  onPreview?: () => void;
  
  /**
   * On delete click
   */
  onDelete?: () => void;
  
  /**
   * On duplicate click
   */
  onDuplicate?: () => void;
  
  /**
   * Additional CSS classes
   */
  className?: string;
}

export const ContentReadinessCard: React.FC<ContentReadinessCardProps> = ({
  id,
  title,
  description,
  lessonStatus,
  flashcardCount,
  flashcardStatus,
  quizStatus,
  isPublished,
  isSelected = false,
  showCheckbox = false,
  layerNumber,
  onClick,
  onSelect,
  onEdit,
  onPreview,
  onDelete,
  onDuplicate,
  className,
}) => {
  const menuItems = [
    ...(onEdit ? [{
      id: 'edit',
      label: 'Edit',
      icon: Edit,
      onClick: onEdit,
    }] : []),
    ...(onPreview ? [{
      id: 'preview',
      label: 'Preview',
      icon: Eye,
      onClick: onPreview,
    }] : []),
    ...(onDuplicate ? [{
      id: 'duplicate',
      label: 'Duplicate',
      icon: Copy,
      onClick: onDuplicate,
    }] : []),
    ...(onDelete ? [{
      id: 'delete',
      label: 'Delete',
      icon: Trash2,
      onClick: onDelete,
    }] : []),
  ];
  
  return (
    <Card 
      className={cn(
        'transition-all duration-200',
        onClick && 'cursor-pointer hover:shadow-md hover:border-indigo-300 dark:hover:border-indigo-600',
        isSelected && 'ring-2 ring-indigo-500 border-indigo-500',
        className
      )}
      onClick={onClick}
    >
      <div className="flex items-start gap-3">
        {/* Checkbox */}
        {showCheckbox && (
          <div className="pt-1">
            <Checkbox
              checked={isSelected}
              onChange={(e) => onSelect?.(e.target.checked)}
              aria-label={`Select ${title}`}
            />
          </div>
        )}
        
        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="flex items-start justify-between gap-2 mb-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                {layerNumber !== undefined && (
                  <Badge variant="default" size="sm">
                    Layer {layerNumber}
                  </Badge>
                )}
                <Badge variant={isPublished ? 'success' : 'default'} size="sm">
                  {isPublished ? 'Published' : 'Draft'}
                </Badge>
              </div>
              <Typography variant="h6" className="truncate">
                {title}
              </Typography>
              {description && (
                <Typography variant="small" color="secondary" className="line-clamp-2 mt-1">
                  {description}
                </Typography>
              )}
            </div>
            
            {/* Menu */}
            {menuItems.length > 0 && (
              <Menu
                trigger={
                  <Button variant="ghost" size="sm">
                    <Icon icon={MoreVertical} size="sm" />
                  </Button>
                }
                items={menuItems}
                position="bottom-right"
              />
            )}
          </div>
          
          {/* Status Indicators */}
          <div className="flex flex-wrap gap-2">
            <ContentReadinessIndicator
              type="lesson"
              status={lessonStatus}
              showLabel
              size="sm"
            />
            <ContentReadinessIndicator
              type="flashcards"
              status={flashcardStatus}
              count={flashcardCount}
              showLabel
              size="sm"
            />
            <ContentReadinessIndicator
              type="quiz"
              status={quizStatus}
              showLabel
              size="sm"
            />
          </div>
        </div>
      </div>
    </Card>
  );
};

ContentReadinessCard.displayName = 'ContentReadinessCard';
