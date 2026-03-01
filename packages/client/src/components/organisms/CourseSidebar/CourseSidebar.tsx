/**
 * CourseSidebar Organism Component
 * 
 * A sidebar component for courses with title, progress bar, module list, lesson list, and expand/collapse.
 * Uses Card, Accordion, Menu molecules and Typography, ProgressBar, Icon, Badge, Button, Divider atoms.
 */

import React, { useState } from 'react';
import type { LucideIcon } from 'lucide-react';
import { Lock, Unlock, CheckCircle, Play } from 'lucide-react';
import { Card } from '../../molecules/Card';
import { Accordion, AccordionItem } from '../../molecules/Accordion';
import { Menu, MenuItem } from '../../molecules/Menu';
import { Typography } from '../../atoms/Typography';
import { ProgressBar } from '../../atoms/ProgressBar';
import { Icon } from '../../atoms/Icon';
import { Badge } from '../../atoms/Badge';
import { Button } from '../../atoms/Button';
import { Divider } from '../../atoms/Divider';
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
   * Lesson duration (minutes)
   */
  duration?: number;
  
  /**
   * On lesson click
   */
  onClick?: () => void;
}

export interface Module {
  /**
   * Module ID
   */
  id: string;
  
  /**
   * Module title
   */
  title: string;
  
  /**
   * Module lessons
   */
  lessons: Lesson[];
  
  /**
   * Is expanded
   */
  expanded?: boolean;
}

export interface CourseSidebarProps {
  /**
   * Course title
   */
  title: string;
  
  /**
   * Course progress (0-100)
   */
  progress: number;
  
  /**
   * Course modules
   */
  modules: Module[];
  
  /**
   * Current lesson ID
   */
  currentLessonId?: string;
  
  /**
   * Additional CSS classes
   */
  className?: string;
}

export const CourseSidebar: React.FC<CourseSidebarProps> = ({
  title,
  progress,
  modules,
  currentLessonId,
  className,
}) => {
  const [expandedModules, setExpandedModules] = useState<Set<string>>(
    new Set(modules.filter(m => m.expanded).map(m => m.id))
  );

  const toggleModule = (moduleId: string) => {
    setExpandedModules(prev => {
      const newSet = new Set(prev);
      if (newSet.has(moduleId)) {
        newSet.delete(moduleId);
      } else {
        newSet.add(moduleId);
      }
      return newSet;
    });
  };

  const accordionItems: AccordionItem[] = modules.map((module) => ({
    id: module.id,
    header: (
      <div className="flex items-center justify-between w-full">
        <Typography variant="body" weight="medium">
          {module.title}
        </Typography>
        <Badge variant="default" size="sm">
          {module.lessons.length}
        </Badge>
      </div>
    ),
    content: (
      <div className="space-y-1 pl-4">
        {module.lessons.map((lesson) => {
          const isCurrent = lesson.id === currentLessonId;
          const statusIcon =
            lesson.status === 'completed' ? CheckCircle :
            lesson.status === 'current' ? Play :
            lesson.status === 'locked' ? Lock : undefined;

          return (
            <button
              key={lesson.id}
              type="button"
              onClick={lesson.onClick}
              disabled={lesson.status === 'locked'}
              className={cn(
                'w-full flex items-center justify-between gap-2 p-2 rounded-lg text-left',
                'hover:bg-gray-100 dark:hover:bg-gray-700',
                'transition-colors',
                isCurrent && 'bg-indigo-50 dark:bg-indigo-900/20',
                lesson.status === 'locked' && 'opacity-50 cursor-not-allowed',
                lesson.status === 'completed' && 'hover:bg-green-50 dark:hover:bg-green-900/10'
              )}
            >
              <div className="flex items-center gap-2 flex-1 min-w-0">
                {statusIcon && (
                  <Icon
                    icon={statusIcon}
                    size="sm"
                    className={cn(
                      lesson.status === 'completed' && 'text-green-600 dark:text-green-400 flex-shrink-0',
                      lesson.status === 'current' && 'text-indigo-600 dark:text-indigo-400 flex-shrink-0',
                      lesson.status === 'locked' && 'text-gray-400 flex-shrink-0',
                      lesson.status === 'upcoming' && 'text-gray-500 dark:text-gray-400 flex-shrink-0'
                    )}
                  />
                )}
                <Typography
                  variant="small"
                  className={cn(
                    'truncate',
                    isCurrent && 'font-semibold text-indigo-600 dark:text-indigo-400',
                    lesson.status === 'completed' && 'text-gray-700 dark:text-gray-300'
                  )}
                >
                  {lesson.title}
                </Typography>
              </div>
              {lesson.duration && (
                <Typography variant="small" color="muted">
                  {lesson.duration}m
                </Typography>
              )}
            </button>
          );
        })}
      </div>
    ),
    defaultOpen: module.expanded,
  }));

  return (
    <Card className={cn('w-80', className)}>
      <div className="space-y-4">
        {/* Header */}
        <div>
          <Typography variant="h5" className="mb-3">
            {title}
          </Typography>
          <ProgressBar
            value={progress}
            color="primary"
            showPercentage
          />
        </div>

        <Divider />

        {/* Modules */}
        <div>
          <Typography variant="h6" className="mb-3">
            Modules
          </Typography>
          <Accordion items={accordionItems} multiple={true} />
        </div>
      </div>
    </Card>
  );
};

CourseSidebar.displayName = 'CourseSidebar';
