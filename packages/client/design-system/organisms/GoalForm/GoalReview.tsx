/**
 * Goal Review Component
 * Displays the created learning goal and allows editing before confirmation
 */

import React, { useState } from 'react';
import { Edit2, Check, X } from 'lucide-react';
import type { LearningGoal, Milestone } from '@features/learning/goalApi';
import { updateGoal } from '@features/learning/goalApi';
import { GoalOverview } from './GoalOverview';
import { Box, Stack, Typography, Button, Input, Textarea, useTranslate } from '@almadar/ui';

interface GoalReviewProps {
  goal: LearningGoal;
  onConfirm: () => void;
  onCancel?: () => void;
}

export const GoalReview: React.FC<GoalReviewProps> = ({ goal, onConfirm }) => {
  const { t } = useTranslate();
  const [isEditing, setIsEditing] = useState(false);
  const [editedGoal, setEditedGoal] = useState<Partial<LearningGoal>>({
    title: goal.title,
    description: goal.description,
    target: goal.target,
    estimatedTime: goal.estimatedTime,
  });
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updateGoal(goal.id, {
        title: editedGoal.title,
        description: editedGoal.description,
        target: editedGoal.target,
        estimatedTime: editedGoal.estimatedTime,
      });
      setIsEditing(false);
      // Update the goal object with edited values
      Object.assign(goal, editedGoal);
    } catch (error) {
      console.error('Failed to update goal:', error);
    } finally {
      setIsSaving(false);
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

  return (
    <Box className="w-full">
      <Stack direction="horizontal" justify="between" align="start" gap="md" wrap className="mb-4 sm:mb-6">
        <Typography variant="h2" weight="bold" className="text-foreground">
          {t('learning.reviewYourGoal')}
        </Typography>
        {!isEditing ? (
          <Button variant="secondary" size="sm" leftIcon={Edit2} onClick={() => setIsEditing(true)}>
            {t('learningGoal.edit')}
          </Button>
        ) : (
          <Stack direction="horizontal" gap="sm">
            <Button variant="primary" size="sm" leftIcon={Check} onClick={handleSave} disabled={isSaving}>
              {t('learningGoal.save')}
            </Button>
            <Button variant="secondary" size="sm" leftIcon={X} onClick={handleCancelEdit} disabled={isSaving}>
              {t('learningGoal.cancel')}
            </Button>
          </Stack>
        )}
      </Stack>

      <Stack direction="vertical" gap="lg">
        {isEditing ? (
          <>
            {/* Title */}
            <Box>
              <Typography as="label" variant="small" weight="semibold" className="text-foreground mb-2 block">
                {t('learning.titleLabel')}
              </Typography>
              <Input
                value={displayGoal.title || ''}
                onChange={(e) => setEditedGoal({ ...editedGoal, title: e.target.value })}
              />
            </Box>

            {/* Description */}
            <Box>
              <Typography as="label" variant="small" weight="semibold" className="text-foreground mb-2 block">
                {t('learning.descriptionLabel')}
              </Typography>
              <Textarea
                value={displayGoal.description || ''}
                onChange={(e) => setEditedGoal({ ...editedGoal, description: e.target.value })}
                rows={4}
                className="resize-none"
              />
            </Box>

            {/* Target */}
            <Box>
              <Typography as="label" variant="small" weight="semibold" className="text-foreground mb-2 block">
                {t('learning.targetLabel')}
              </Typography>
              <Input
                value={displayGoal.target || ''}
                onChange={(e) => setEditedGoal({ ...editedGoal, target: e.target.value })}
              />
            </Box>

            {/* Type */}
            <Box>
              <Typography as="label" variant="small" weight="semibold" className="text-foreground mb-2 block">
                {t('learning.goalType')}
              </Typography>
              <Typography variant="body" className="text-muted-foreground capitalize">{goal.type}</Typography>
            </Box>

            {/* Estimated Time */}
            {displayGoal.estimatedTime && (
              <Box>
                <Typography as="label" variant="small" weight="semibold" className="text-foreground mb-2 block">
                  {t('learning.estimatedTime')}
                </Typography>
                <Input
                  inputType="number"
                  value={displayGoal.estimatedTime || ''}
                  onChange={(e) => setEditedGoal({ ...editedGoal, estimatedTime: parseInt(e.target.value) || undefined })}
                  placeholder={t('learning.hoursPlaceholder')}
                />
              </Box>
            )}

            {/* Milestones */}
            {goal.milestones && goal.milestones.length > 0 && (
              <Box>
                <Typography as="label" variant="small" weight="semibold" className="text-foreground mb-2 block">
                  {t('learning.milestones')}
                </Typography>
                <Stack direction="vertical" gap="sm">
                  {goal.milestones.map((milestone: Milestone) => (
                    <Typography key={milestone.id} variant="body" className="text-muted-foreground">
                      • {milestone.title}
                      {milestone.description && (
                        <Typography as="span" variant="small" className="text-muted-foreground ms-2">
                          - {milestone.description}
                        </Typography>
                      )}
                    </Typography>
                  ))}
                </Stack>
              </Box>
            )}
          </>
        ) : (
          <GoalOverview goal={goal} />
        )}
      </Stack>

      {/* Action Buttons */}
      <Box className="mt-6 pt-4 -mx-6 -mb-6 px-6 pb-4 border-t border-border bg-surface">
        <Stack direction="horizontal" justify="end" gap="md">
          <Button variant="primary" onClick={onConfirm} disabled={isEditing}>
            {t('learning.confirmAndContinue')}
          </Button>
        </Stack>
      </Box>
    </Box>
  );
};
