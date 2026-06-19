import React, { useState } from 'react';
import { Target, CheckCircle, BookOpen, BookMarked, Loader2 } from 'lucide-react';
import { useDailyGoals } from '../hooks/useDailyGoals';

export const DailyGoalsCard: React.FC = () => {
  const { preferences, dailyProgress, isLoading, error, isUpdating, updateGoal } = useDailyGoals();
  const [isEditing, setIsEditing] = useState(false);
  const [tempGoal, setTempGoal] = useState<number>(3);

  if (isLoading) {
    return (
      <div className="bg-card rounded-xl shadow-sm border border-border p-6">
        <div className="flex items-center justify-center gap-3 text-muted-foreground">
          <Loader2 className="animate-spin" size={20} />
          <span>Loading daily goals...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-card rounded-xl shadow-sm border border-error p-6">
        <div className="text-error text-sm">
          Error loading daily goals: {error}
        </div>
      </div>
    );
  }

  const goal = preferences?.dailyLessonGoal || 3;
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
    try {
      await updateGoal(tempGoal);
      setIsEditing(false);
    } catch (err) {
      // Error is handled by the hook
    }
  };

  const handleCancel = () => {
    setTempGoal(goal);
    setIsEditing(false);
  };

  return (
    <div className="bg-card rounded-xl shadow-sm border border-border p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-surface rounded-lg text-primary">
            <Target size={20} />
          </div>
          <h3 className="text-lg font-bold text-foreground">Daily Goal</h3>
        </div>
        {!isEditing && (
          <button
            onClick={() => {
              setTempGoal(goal);
              setIsEditing(true);
            }}
            className="text-sm text-primary hover:text-primary font-medium"
          >
            Edit
          </button>
        )}
      </div>

      {/* Goal Input */}
      {isEditing ? (
        <div className="mb-4 flex items-center gap-2">
          <label className="text-sm text-muted-foreground">
            Complete
          </label>
          <input
            type="number"
            min="1"
            max="10"
            value={tempGoal}
            onChange={(e) => setTempGoal(Math.max(1, Math.min(10, parseInt(e.target.value) || 1)))}
            className="w-16 px-2 py-1 border border-border rounded-lg bg-card text-foreground text-sm"
            disabled={isUpdating}
          />
          <label className="text-sm text-muted-foreground">
            lessons today
          </label>
          <div className="flex gap-2 ml-auto">
            <button
              onClick={handleSaveGoal}
              disabled={isUpdating}
              className="px-3 py-1 bg-primary text-primary-foreground rounded-lg hover:bg-primary transition-colors text-sm font-medium disabled:opacity-50"
            >
              {isUpdating ? 'Saving...' : 'Save'}
            </button>
            <button
              onClick={handleCancel}
              disabled={isUpdating}
              className="px-3 py-1 bg-surface text-foreground rounded-lg hover:bg-surface-hover transition-colors text-sm font-medium disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="mb-4">
          <div className="text-sm text-muted-foreground mb-2">
            Goal: Complete <span className="font-semibold text-foreground">{goal}</span> lessons today
          </div>
        </div>
      )}

      {/* Progress Bar */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-2xl font-bold text-foreground">
            {completed} / {goal}
          </span>
          <span className="text-sm text-muted-foreground">
            {progressPercentage}%
          </span>
        </div>
        <div className="w-full bg-surface rounded-full h-3 overflow-hidden">
          <div
            className="h-full bg-primary transition-all duration-300 rounded-full"
            style={{ width: `${Math.min(100, progressPercentage)}%` }}
          />
        </div>
      </div>

      {/* Motivational Message */}
      <div className="mb-4">
        <p className="text-sm text-muted-foreground italic">
          {getMotivationalMessage()}
        </p>
      </div>

      {/* Today's Activities */}
      {activities.length > 0 && (
        <div className="border-t border-border pt-4">
          <h4 className="text-sm font-semibold text-foreground mb-2">
            Today's Activities
          </h4>
          <div className="space-y-2">
            {activities.slice(0, 5).map((activity, index) => (
              <div
                key={`${activity.type}-${activity.resourceId}-${index}`}
                className="flex items-center gap-2 text-sm text-muted-foreground"
              >
                {activity.type === 'lesson_completed' ? (
                  <CheckCircle size={16} className="text-green-500" />
                ) : (
                  <BookMarked size={16} className="text-purple-500" />
                )}
                <span className="truncate">{activity.resourceName}</span>
              </div>
            ))}
            {activities.length > 5 && (
              <div className="text-xs text-muted-foreground">
                +{activities.length - 5} more
              </div>
            )}
          </div>
        </div>
      )}

      {activities.length === 0 && (
        <div className="border-t border-border pt-4">
          <p className="text-sm text-muted-foreground text-center">
            No activities yet today. Start learning to track your progress!
          </p>
        </div>
      )}
    </div>
  );
};

