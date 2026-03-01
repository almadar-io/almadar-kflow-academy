/**
 * DailyGoalsCard Organism Component
 * 
 * Displays and manages daily learning goals with progress tracking.
 * Uses Card, FormField, Icon, Typography, ProgressBar, Button atoms and Card molecule.
 */

import React, { useState } from 'react';
import { Target, CheckCircle, BookMarked } from 'lucide-react';
import { Card } from '../../molecules/Card';
import { Icon } from '../../atoms/Icon';
import { Typography } from '../../atoms/Typography';
import { ProgressBar } from '../../atoms/ProgressBar';
import { Button } from '../../atoms/Button';
import { Input } from '../../atoms/Input';
import { FormField } from '../../molecules/FormField';
import { Spinner } from '../../atoms/Spinner';
import { Alert } from '../../molecules/Alert';
import { cn } from '../../../utils/theme';

export interface DailyActivity {
  type: 'lesson_completed' | 'course_started';
  resourceId: string;
  resourceName: string;
  timestamp: number;
}

export interface DailyProgress {
  completed: number;
  progressPercentage: number;
  activities: DailyActivity[];
}

export interface DailyGoalsCardProps {
  /**
   * Current daily goal (lessons to complete)
   */
  goal?: number;
  
  /**
   * Daily progress data
   */
  dailyProgress?: DailyProgress;
  
  /**
   * Is loading
   */
  isLoading?: boolean;
  
  /**
   * Error message
   */
  error?: string | null;
  
  /**
   * Is updating goal
   */
  isUpdating?: boolean;
  
  /**
   * On update goal
   */
  onUpdateGoal?: (goal: number) => Promise<void>;
  
  /**
   * Additional CSS classes
   */
  className?: string;
}

export const DailyGoalsCard: React.FC<DailyGoalsCardProps> = ({
  goal: providedGoal = 3,
  dailyProgress,
  isLoading = false,
  error = null,
  isUpdating = false,
  onUpdateGoal,
  className,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [tempGoal, setTempGoal] = useState<number>(providedGoal);

  const goal = providedGoal;
  const completed = dailyProgress?.completed || 0;
  const progressPercentage = dailyProgress?.progressPercentage || 0;
  const activities = dailyProgress?.activities || [];

  const getMotivationalMessage = () => {
    if (progressPercentage === 0) {
      return "Start your learning journey today!";
    } else if (progressPercentage < 50) {
      return "Keep going! You're making progress.";
    } else if (progressPercentage < 100) {
      return "Almost there! Just a bit more.";
    } else {
      return "Excellent! Goal achieved! 🎉";
    }
  };

  const handleSaveGoal = async () => {
    if (onUpdateGoal) {
      try {
        await onUpdateGoal(tempGoal);
        setIsEditing(false);
      } catch (err) {
        // Error is handled by parent
      }
    } else {
      setIsEditing(false);
    }
  };

  const handleCancel = () => {
    setTempGoal(goal);
    setIsEditing(false);
  };

  if (isLoading) {
    return (
      <Card className={className} loading>
        <div className="flex items-center justify-center gap-3 py-8">
          <Spinner size="md" />
          <Typography variant="body" color="secondary">
            Loading daily goals...
          </Typography>
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={className}>
        <Alert variant="error" title="Error loading daily goals">
          {error}
        </Alert>
      </Card>
    );
  }

  return (
    <Card
      className={className}
      header={
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg text-indigo-600 dark:text-indigo-400">
              <Icon icon={Target} size="md" />
            </div>
            <Typography variant="h6">Daily Goal</Typography>
          </div>
          {!isEditing && onUpdateGoal && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setTempGoal(goal);
                setIsEditing(true);
              }}
            >
              Edit
            </Button>
          )}
        </div>
      }
    >
      {/* Goal Input */}
      {isEditing ? (
        <div className="mb-4 flex items-center gap-2 flex-wrap">
          <Typography variant="body" color="secondary" className="text-sm">
            Complete
          </Typography>
          <Input
            type="number"
            min={1}
            max={10}
            value={tempGoal.toString()}
            onChange={(e) => setTempGoal(Math.max(1, Math.min(10, parseInt(e.target.value) || 1)))}
            disabled={isUpdating}
            className="w-16"
          />
          <Typography variant="body" color="secondary" className="text-sm">
            lessons today
          </Typography>
          <div className="flex gap-2 ml-auto">
            <Button
              variant="primary"
              size="sm"
              onClick={handleSaveGoal}
              disabled={isUpdating}
              loading={isUpdating}
            >
              Save
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={handleCancel}
              disabled={isUpdating}
            >
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <div className="mb-4">
          <Typography variant="body" color="secondary" className="text-sm">
            Goal: Complete <span className="font-semibold text-gray-900 dark:text-white">{goal}</span> lessons today
          </Typography>
        </div>
      )}

      {/* Progress Bar */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <Typography variant="h4" className="text-2xl font-bold">
            {completed} / {goal}
          </Typography>
          <Typography variant="body" color="secondary" className="text-sm">
            {progressPercentage}%
          </Typography>
        </div>
        <ProgressBar
          value={Math.min(100, progressPercentage)}
          size="md"
        />
      </div>

      {/* Motivational Message */}
      <div className="mb-4">
        <Typography variant="body" color="secondary" className="text-sm italic">
          {getMotivationalMessage()}
        </Typography>
      </div>

      {/* Today's Activities */}
      {activities.length > 0 && (
        <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
          <Typography variant="body" className="text-sm font-semibold mb-2">
            Today's Activities
          </Typography>
          <div className="space-y-2">
            {activities.slice(0, 5).map((activity, index) => (
              <div
                key={`${activity.type}-${activity.resourceId}-${index}`}
                className="flex items-center gap-2"
              >
                <Icon
                  icon={activity.type === 'lesson_completed' ? CheckCircle : BookMarked}
                  size="sm"
                  color={activity.type === 'lesson_completed' ? 'text-green-500' : 'text-purple-500'}
                />
                <Typography variant="body" color="secondary" className="text-sm truncate">
                  {activity.resourceName}
                </Typography>
              </div>
            ))}
            {activities.length > 5 && (
              <Typography variant="body" color="secondary" className="text-xs">
                +{activities.length - 5} more
              </Typography>
            )}
          </div>
        </div>
      )}

      {activities.length === 0 && (
        <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
          <Typography variant="body" color="secondary" className="text-sm text-center">
            No activities yet today. Start learning to track your progress!
          </Typography>
        </div>
      )}
    </Card>
  );
};

DailyGoalsCard.displayName = 'DailyGoalsCard';
