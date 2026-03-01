/**
 * GoalDisplay Organism Component
 * 
 * A component for displaying learning goals with icon, text, edit button, and optional milestones.
 * Uses Card, ButtonGroup, FormField molecules and Icon, Typography, Button, Textarea, Spinner, Badge atoms.
 */

import React, { useState } from 'react';
import type { LucideIcon } from 'lucide-react';
import { Edit, Save, X } from 'lucide-react';
import { Card } from '../../molecules/Card';
import { ButtonGroup } from '../../molecules/ButtonGroup';
import { FormField } from '../../molecules/FormField';
import { Icon } from '../../atoms/Icon';
import { Typography } from '../../atoms/Typography';
import { Button } from '../../atoms/Button';
import { Spinner } from '../../atoms/Spinner';
import { Badge } from '../../atoms/Badge';
import { cn } from '../../../utils/theme';

export interface Milestone {
  /**
   * Milestone ID
   */
  id: string;
  
  /**
   * Milestone text
   */
  text: string;
  
  /**
   * Is completed
   */
  completed?: boolean;
}

export interface GoalDisplayProps {
  /**
   * Goal ID
   */
  id: string;
  
  /**
   * Goal text
   */
  goal: string;
  
  /**
   * Goal icon
   */
  icon?: LucideIcon;
  
  /**
   * Is editing
   */
  editing?: boolean;
  
  /**
   * Callback when editing state changes
   */
  onEditingChange?: (editing: boolean) => void;
  
  /**
   * Callback when goal is saved
   */
  onSave?: (goal: string) => void;
  
  /**
   * Callback when goal is cancelled
   */
  onCancel?: () => void;
  
  /**
   * Loading state
   * @default false
   */
  loading?: boolean;
  
  /**
   * Milestones
   */
  milestones?: Milestone[];
  
  /**
   * Additional CSS classes
   */
  className?: string;
}

export const GoalDisplay: React.FC<GoalDisplayProps> = ({
  id,
  goal,
  icon,
  editing: controlledEditing,
  onEditingChange,
  onSave,
  onCancel,
  loading = false,
  milestones,
  className,
}) => {
  const [internalEditing, setInternalEditing] = useState(false);
  const [editValue, setEditValue] = useState(goal);
  const editing = controlledEditing !== undefined ? controlledEditing : internalEditing;

  const handleEdit = () => {
    setEditValue(goal);
    if (controlledEditing === undefined) {
      setInternalEditing(true);
    }
    onEditingChange?.(true);
  };

  const handleSave = () => {
    onSave?.(editValue);
    if (controlledEditing === undefined) {
      setInternalEditing(false);
    }
    onEditingChange?.(false);
  };

  const handleCancel = () => {
    setEditValue(goal);
    if (controlledEditing === undefined) {
      setInternalEditing(false);
    }
    onEditingChange?.(false);
    onCancel?.();
  };

  return (
    <Card
      className={cn(
        'bg-gradient-to-r from-indigo-500 to-purple-600 dark:from-indigo-600 dark:to-purple-700',
        'text-white',
        className
      )}
    >
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-start gap-3">
          {icon && (
            <div className="flex-shrink-0">
              <Icon icon={icon} size="lg" className="text-white" />
            </div>
          )}

          <div className="flex-1 min-w-0">
            {editing ? (
              <FormField
                type="textarea"
                inputProps={{
                  value: editValue,
                  onChange: (e) => setEditValue(e.target.value),
                  rows: 3,
                  className: 'bg-white/90 dark:bg-gray-800/90 text-gray-900 dark:text-gray-100',
                }}
              />
            ) : (
              <Typography variant="h4" className="text-white">
                {goal}
              </Typography>
            )}
          </div>

          {!editing && (
            <Button
              variant="ghost"
              size="sm"
              icon={Edit}
              onClick={handleEdit}
              className="text-white hover:bg-white/20"
            >
              Edit
            </Button>
          )}
        </div>

        {/* Milestones */}
        {milestones && milestones.length > 0 && (
          <div className="space-y-2">
            <Typography variant="small" className="text-white/80">
              Milestones:
            </Typography>
            <div className="flex flex-wrap gap-2">
              {milestones.map((milestone) => (
                <Badge
                  key={milestone.id}
                  variant={milestone.completed ? 'success' : 'default'}
                  size="sm"
                  className={cn(
                    milestone.completed
                      ? 'bg-green-500 text-white'
                      : 'bg-white/20 text-white'
                  )}
                >
                  {milestone.text}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        {editing && (
          <div className="flex justify-end gap-2 pt-2 border-t border-white/20">
            {loading ? (
              <Spinner size="sm" color="white" />
            ) : (
              <ButtonGroup>
                <Button
                  variant="secondary"
                  size="sm"
                  icon={X}
                  onClick={handleCancel}
                >
                  Cancel
                </Button>
                <Button
                  variant="success"
                  size="sm"
                  icon={Save}
                  onClick={handleSave}
                >
                  Save
                </Button>
              </ButtonGroup>
            )}
          </div>
        )}
      </div>
    </Card>
  );
};

GoalDisplay.displayName = 'GoalDisplay';
