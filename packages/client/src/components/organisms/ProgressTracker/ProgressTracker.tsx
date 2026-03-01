/**
 * ProgressTracker Organism Component
 * 
 * A component for tracking learning progress with overview, progress bar, statistics, current lesson, and next lesson.
 * Uses Card, ProgressCard, StatCard molecules and ProgressBar, Typography, Icon, Badge, Button atoms.
 */

import React from 'react';
import type { LucideIcon } from 'lucide-react';
import { CheckCircle, Play, Trophy } from 'lucide-react';
import { Card } from '../../molecules/Card';
import { ProgressCard } from '../../molecules/ProgressCard';
import { StatCard } from '../../molecules/StatCard';
import { ProgressBar } from '../../atoms/ProgressBar';
import { Typography } from '../../atoms/Typography';
import { Icon } from '../../atoms/Icon';
import { Badge } from '../../atoms/Badge';
import { Button } from '../../atoms/Button';
import { cn } from '../../../utils/theme';

export interface Lesson {
  /**
   * Lesson ID
   */
  id: string;
  
  /**
   * Lesson title
   */
  title: string;
  
  /**
   * Lesson status
   */
  status: 'completed' | 'current' | 'upcoming' | 'locked';
  
  /**
   * On lesson click
   */
  onClick?: () => void;
}

export interface ProgressTrackerProps {
  /**
   * Overall progress (0-100)
   */
  progress: number;
  
  /**
   * Total lessons
   */
  totalLessons: number;
  
  /**
   * Completed lessons
   */
  completedLessons: number;
  
  /**
   * Current lesson
   */
  currentLesson?: Lesson;
  
  /**
   * Next lesson
   */
  nextLesson?: Lesson;
  
  /**
   * All lessons
   */
  lessons?: Lesson[];
  
  /**
   * Statistics to display
   */
  statistics?: Array<{
    label: string;
    value: string | number;
    icon?: LucideIcon;
  }>;
  
  /**
   * Show celebration on completion
   * @default false
   */
  showCelebration?: boolean;
  
  /**
   * Additional CSS classes
   */
  className?: string;
}

export const ProgressTracker: React.FC<ProgressTrackerProps> = ({
  progress,
  totalLessons,
  completedLessons,
  currentLesson,
  nextLesson,
  lessons,
  statistics,
  showCelebration = false,
  className,
}) => {
  const isCompleted = progress === 100;

  return (
    <Card className={cn('', className)}>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <Typography variant="h5" className="mb-2">
            Learning Progress
          </Typography>
          <ProgressBar
            value={progress}
            color={isCompleted ? 'success' : 'primary'}
            showPercentage
            className="mb-2"
          />
          <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
            <span>{completedLessons} of {totalLessons} lessons completed</span>
            {isCompleted && showCelebration && (
              <div className="flex items-center gap-1 text-green-600 dark:text-green-400">
                <Icon icon={Trophy} size="sm" />
                <Typography variant="small" weight="semibold">Completed!</Typography>
              </div>
            )}
          </div>
        </div>

        {/* Statistics */}
        {statistics && statistics.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {statistics.map((stat, index) => (
              <StatCard
                key={index}
                label={stat.label}
                value={stat.value}
                icon={stat.icon}
                iconVariant="primary"
              />
            ))}
          </div>
        )}

        {/* Current Lesson */}
        {currentLesson && (
          <div className="p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg border border-indigo-200 dark:border-indigo-800">
            <div className="flex items-center gap-2 mb-2">
              <Icon icon={Play} size="sm" className="text-indigo-600 dark:text-indigo-400" />
              <Typography variant="small" weight="semibold" className="text-indigo-900 dark:text-indigo-100">
                Current Lesson
              </Typography>
            </div>
            <Typography variant="body" className="mb-2">
              {currentLesson.title}
            </Typography>
            <Button
              variant="primary"
              size="sm"
              onClick={currentLesson.onClick}
            >
              Continue Learning
            </Button>
          </div>
        )}

        {/* Next Lesson */}
        {nextLesson && !currentLesson && (
          <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-2 mb-2">
              <Icon icon={Play} size="sm" />
              <Typography variant="small" weight="semibold">
                Next Lesson
              </Typography>
            </div>
            <Typography variant="body" className="mb-2">
              {nextLesson.title}
            </Typography>
            <Button
              variant="primary"
              size="sm"
              onClick={nextLesson.onClick}
            >
              Start Lesson
            </Button>
          </div>
        )}

        {/* Lessons List */}
        {lessons && lessons.length > 0 && (
          <div className="space-y-2">
            <Typography variant="h6" className="mb-3">
              All Lessons
            </Typography>
            {lessons.map((lesson) => (
              <div
                key={lesson.id}
                className={cn(
                  'flex items-center justify-between p-3 rounded-lg border',
                  'hover:bg-gray-50 dark:hover:bg-gray-700',
                  lesson.status === 'current' && 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-200 dark:border-indigo-800',
                  lesson.status === 'completed' && 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800',
                  lesson.status === 'locked' && 'opacity-50'
                )}
              >
                <div className="flex items-center gap-3 flex-1">
                  {lesson.status === 'completed' && (
                    <Icon icon={CheckCircle} size="sm" className="text-green-600 dark:text-green-400" />
                  )}
                  {lesson.status === 'current' && (
                    <Icon icon={Play} size="sm" className="text-indigo-600 dark:text-indigo-400" />
                  )}
                  <Typography variant="body">{lesson.title}</Typography>
                </div>
                <Badge
                  variant={
                    lesson.status === 'completed' ? 'success' :
                    lesson.status === 'current' ? 'primary' :
                    lesson.status === 'locked' ? 'default' : 'default'
                  }
                  size="sm"
                >
                  {lesson.status}
                </Badge>
              </div>
            ))}
          </div>
        )}
      </div>
    </Card>
  );
};

ProgressTracker.displayName = 'ProgressTracker';
