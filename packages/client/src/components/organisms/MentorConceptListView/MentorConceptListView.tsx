/**
 * MentorConceptListView Organism Component
 * 
 * A view component for mentors displaying graph summary header, learning goal, layer sections, concept cards, and layer operations.
 * Uses Card, ConceptCard, GoalDisplay, OperationPanel, StatCard, ProgressCard, ButtonGroup molecules and Typography, Badge, Button, Icon, Divider, ProgressBar atoms.
 */

import React from 'react';
import type { LucideIcon } from 'lucide-react';
import { Card } from '../../molecules/Card';
import { ConceptCard, ConceptCardProps } from '../ConceptCard';
import { GoalDisplay } from '../GoalDisplay';
import { OperationPanel } from '../OperationPanel';
import { StatCard } from '../../molecules/StatCard';
import { ProgressCard } from '../../molecules/ProgressCard';
import { ButtonGroup } from '../../molecules/ButtonGroup';
import { Typography } from '../../atoms/Typography';
import { Badge } from '../../atoms/Badge';
import { Button } from '../../atoms/Button';
import { Icon } from '../../atoms/Icon';
import { Divider } from '../../atoms/Divider';
import { ProgressBar } from '../../atoms/ProgressBar';
import { Target } from 'lucide-react';
import { cn } from '../../../utils/theme';

export interface Layer {
  /**
   * Layer number
   */
  number: number;
  
  /**
   * Layer concepts
   */
  concepts: ConceptCardProps[];
  
  /**
   * Layer operations
   */
  operations?: Array<{
    id: string;
    label: string;
    icon?: LucideIcon;
    onClick: () => void;
    variant?: 'primary' | 'secondary' | 'danger';
  }>;
}

export interface MentorConceptListViewProps {
  /**
   * Graph summary statistics
   */
  graphSummary?: {
    totalConcepts: number;
    totalLayers: number;
    completedConcepts: number;
  };
  
  /**
   * Learning goal
   */
  learningGoal?: {
    id: string;
    goal: string;
    icon?: LucideIcon;
    milestones?: Array<{
      id: string;
      text: string;
      completed?: boolean;
    }>;
  };
  
  /**
   * Layers with concepts
   */
  layers: Layer[];
  
  /**
   * Layer operations panel
   */
  layerOperations?: {
    title?: string;
    operations: Array<{
      id: string;
      label: string;
      icon?: LucideIcon;
      onClick: () => void;
      variant?: 'primary' | 'secondary' | 'danger';
    }>;
  };
  
  /**
   * On concept select
   */
  onConceptSelect?: (conceptId: string) => void;
  
  /**
   * Additional CSS classes
   */
  className?: string;
}

export const MentorConceptListView: React.FC<MentorConceptListViewProps> = ({
  graphSummary,
  learningGoal,
  layers,
  layerOperations,
  onConceptSelect,
  className,
}) => {
  return (
    <div className={cn('space-y-6', className)}>
      {/* Graph Summary Header */}
      {graphSummary && (
        <Card>
          <div className="space-y-4">
            <Typography variant="h4" className="mb-4">
              Knowledge Graph Summary
            </Typography>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <StatCard
                label="Total Concepts"
                value={graphSummary.totalConcepts}
                iconVariant="primary"
              />
              <StatCard
                label="Total Layers"
                value={graphSummary.totalLayers}
                iconVariant="info"
              />
              <StatCard
                label="Completed"
                value={graphSummary.completedConcepts}
                iconVariant="success"
              />
            </div>
          </div>
        </Card>
      )}

      {/* Learning Goal */}
      {learningGoal && (
        <GoalDisplay
          id={learningGoal.id}
          goal={learningGoal.goal}
          icon={learningGoal.icon}
          milestones={learningGoal.milestones}
        />
      )}

      {/* Layer Operations */}
      {layerOperations && (
        <OperationPanel
          title={layerOperations.title || 'Layer Operations'}
          operations={layerOperations.operations.map(op => ({
            id: op.id,
            label: op.label,
            icon: op.icon,
            variant: op.variant,
            onClick: op.onClick,
          }))}
        />
      )}

      {/* Layers */}
      <div className="space-y-6">
        {layers.map((layer) => (
          <div key={layer.number} className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Typography variant="h5">
                  Layer {layer.number}
                </Typography>
                <Badge variant="primary" size="sm">
                  {layer.concepts.length} concepts
                </Badge>
              </div>
              {layer.operations && layer.operations.length > 0 && (
                <ButtonGroup>
                  {layer.operations.map((op) => (
                    <Button
                      key={op.id}
                      variant={op.variant || 'secondary'}
                      size="sm"
                      icon={op.icon}
                      onClick={op.onClick}
                    >
                      {op.label}
                    </Button>
                  ))}
                </ButtonGroup>
              )}
            </div>

            <Divider />

            {/* Concepts */}
            <div className="space-y-4">
              {layer.concepts.map((concept) => (
                <ConceptCard
                  key={concept.id}
                  {...concept}
                  onClick={() => onConceptSelect?.(concept.id)}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

MentorConceptListView.displayName = 'MentorConceptListView';
