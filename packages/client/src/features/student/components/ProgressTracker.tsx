import React from 'react';
import { CheckCircle2, Circle, Lock, ChevronRight, BookOpen } from 'lucide-react';
import type { ProgressData } from '../types';

interface ProgressTrackerProps {
  progress: ProgressData | null;
  isLoading: boolean;
  error: string | null;
  onLessonClick?: (lessonId: string) => void;
}

const ProgressTracker: React.FC<ProgressTrackerProps> = ({
  progress,
  isLoading,
  error,
  onLessonClick,
}) => {

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (error || !progress) {
    return (
      <div className="text-center py-8 text-gray-500 dark:text-gray-400">
        {error || 'Progress data not available'}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Progress Overview */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Course Progress
          </h3>
          <span className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
            {progress.progressPercentage}%
          </span>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 mb-4">
          <div
            className="bg-indigo-600 h-3 rounded-full transition-all duration-300"
            style={{ width: `${progress.progressPercentage}%` }}
          />
        </div>

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-500 dark:text-gray-400">Lessons</span>
            <div className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              {progress.completedLessons} / {progress.totalLessons}
            </div>
          </div>
          <div>
            <span className="text-gray-500 dark:text-gray-400">Modules</span>
            <div className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              {progress.completedModules} / {progress.totalModules}
            </div>
          </div>
        </div>
      </div>

      {/* Current Lesson */}
      {progress.currentLesson && (
        <div className="bg-indigo-50 dark:bg-indigo-900/20 rounded-lg border border-indigo-200 dark:border-indigo-800 p-4">
          <div className="flex items-center gap-2 mb-2">
            <BookOpen size={18} className="text-indigo-600 dark:text-indigo-400" />
            <span className="text-sm font-medium text-indigo-900 dark:text-indigo-100">
              Current Lesson
            </span>
          </div>
          <h4 className="font-semibold text-gray-900 dark:text-gray-100">
            {progress.currentLesson.title || progress.currentLesson.conceptName}
          </h4>
          {progress.currentModule && (
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              {progress.currentModule.title || progress.currentModule.conceptName}
            </p>
          )}
          {onLessonClick && (
            <button
              onClick={() => onLessonClick(progress.currentLesson.id)}
              className="mt-3 text-sm text-indigo-600 dark:text-indigo-400 hover:underline"
            >
              {progress.enrollment?.completedLessonIds?.includes(progress.currentLesson.id)
                ? 'Continue Learning →'
                : 'Start Learning →'}
            </button>
          )}
        </div>
      )}

      {/* Next Lesson */}
      {progress.nextLesson && (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">
                Next Lesson
              </div>
              <h4 className="font-semibold text-gray-900 dark:text-gray-100">
                {progress.nextLesson.title || progress.nextLesson.conceptName}
              </h4>
            </div>
            {onLessonClick && (
              <button
                onClick={() => onLessonClick(progress.nextLesson.id)}
                className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-md transition-colors"
              >
                Start
                <ChevronRight size={16} />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Completion Status */}
      {progress.progressPercentage === 100 && (
        <div className="bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800 p-4 text-center">
          <CheckCircle2 size={32} className="mx-auto text-green-600 dark:text-green-400 mb-2" />
          <h4 className="font-semibold text-green-900 dark:text-green-100">
            Course Completed!
          </h4>
          <p className="text-sm text-green-700 dark:text-green-300 mt-1">
            Congratulations on completing all lessons
          </p>
        </div>
      )}
    </div>
  );
};

export default ProgressTracker;

