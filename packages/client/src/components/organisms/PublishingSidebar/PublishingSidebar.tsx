/**
 * PublishingSidebar Organism Component
 * 
 * A persistent sidebar panel showing publishing status for courses.
 * Displays course, module, and lesson readiness with publishing controls.
 */

import React from 'react';
import { 
  BookOpen, 
  Layers, 
  FileText, 
  Check, 
  AlertTriangle,
  Globe,
  Lock,
  Eye,
  Settings,
  ChevronRight,
} from 'lucide-react';
import { Card } from '../../molecules/Card';
import { Typography } from '../../atoms/Typography';
import { ProgressBar } from '../../atoms/ProgressBar';
import { Badge } from '../../atoms/Badge';
import { Button } from '../../atoms/Button';
import { Icon } from '../../atoms/Icon';
import { Divider } from '../../atoms/Divider';
import { Checkbox } from '../../atoms/Checkbox';
import { Tooltip } from '../../molecules/Tooltip';
import { cn } from '../../../utils/theme';

export interface PublishingStats {
  /**
   * Number of modules ready
   */
  modulesReady: number;
  
  /**
   * Total number of modules
   */
  modulesTotal: number;
  
  /**
   * Number of lessons ready
   */
  lessonsReady: number;
  
  /**
   * Total number of lessons
   */
  lessonsTotal: number;
  
  /**
   * Number of flashcard sets ready
   */
  flashcardsReady: number;
  
  /**
   * Total flashcard sets
   */
  flashcardsTotal: number;
  
  /**
   * Number of quizzes ready
   */
  quizzesReady: number;
  
  /**
   * Total quizzes
   */
  quizzesTotal: number;
}

export interface PublishingSidebarProps {
  /**
   * Course title
   */
  courseTitle: string;
  
  /**
   * Is course published
   */
  isPublished: boolean;
  
  /**
   * Course visibility
   */
  visibility: 'public' | 'private' | 'unlisted';
  
  /**
   * Publishing statistics
   */
  stats: PublishingStats;
  
  /**
   * Enrollment count (if published)
   */
  enrollmentCount?: number;
  
  /**
   * Selected items for bulk actions
   */
  selectedItems?: string[];
  
  /**
   * On publish/unpublish course
   */
  onPublishToggle?: () => void;
  
  /**
   * On visibility change
   */
  onVisibilityChange?: (visibility: 'public' | 'private' | 'unlisted') => void;
  
  /**
   * On view course settings
   */
  onSettings?: () => void;
  
  /**
   * On preview course
   */
  onPreview?: () => void;
  
  /**
   * On publish selected items
   */
  onPublishSelected?: () => void;
  
  /**
   * Whether publishing is in progress
   */
  isPublishing?: boolean;
  
  /**
   * Additional CSS classes
   */
  className?: string;
}

const getReadinessPercentage = (ready: number, total: number) => {
  if (total === 0) return 100;
  return Math.round((ready / total) * 100);
};

const getReadinessColor = (percentage: number) => {
  if (percentage >= 100) return 'success';
  if (percentage >= 50) return 'warning';
  return 'error';
};

const visibilityConfig = {
  public: { icon: Globe, label: 'Public', color: 'text-green-600 dark:text-green-400' },
  private: { icon: Lock, label: 'Private', color: 'text-gray-600 dark:text-gray-400' },
  unlisted: { icon: Eye, label: 'Unlisted', color: 'text-yellow-600 dark:text-yellow-400' },
};

export const PublishingSidebar: React.FC<PublishingSidebarProps> = ({
  courseTitle,
  isPublished,
  visibility,
  stats,
  enrollmentCount = 0,
  selectedItems = [],
  onPublishToggle,
  onVisibilityChange,
  onSettings,
  onPreview,
  onPublishSelected,
  isPublishing = false,
  className,
}) => {
  const overallReadiness = getReadinessPercentage(
    stats.modulesReady + stats.lessonsReady,
    stats.modulesTotal + stats.lessonsTotal
  );
  
  const visInfo = visibilityConfig[visibility];
  
  return (
    <Card className={cn('w-80', className)}>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <Typography variant="h5" className="truncate">
              {courseTitle}
            </Typography>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant={isPublished ? 'success' : 'default'}>
                {isPublished ? 'Published' : 'Draft'}
              </Badge>
              <span className={cn('flex items-center gap-1 text-sm', visInfo.color)}>
                <Icon icon={visInfo.icon} size="sm" />
                {visInfo.label}
              </span>
            </div>
          </div>
          {onSettings && (
            <Button variant="ghost" size="sm" onClick={onSettings}>
              <Icon icon={Settings} size="sm" />
            </Button>
          )}
        </div>
        
        {/* Overall Readiness */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <Typography variant="small" color="secondary">
              Publishing Readiness
            </Typography>
            <Typography variant="small" weight="semibold">
              {overallReadiness}%
            </Typography>
          </div>
          <ProgressBar
            value={overallReadiness}
            color={getReadinessColor(overallReadiness) as any}
          />
        </div>
        
        <Divider />
        
        {/* Content Stats */}
        <div className="space-y-3">
          <Typography variant="h6">Content Status</Typography>
          
          {/* Modules */}
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2 text-sm">
              <Icon icon={Layers} size="sm" className="text-indigo-500" />
              Modules
            </span>
            <Badge 
              variant={stats.modulesReady === stats.modulesTotal ? 'success' : 'warning'}
              size="sm"
            >
              {stats.modulesReady}/{stats.modulesTotal}
            </Badge>
          </div>
          
          {/* Lessons */}
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2 text-sm">
              <Icon icon={BookOpen} size="sm" className="text-blue-500" />
              Lessons
            </span>
            <Badge 
              variant={stats.lessonsReady === stats.lessonsTotal ? 'success' : 'warning'}
              size="sm"
            >
              {stats.lessonsReady}/{stats.lessonsTotal}
            </Badge>
          </div>
          
          {/* Flashcards */}
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2 text-sm">
              <Icon icon={FileText} size="sm" className="text-purple-500" />
              Flashcards
            </span>
            <Badge 
              variant={stats.flashcardsReady === stats.flashcardsTotal ? 'success' : 'default'}
              size="sm"
            >
              {stats.flashcardsReady}/{stats.flashcardsTotal}
            </Badge>
          </div>
          
          {/* Quizzes */}
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2 text-sm">
              <Icon icon={AlertTriangle} size="sm" className="text-orange-500" />
              Quizzes
            </span>
            <Badge 
              variant={stats.quizzesReady === stats.quizzesTotal ? 'success' : 'default'}
              size="sm"
            >
              {stats.quizzesReady}/{stats.quizzesTotal}
            </Badge>
          </div>
        </div>
        
        <Divider />
        
        {/* Enrollment Stats (if published) */}
        {isPublished && (
          <>
            <div className="flex items-center justify-between">
              <Typography variant="small" color="secondary">
                Enrolled Students
              </Typography>
              <Typography variant="body" weight="semibold">
                {enrollmentCount}
              </Typography>
            </div>
            <Divider />
          </>
        )}
        
        {/* Actions */}
        <div className="space-y-2">
          {selectedItems.length > 0 ? (
            <Button
              variant="primary"
              className="w-full"
              onClick={onPublishSelected}
              disabled={isPublishing}
            >
              <Icon icon={Check} size="sm" className="mr-2" />
              Publish {selectedItems.length} Selected
            </Button>
          ) : (
            <Button
              variant={isPublished ? 'secondary' : 'primary'}
              className="w-full"
              onClick={onPublishToggle}
              disabled={isPublishing || overallReadiness < 100}
            >
              {isPublishing ? (
                'Publishing...'
              ) : isPublished ? (
                'Unpublish Course'
              ) : (
                <>
                  <Icon icon={Globe} size="sm" className="mr-2" />
                  Publish Course
                </>
              )}
            </Button>
          )}
          
          {onPreview && (
            <Button
              variant="secondary"
              className="w-full"
              onClick={onPreview}
            >
              <Icon icon={Eye} size="sm" className="mr-2" />
              Preview Course
            </Button>
          )}
        </div>
        
        {/* Readiness Warning */}
        {overallReadiness < 100 && !isPublished && (
          <div className="p-3 rounded-lg bg-yellow-50 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-200">
            <Typography variant="small">
              Complete all content before publishing. Missing items will not be available to students.
            </Typography>
          </div>
        )}
      </div>
    </Card>
  );
};

PublishingSidebar.displayName = 'PublishingSidebar';
