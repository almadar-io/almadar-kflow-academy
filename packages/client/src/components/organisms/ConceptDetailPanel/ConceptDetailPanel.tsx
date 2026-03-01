/**
 * ConceptDetailPanel Organism Component
 * 
 * A panel component for displaying concept details with header, description, lesson content, flashcards, metadata, relationships, and actions.
 * Uses Card, Tabs, Accordion, ButtonGroup molecules and Typography, Icon, Badge, Button, Divider, ProgressBar atoms.
 */

import React from 'react';
import type { LucideIcon } from 'lucide-react';
import { Card } from '../../molecules/Card';
import { Tabs, TabItem } from '../../molecules/Tabs';
import { Accordion, AccordionItem } from '../../molecules/Accordion';
import { ButtonGroup } from '../../molecules/ButtonGroup';
import { Typography } from '../../atoms/Typography';
import { Icon } from '../../atoms/Icon';
import { Badge } from '../../atoms/Badge';
import { Button } from '../../atoms/Button';
import { Divider } from '../../atoms/Divider';
import { ProgressBar } from '../../atoms/ProgressBar';
import { FlashCard } from '../FlashCard';
import { cn } from '../../../utils/theme';

export interface ConceptDetailPanelProps {
  /**
   * Concept ID
   */
  id: string;
  
  /**
   * Concept name
   */
  name: string;
  
  /**
   * Concept description
   */
  description?: string;
  
  /**
   * Concept icon
   */
  icon?: LucideIcon;
  
  /**
   * Concept layer
   */
  layer?: number;
  
  /**
   * Lesson content
   */
  lessonContent?: React.ReactNode;
  
  /**
   * Flashcards
   */
  flashcards?: Array<{
    id: string;
    front: string;
    back: string;
  }>;
  
  /**
   * Metadata items
   */
  metadata?: Array<{
    label: string;
    value: string | number;
  }>;
  
  /**
   * Relationships
   */
  relationships?: {
    prerequisites?: string[];
    children?: string[];
    siblings?: string[];
  };
  
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
   * Lesson progress
   */
  lessonProgress?: number;
  
  /**
   * Additional CSS classes
   */
  className?: string;
}

export const ConceptDetailPanel: React.FC<ConceptDetailPanelProps> = ({
  id,
  name,
  description,
  icon,
  layer,
  lessonContent,
  flashcards = [],
  metadata,
  relationships,
  operations,
  lessonProgress,
  className,
}) => {
  const tabItems: TabItem[] = [
    {
      id: 'content',
      label: 'Content',
      content: (
        <div className="space-y-6">
          {/* Description */}
          {description && (
            <div>
              <Typography variant="h6" className="mb-2">Description</Typography>
              <Typography variant="body" color="secondary">
                {description}
              </Typography>
            </div>
          )}
          
          {/* Metadata */}
          {metadata && metadata.length > 0 && (
            <div>
              <Typography variant="h6" className="mb-2">Metadata</Typography>
              <div className="space-y-2">
                {metadata.map((item, idx) => (
                  <div key={idx} className="flex justify-between">
                    <Typography variant="small" color="secondary">
                      {item.label}
                    </Typography>
                    <Typography variant="small" weight="medium">
                      {item.value}
                    </Typography>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {/* Lesson Content */}
          {lessonContent ? (
            <div>
              <Typography variant="h6" className="mb-2">Lesson</Typography>
              {lessonContent}
            </div>
          ) : description || (metadata && metadata.length > 0) ? null : (
            <Typography variant="body" color="secondary">
              No content available.
            </Typography>
          )}
        </div>
      ),
    },
    {
      id: 'flashcards',
      label: 'Flashcards',
      badge: flashcards.length,
      content: flashcards.length > 0 ? (
        <div className="space-y-4">
          {flashcards.map((card) => (
            <FlashCard
              key={card.id}
              id={card.id}
              front={card.front}
              back={card.back}
            />
          ))}
        </div>
      ) : (
        <Typography variant="body" color="secondary">
          No flashcards available.
        </Typography>
      ),
    },
    {
      id: 'relationships',
      label: 'Relationships',
      content: relationships ? (
        <div className="space-y-4">
          {relationships.prerequisites && relationships.prerequisites.length > 0 && (
            <div>
              <Typography variant="h6" className="mb-2">Prerequisites</Typography>
              <div className="flex flex-wrap gap-2">
                {relationships.prerequisites.map((prereq, idx) => (
                  <Badge key={idx} variant="default" size="sm">
                    {prereq}
                  </Badge>
                ))}
              </div>
            </div>
          )}
          {relationships.children && relationships.children.length > 0 && (
            <div>
              <Typography variant="h6" className="mb-2">Child Concepts</Typography>
              <div className="flex flex-wrap gap-2">
                {relationships.children.map((child, idx) => (
                  <Badge key={idx} variant="primary" size="sm">
                    {child}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <Typography variant="body" color="secondary">
          No relationships defined.
        </Typography>
      ),
    },
  ];

  return (
    <Card className={cn('', className)}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start gap-3">
          {icon && (
            <div className="flex-shrink-0">
              <Icon icon={icon} size="lg" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <Typography variant="h4">{name}</Typography>
              {layer !== undefined && (
                <Badge variant="primary" size="sm">
                  Layer {layer}
                </Badge>
              )}
            </div>
            {lessonProgress !== undefined && (
              <div className="mt-2">
                <ProgressBar value={lessonProgress} color="primary" />
              </div>
            )}
          </div>
        </div>

        <Divider />

        {/* Tabs */}
        <Tabs items={tabItems} />

        {/* Operations */}
        {operations && operations.length > 0 && (
          <>
            <Divider />
            <div className="flex justify-end">
              <ButtonGroup>
                {operations.map((op, idx) => (
                  <Button
                    key={idx}
                    variant={op.variant || 'secondary'}
                    icon={op.icon}
                    onClick={op.onClick}
                  >
                    {op.label}
                  </Button>
                ))}
              </ButtonGroup>
            </div>
          </>
        )}
      </div>
    </Card>
  );
};

ConceptDetailPanel.displayName = 'ConceptDetailPanel';
