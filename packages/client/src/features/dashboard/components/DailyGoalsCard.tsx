import React, { useState } from 'react';
import { Target, CheckCircle, BookOpen, BookMarked, Loader2 } from 'lucide-react';
import { useDailyGoals } from '../hooks/useDailyGoals';

export const DailyGoalsCard: React.FC = () => {
  const { preferences, dailyProgress, isLoading, error, isUpdating, updateGoal } = useDailyGoals();
  const [isEditing, setIsEditing] = useState(false);
  const [tempGoal, setTempGoal] = useState<number>(3);

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
        <div className="flex items-center justify-center gap-3 text-gray-500 dark:text-gray-400">
          <Loader2 className="animate-spin" size={20} />
          <span>Loading daily goals...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-red-200 dark:border-red-800 p-6">
        <div className="text-red-600 dark:text-red-400 text-sm">
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
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg text-indigo-600 dark:text-indigo-400">
            <Target size={20} />
          </div>
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">Daily Goal</h3>
        </div>
        {!isEditing && (
          <button
            onClick={() => {
              setTempGoal(goal);
              setIsEditing(true);
            }}
            className="text-sm text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 font-medium"
          >
            Edit
          </button>
        )}
      </div>

      {/* Goal Input */}
      {isEditing ? (
        <div className="mb-4 flex items-center gap-2">
          <label className="text-sm text-gray-600 dark:text-gray-400">
            Complete
          </label>
          <input
            type="number"
            min="1"
            max="10"
            value={tempGoal}
            onChange={(e) => setTempGoal(Math.max(1, Math.min(10, parseInt(e.target.value) || 1)))}
            className="w-16 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
            disabled={isUpdating}
          />
          <label className="text-sm text-gray-600 dark:text-gray-400">
            lessons today
          </label>
          <div className="flex gap-2 ml-auto">
            <button
              onClick={handleSaveGoal}
              disabled={isUpdating}
              className="px-3 py-1 bg-indigo-600 dark:bg-indigo-500 text-white rounded-lg hover:bg-indigo-700 dark:hover:bg-indigo-600 transition-colors text-sm font-medium disabled:opacity-50"
            >
              {isUpdating ? 'Saving...' : 'Save'}
            </button>
            <button
              onClick={handleCancel}
              disabled={isUpdating}
              className="px-3 py-1 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors text-sm font-medium disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="mb-4">
          <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">
            Goal: Complete <span className="font-semibold text-gray-900 dark:text-white">{goal}</span> lessons today
          </div>
        </div>
      )}

      {/* Progress Bar */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-2xl font-bold text-gray-900 dark:text-white">
            {completed} / {goal}
          </span>
          <span className="text-sm text-gray-500 dark:text-gray-400">
            {progressPercentage}%
          </span>
        </div>
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 overflow-hidden">
          <div
            className="h-full bg-indigo-600 dark:bg-indigo-500 transition-all duration-300 rounded-full"
            style={{ width: `${Math.min(100, progressPercentage)}%` }}
          />
        </div>
      </div>

      {/* Motivational Message */}
      <div className="mb-4">
        <p className="text-sm text-gray-600 dark:text-gray-400 italic">
          {getMotivationalMessage()}
        </p>
      </div>

      {/* Today's Activities */}
      {activities.length > 0 && (
        <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
          <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">
            Today's Activities
          </h4>
          <div className="space-y-2">
            {activities.slice(0, 5).map((activity, index) => (
              <div
                key={`${activity.type}-${activity.resourceId}-${index}`}
                className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400"
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
              <div className="text-xs text-gray-500 dark:text-gray-500">
                +{activities.length - 5} more
              </div>
            )}
          </div>
        </div>
      )}

      {activities.length === 0 && (
        <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
          <p className="text-sm text-gray-500 dark:text-gray-500 text-center">
            No activities yet today. Start learning to track your progress!
          </p>
        </div>
      )}
    </div>
  );
};

