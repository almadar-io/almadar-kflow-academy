/**
 * DailyGoalsCard Organism
 *
 * Daily lesson goal with editable target (NumberStepper), progress bar,
 * motivational message, and today's activities. Reads/mutates via
 * useDailyGoals. Entity-interacting → organism.
 */

import React, { useState } from 'react';
import { Target, CheckCircle, BookMarked } from 'lucide-react';
import {
  Card,
  CardHeader,
  CardContent,
  CardFooter,
  Box,
  VStack,
  HStack,
  Typography,
  Icon,
  Button,
  Divider,
  ProgressBar,
  NumberStepper,
  LoadingState,
  ErrorState,
  useTranslate,
} from '@almadar/ui';
import { useDailyGoals } from '@features/dashboard/hooks/useDailyGoals';

export function DailyGoalsCard(): React.JSX.Element {
  const { t } = useTranslate();
  const { preferences, dailyProgress, isLoading, error, isUpdating, updateGoal } = useDailyGoals();
  const [isEditing, setIsEditing] = useState(false);
  const [tempGoal, setTempGoal] = useState<number>(3);

  if (isLoading) {
    return (
      <Card variant="bordered" padding="lg">
        <LoadingState message={t('dashboard.loadingDailyGoals')} />
      </Card>
    );
  }

  if (error) {
    return (
      <Card variant="bordered" padding="lg">
        <ErrorState message={`${t('dashboard.errorLoadingDailyGoals')}: ${error}`} />
      </Card>
    );
  }

  const goal = preferences?.dailyLessonGoal || 3;
  const completed = dailyProgress?.completed || 0;
  const progressPercentage = dailyProgress?.progressPercentage || 0;
  const activities = dailyProgress?.activities || [];

  const getMotivationalMessage = (): string => {
    if (progressPercentage === 0) return t('dashboard.motivationStart');
    if (progressPercentage < 50) return t('dashboard.motivationKeepGoing');
    if (progressPercentage < 100) return t('dashboard.motivationAlmostThere');
    return t('dashboard.motivationGoalAchieved');
  };

  const handleSaveGoal = async (): Promise<void> => {
    try {
      await updateGoal(tempGoal);
      setIsEditing(false);
    } catch {
      // Error is surfaced by the hook
    }
  };

  const handleCancel = (): void => {
    setTempGoal(goal);
    setIsEditing(false);
  };

  return (
    <Card variant="bordered" padding="lg">
      <CardHeader>
        <HStack justify="between" align="center">
          <HStack gap="sm" align="center">
            <Icon icon={Target} size="md" color="primary" />
            <Typography variant="h3" weight="bold">
              {t('dashboard.dailyGoal')}
            </Typography>
          </HStack>
          {!isEditing && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setTempGoal(goal);
                setIsEditing(true);
              }}
            >
              {t('learningGoal.edit')}
            </Button>
          )}
        </HStack>
      </CardHeader>

      <CardContent>
        <VStack gap="md">
          {isEditing ? (
            <HStack gap="sm" align="center">
              <Typography variant="body2" color="muted">
                {t('dashboard.complete')}
              </Typography>
              <NumberStepper
                value={tempGoal}
                min={1}
                max={10}
                size="sm"
                disabled={isUpdating}
                onChange={setTempGoal}
                label={t('dashboard.dailyGoal')}
              />
              <Typography variant="body2" color="muted">
                {t('dashboard.lessonsToday')}
              </Typography>
              <HStack gap="xs" justify="end" className="ms-auto">
                <Button variant="primary" size="sm" disabled={isUpdating} onClick={handleSaveGoal}>
                  {isUpdating ? t('learningGoal.saving') : t('learningGoal.save')}
                </Button>
                <Button variant="secondary" size="sm" disabled={isUpdating} onClick={handleCancel}>
                  {t('learningGoal.cancel')}
                </Button>
              </HStack>
            </HStack>
          ) : (
            <Typography variant="body2" color="muted">
              {t('dashboard.goal')}: {t('dashboard.complete')}{' '}
              <Typography as="span" variant="body2" weight="semibold">
                {goal}
              </Typography>{' '}
              {t('dashboard.lessonsToday')}
            </Typography>
          )}

          <Box>
            <HStack justify="between" align="center">
              <Typography variant="h4" weight="bold">
                {completed} / {goal}
              </Typography>
              <Typography variant="caption" color="muted">
                {progressPercentage}%
              </Typography>
            </HStack>
            <ProgressBar
              value={Math.min(100, progressPercentage)}
              max={100}
              variant="primary"
              size="md"
            />
          </Box>

          <Typography variant="body2" color="muted">
            {getMotivationalMessage()}
          </Typography>
        </VStack>
      </CardContent>

      <CardFooter>
        <Box className="w-full">
          <Divider />
          {activities.length > 0 ? (
            <VStack gap="sm">
              <Typography variant="caption" weight="semibold">
                {t('dashboard.todaysActivities')}
              </Typography>
              {activities.slice(0, 5).map((activity, index) => (
                <HStack key={`${activity.type}-${activity.resourceId}-${index}`} gap="xs" align="center">
                  <Icon
                    icon={activity.type === 'lesson_completed' ? CheckCircle : BookMarked}
                    size="sm"
                    className={
                      activity.type === 'lesson_completed'
                        ? 'text-[var(--color-success)]'
                        : 'text-[var(--color-primary)]'
                    }
                  />
                  <Typography variant="body2" color="muted">
                    {activity.resourceName}
                  </Typography>
                </HStack>
              ))}
              {activities.length > 5 && (
                <Typography variant="caption" color="muted">
                  +{activities.length - 5} more
                </Typography>
              )}
            </VStack>
          ) : (
            <Typography variant="body2" color="muted">
              {t('dashboard.noActivitiesYet')}
            </Typography>
          )}
        </Box>
      </CardFooter>
    </Card>
  );
}
