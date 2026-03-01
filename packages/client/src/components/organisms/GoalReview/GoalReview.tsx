/**
 * GoalReview Organism Component
 * 
 * Displays and allows editing of learning goals before confirmation.
 * Uses Card, FormField, Input, Textarea, Button, Icon, Typography atoms and Card, FormField molecules.
 */

import React, { useState } from 'react';
import { Edit2, Check, X, Circle, CheckCircle2 } from 'lucide-react';
import { Card } from '../../molecules/Card';
import { FormField } from '../../molecules/FormField';
import { Input } from '../../atoms/Input';
import { Textarea } from '../../atoms/Textarea';
import { Button } from '../../atoms/Button';
import { Icon } from '../../atoms/Icon';
import { Typography } from '../../atoms/Typography';
import { ButtonGroup } from '../../molecules/ButtonGroup';
import { Spinner } from '../../atoms/Spinner';
import { cn } from '../../../utils/theme';

export interface Milestone {
  id: string;
  title: string;
  description?: string;
}

export interface LearningGoal {
  id: string;
  title: string;
  description: string;
  target: string;
  type: 'project_based' | 'topic_based';
  estimatedTime?: number;
  milestones?: Milestone[];
}

export interface GoalReviewProps {
  /**
   * Learning goal to review
   */
  goal: LearningGoal;

  /**
   * On confirm
   */
  onConfirm: () => void;

  /**
   * On cancel
   */
  onCancel?: () => void;

  /**
   * On update goal
   */
  onUpdateGoal?: (goalId: string, updates: Partial<LearningGoal>) => Promise<void>;

  /**
   * Is saving
   */
  isSaving?: boolean;

  /**
   * Additional CSS classes
   */
  className?: string;
}

export const GoalReview: React.FC<GoalReviewProps> = ({
  goal,
  onConfirm,
  onCancel,
  onUpdateGoal,
  isSaving = false,
  className,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedGoal, setEditedGoal] = useState<Partial<LearningGoal>>({
    title: goal.title,
    description: goal.description,
    target: goal.target,
    estimatedTime: goal.estimatedTime,
  });

  const handleSave = async () => {
    if (onUpdateGoal) {
      try {
        await onUpdateGoal(goal.id, editedGoal);
        setIsEditing(false);
      } catch (error) {
        console.error('Failed to update goal:', error);
      }
    } else {
      setIsEditing(false);
    }
  };

  const handleCancelEdit = () => {
    setEditedGoal({
      title: goal.title,
      description: goal.description,
      target: goal.target,
      estimatedTime: goal.estimatedTime,
    });
    setIsEditing(false);
  };

  const displayGoal = isEditing ? editedGoal : goal;

  // Render milestones with a nice timeline-style display
  const renderMilestones = () => {
    if (!goal.milestones || goal.milestones.length === 0) return null;

    return (
      <div className="space-y-4 relative">
        {/* Vertical Line for Timeline Effect */}
        <div className="absolute left-[19px] top-4 bottom-4 w-0.5 bg-gray-200 dark:bg-gray-700 -z-10" />

        {goal.milestones.map((milestone, index) => {
          const isLast = index === goal.milestones!.length - 1;

          return (
            <div key={milestone.id} className="group relative flex gap-4">
              {/* Icon/Status Indicator */}
              <div className="flex-shrink-0 w-10 h-10 rounded-full border-4 flex items-center justify-center bg-white dark:bg-gray-800 border-indigo-100 dark:border-indigo-900/30 text-indigo-600 dark:text-indigo-400 transition-colors duration-300">
                <Circle size={16} className="fill-indigo-50 dark:fill-indigo-900/20" />
              </div>

              {/* Content Card */}
              <div className="flex-1 min-w-0 rounded-xl border border-indigo-200 dark:border-indigo-800 bg-white dark:bg-gray-800 shadow-sm p-4 transition-all duration-200">
                <div className="flex items-start justify-between gap-4 mb-2">
                  <Typography variant="h6" className="font-semibold text-gray-900 dark:text-white">
                    {milestone.title}
                  </Typography>
                </div>

                {milestone.description && (
                  <Typography variant="body" color="secondary" className="text-sm">
                    {milestone.description}
                  </Typography>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className={cn('w-full', className)}>
      <Card
        header={
          <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
            <Typography variant="h5" className="text-xl sm:text-2xl font-bold">
              Review Your Learning Goal
            </Typography>
            {!isEditing ? (
              <Button
                variant="secondary"
                size="sm"
                icon={Edit2}
                onClick={() => setIsEditing(true)}
              >
                Edit
              </Button>
            ) : (
              <ButtonGroup>
                <Button
                  variant="primary"
                  size="sm"
                  icon={Check}
                  onClick={handleSave}
                  disabled={isSaving}
                  loading={isSaving}
                >
                  Save
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  icon={X}
                  onClick={handleCancelEdit}
                  disabled={isSaving}
                >
                  Cancel
                </Button>
              </ButtonGroup>
            )}
          </div>
        }
        footer={
          <div className="flex justify-end gap-4">
            <Button
              variant="primary"
              onClick={onConfirm}
              disabled={isEditing}
            >
              Confirm & Continue
            </Button>
          </div>
        }
      >
        <div className="space-y-6">
          {isEditing ? (
            <>
              {/* Title */}
              <FormField
                type="input"
                label="Title"
                required
                inputProps={{
                  type: 'text',
                  value: displayGoal.title || '',
                  onChange: (e) => setEditedGoal({ ...editedGoal, title: e.target.value }),
                }}
              />

              {/* Description */}
              <FormField
                type="textarea"
                label="Description"
                required
                inputProps={{
                  value: displayGoal.description || '',
                  onChange: (e) => setEditedGoal({ ...editedGoal, description: e.target.value }),
                  rows: 4,
                }}
              />

              {/* Target */}
              <FormField
                type="input"
                label="Target"
                required
                inputProps={{
                  type: 'text',
                  value: displayGoal.target || '',
                  onChange: (e) => setEditedGoal({ ...editedGoal, target: e.target.value }),
                }}
              />

              {/* Type */}
              <div>
                <Typography variant="body" className="mb-1.5 font-medium">
                  Goal Type
                </Typography>
                <Typography variant="body" className="capitalize">
                  {goal.type.replace('_', ' ')}
                </Typography>
              </div>

              {/* Estimated Time */}
              {displayGoal.estimatedTime !== undefined && (
                <FormField
                  type="input"
                  label="Estimated Time (hours)"
                  inputProps={{
                    type: 'number',
                    value: displayGoal.estimatedTime?.toString() || '',
                    onChange: (e) => setEditedGoal({ ...editedGoal, estimatedTime: parseInt(e.target.value) || undefined }),
                    placeholder: 'Hours',
                  }}
                />
              )}

              {/* Milestones - Read-only in edit mode */}
              {goal.milestones && goal.milestones.length > 0 && (
                <div>
                  <Typography variant="body" className="mb-4 font-medium">
                    Milestones
                  </Typography>
                  {renderMilestones()}
                </div>
              )}
            </>
          ) : (
            <>
              {/* Display Mode */}
              <div>
                <Typography variant="h6" className="mb-2">Title</Typography>
                <Typography variant="body">{goal.title}</Typography>
              </div>

              <div>
                <Typography variant="h6" className="mb-2">Description</Typography>
                <Typography variant="body" color="secondary">{goal.description}</Typography>
              </div>

              <div>
                <Typography variant="h6" className="mb-2">Target</Typography>
                <Typography variant="body">{goal.target}</Typography>
              </div>

              <div>
                <Typography variant="h6" className="mb-2">Goal Type</Typography>
                <Typography variant="body" className="capitalize">
                  {goal.type.replace('_', ' ')}
                </Typography>
              </div>

              {goal.estimatedTime && (
                <div>
                  <Typography variant="h6" className="mb-2">Estimated Time</Typography>
                  <Typography variant="body">{goal.estimatedTime} hours</Typography>
                </div>
              )}

              {/* Milestones - Nice timeline display */}
              {goal.milestones && goal.milestones.length > 0 && (
                <div>
                  <Typography variant="h6" className="mb-4">Milestones</Typography>
                  {renderMilestones()}
                </div>
              )}
            </>
          )}
        </div>
      </Card>
    </div>
  );
};

GoalReview.displayName = 'GoalReview';
