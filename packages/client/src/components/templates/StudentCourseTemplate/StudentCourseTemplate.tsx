/**
 * StudentCourseTemplate Component
 * 
 * Student view of an enrolled course showing progress, modules,
 * lessons, and language selection for bilingual learning.
 */

import React, { useState } from 'react';
import type { LucideIcon } from 'lucide-react';
import {
  ChevronDown,
  ChevronRight,
  BookOpen,
  CheckCircle,
  PlayCircle,
  Lock,
  Clock,
  Award,
  Star,
  Users,
  Globe,
  ArrowLeft,
  Settings,
} from 'lucide-react';
import { AppLayoutTemplate } from '../AppLayoutTemplate';
import { LanguageSelector, LanguageOption, DEFAULT_LANGUAGES } from '../../molecules/LanguageSelector';
import { Card } from '../../molecules/Card';
import { Button } from '../../atoms/Button';
import { Typography } from '../../atoms/Typography';
import { Badge } from '../../atoms/Badge';
import { ProgressBar } from '../../atoms/ProgressBar';
import { Avatar } from '../../atoms/Avatar';
import { Icon } from '../../atoms/Icon';
import { Divider } from '../../atoms/Divider';
import { cn } from '../../../utils/theme';

export interface CourseLesson {
  /**
   * Lesson ID
   */
  id: string;
  
  /**
   * Lesson title
   */
  title: string;
  
  /**
   * Lesson duration in minutes
   */
  duration?: number;
  
  /**
   * Lesson status
   */
  status: 'completed' | 'current' | 'available' | 'locked';
  
  /**
   * Has flashcards
   */
  hasFlashcards?: boolean;
  
  /**
   * Has assessment
   */
  hasAssessment?: boolean;
}

export interface CourseModule {
  /**
   * Module ID
   */
  id: string;
  
  /**
   * Module title
   */
  title: string;
  
  /**
   * Module description
   */
  description?: string;
  
  /**
   * Lessons in this module
   */
  lessons: CourseLesson[];
  
  /**
   * Is locked
   */
  isLocked?: boolean;
}

export interface CourseInstructor {
  /**
   * Instructor ID
   */
  id: string;
  
  /**
   * Instructor name
   */
  name: string;
  
  /**
   * Instructor avatar
   */
  avatar?: string;
  
  /**
   * Instructor title
   */
  title?: string;
}

export interface StudentCourseTemplateProps {
  /**
   * Course ID
   */
  courseId: string;
  
  /**
   * Course title
   */
  courseTitle: string;
  
  /**
   * Course description
   */
  courseDescription?: string;
  
  /**
   * Course thumbnail
   */
  courseThumbnail?: string;
  
  /**
   * Instructor info
   */
  instructor?: CourseInstructor;
  
  /**
   * User information for header
   */
  user?: {
    name: string;
    email?: string;
    avatar?: string;
  };
  
  /**
   * Navigation items for sidebar
   */
  navigationItems?: Array<{
    id: string;
    label: string;
    icon?: LucideIcon;
    href?: string;
    onClick?: () => void;
    badge?: string | number;
    active?: boolean;
  }>;
  
  /**
   * Course modules
   */
  modules: CourseModule[];
  
  /**
   * Overall progress (0-100)
   */
  progress: number;
  
  /**
   * Completed lessons count
   */
  completedLessons: number;
  
  /**
   * Total lessons count
   */
  totalLessons: number;
  
  /**
   * Current lesson ID
   */
  currentLessonId?: string;
  
  /**
   * Estimated time remaining in minutes
   */
  timeRemaining?: number;
  
  /**
   * Course rating
   */
  rating?: number;
  
  /**
   * Student count
   */
  studentCount?: number;
  
  /**
   * Enrolled date
   */
  enrolledAt?: Date | string;
  
  /**
   * Available languages
   */
  availableLanguages?: LanguageOption[];
  
  /**
   * Selected language
   */
  selectedLanguage?: string;
  
  /**
   * On language change
   */
  onLanguageChange?: (code: string) => void;
  
  /**
   * On lesson click
   */
  onLessonClick?: (lessonId: string) => void;
  
  /**
   * On continue click
   */
  onContinue?: () => void;
  
  /**
   * On back navigation
   */
  onBack?: () => void;
  
  /**
   * On view certificate
   */
  onViewCertificate?: () => void;
  
  /**
   * Logo element
   */
  logo?: React.ReactNode;
  
  /**
   * On logo click
   */
  onLogoClick?: () => void;
  
  /**
   * On logout handler
   */
  onLogout?: () => void;
  
  /**
   * Additional CSS classes
   */
  className?: string;
}

const formatDuration = (minutes: number): string => {
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
};

const formatDate = (date: Date | string): string => {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' });
};

const LessonItem: React.FC<{
  lesson: CourseLesson;
  isCurrent: boolean;
  onClick?: () => void;
}> = ({ lesson, isCurrent, onClick }) => {
  const getStatusIcon = () => {
    switch (lesson.status) {
      case 'completed':
        return <Icon icon={CheckCircle} size="md" className="text-green-500" />;
      case 'current':
        return <Icon icon={PlayCircle} size="md" className="text-indigo-500" />;
      case 'locked':
        return <Icon icon={Lock} size="md" className="text-gray-400" />;
      default:
        return <div className="w-5 h-5 rounded-full border-2 border-gray-300 dark:border-gray-600" />;
    }
  };

  return (
    <button
      type="button"
      onClick={lesson.status !== 'locked' ? onClick : undefined}
      disabled={lesson.status === 'locked'}
      className={cn(
        'w-full flex items-center gap-3 p-3 rounded-lg transition-all text-left',
        lesson.status !== 'locked' && 'hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer',
        lesson.status === 'locked' && 'opacity-60 cursor-not-allowed',
        isCurrent && 'bg-indigo-50 dark:bg-indigo-900/20 ring-1 ring-indigo-200 dark:ring-indigo-800'
      )}
    >
      {getStatusIcon()}
      
      <div className="flex-1 min-w-0">
        <Typography 
          variant="body" 
          weight={isCurrent ? 'semibold' : 'medium'}
          className="truncate"
        >
          {lesson.title}
        </Typography>
        
        <div className="flex items-center gap-2 mt-1">
          {lesson.duration && (
            <Typography variant="small" color="secondary" className="flex items-center gap-1">
              <Icon icon={Clock} size="xs" />
              {lesson.duration}m
            </Typography>
          )}
          {lesson.hasFlashcards && (
            <Badge variant="default" size="sm">Flashcards</Badge>
          )}
          {lesson.hasAssessment && (
            <Badge variant="info" size="sm">Quiz</Badge>
          )}
        </div>
      </div>
      
      {isCurrent && (
        <Badge variant="primary" size="sm">Current</Badge>
      )}
    </button>
  );
};

const ModuleSection: React.FC<{
  module: CourseModule;
  currentLessonId?: string;
  onLessonClick?: (lessonId: string) => void;
  defaultExpanded?: boolean;
}> = ({ module, currentLessonId, onLessonClick, defaultExpanded = false }) => {
  const [isExpanded, setIsExpanded] = useState(
    defaultExpanded || module.lessons.some(l => l.id === currentLessonId)
  );
  
  const completedCount = module.lessons.filter(l => l.status === 'completed').length;
  const moduleProgress = module.lessons.length > 0 
    ? Math.round((completedCount / module.lessons.length) * 100) 
    : 0;

  return (
    <Card className={cn(module.isLocked && 'opacity-60')}>
      <button
        type="button"
        onClick={() => !module.isLocked && setIsExpanded(!isExpanded)}
        className={cn(
          'w-full flex items-center justify-between text-left',
          !module.isLocked && 'cursor-pointer'
        )}
        disabled={module.isLocked}
      >
        <div className="flex items-center gap-3">
          <Icon 
            icon={isExpanded ? ChevronDown : ChevronRight} 
            size="md" 
            className="text-gray-400"
          />
          <div>
            <div className="flex items-center gap-2">
              <Typography variant="h6">{module.title}</Typography>
              {module.isLocked && (
                <Icon icon={Lock} size="sm" className="text-gray-400" />
              )}
            </div>
            {module.description && (
              <Typography variant="small" color="secondary">
                {module.description}
              </Typography>
            )}
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="text-right">
            <Typography variant="small" color="secondary">
              {completedCount}/{module.lessons.length} lessons
            </Typography>
            <ProgressBar value={moduleProgress} size="sm" className="w-20" />
          </div>
        </div>
      </button>
      
      {isExpanded && !module.isLocked && (
        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 space-y-2">
          {module.lessons.map((lesson) => (
            <LessonItem
              key={lesson.id}
              lesson={lesson}
              isCurrent={lesson.id === currentLessonId}
              onClick={() => onLessonClick?.(lesson.id)}
            />
          ))}
        </div>
      )}
    </Card>
  );
};

export const StudentCourseTemplate: React.FC<StudentCourseTemplateProps> = ({
  courseId,
  courseTitle,
  courseDescription,
  courseThumbnail,
  instructor,
  user,
  navigationItems = [],
  modules,
  progress,
  completedLessons,
  totalLessons,
  currentLessonId,
  timeRemaining,
  rating,
  studentCount,
  enrolledAt,
  availableLanguages = DEFAULT_LANGUAGES,
  selectedLanguage = 'en',
  onLanguageChange,
  onLessonClick,
  onContinue,
  onBack,
  onViewCertificate,
  logo,
  onLogoClick,
  onLogout,
  className,
}) => {
  const isCompleted = progress >= 100;

  return (
    <AppLayoutTemplate
      navigationItems={navigationItems}
      user={user}
      onLogout={onLogout}
      logo={logo}
      brandName="KFlow"
      onLogoClick={onLogoClick}
      className={className}
    >
      <div className="space-y-6">
        {/* Course Header */}
        <Card className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white border-0">
          <div className="flex flex-col lg:flex-row lg:items-start gap-6">
            {/* Course Info */}
            <div className="flex-1">
              {onBack && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  icon={ArrowLeft} 
                  onClick={onBack}
                  className="text-white/80 hover:text-white hover:bg-white/10 mb-4"
                >
                  Back to Courses
                </Button>
              )}
              
              <Typography variant="h3" className="text-white mb-2">
                {courseTitle}
              </Typography>
              
              {courseDescription && (
                <Typography variant="body" className="text-white/90 mb-4">
                  {courseDescription}
                </Typography>
              )}
              
              {/* Instructor */}
              {instructor && (
                <div className="flex items-center gap-3 mb-4">
                  <Avatar 
                    src={instructor.avatar} 
                    initials={instructor.name.substring(0, 2)} 
                    size="sm" 
                  />
                  <div>
                    <Typography variant="small" className="text-white/80">
                      Instructor
                    </Typography>
                    <Typography variant="body" weight="medium" className="text-white">
                      {instructor.name}
                    </Typography>
                  </div>
                </div>
              )}
              
              {/* Course Meta */}
              <div className="flex flex-wrap items-center gap-4 text-white/80 text-sm">
                {rating !== undefined && (
                  <span className="flex items-center gap-1">
                    <Icon icon={Star} size="sm" className="text-yellow-300 fill-yellow-300" />
                    {rating.toFixed(1)}
                  </span>
                )}
                {studentCount !== undefined && (
                  <span className="flex items-center gap-1">
                    <Icon icon={Users} size="sm" />
                    {studentCount.toLocaleString()} students
                  </span>
                )}
                {enrolledAt && (
                  <span className="flex items-center gap-1">
                    <Icon icon={Clock} size="sm" />
                    Enrolled {formatDate(enrolledAt)}
                  </span>
                )}
              </div>
            </div>
            
            {/* Progress Card */}
            <div className="lg:w-72 p-4 bg-white/10 rounded-xl backdrop-blur-sm">
              <div className="flex items-center justify-between mb-2">
                <Typography variant="small" className="text-white/80">
                  Your Progress
                </Typography>
                <Typography variant="h4" className="text-white">
                  {progress}%
                </Typography>
              </div>
              <ProgressBar value={progress} color="success" className="mb-4" />
              
              <div className="flex items-center justify-between text-sm text-white/80 mb-4">
                <span>{completedLessons} of {totalLessons} lessons</span>
                {timeRemaining !== undefined && timeRemaining > 0 && (
                  <span>{formatDuration(timeRemaining)} left</span>
                )}
              </div>
              
              {isCompleted ? (
                <div className="space-y-2">
                  <Badge variant="success" className="w-full justify-center py-2">
                    <Icon icon={Award} size="sm" className="mr-2" />
                    Course Completed!
                  </Badge>
                  {onViewCertificate && (
                    <Button 
                      variant="secondary" 
                      className="w-full bg-white text-indigo-600 hover:bg-gray-100"
                      onClick={onViewCertificate}
                    >
                      View Certificate
                    </Button>
                  )}
                </div>
              ) : (
                <Button 
                  variant="secondary" 
                  className="w-full bg-white text-indigo-600 hover:bg-gray-100"
                  icon={PlayCircle}
                  onClick={onContinue}
                >
                  Continue Learning
                </Button>
              )}
            </div>
          </div>
        </Card>

        {/* Language Selector */}
        {availableLanguages.length > 1 && onLanguageChange && (
          <Card>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Icon icon={Globe} size="md" className="text-indigo-500" />
                <div>
                  <Typography variant="body" weight="medium">
                    Learning Language
                  </Typography>
                  <Typography variant="small" color="secondary">
                    Choose your preferred language for course content
                  </Typography>
                </div>
              </div>
              <LanguageSelector
                languages={availableLanguages}
                value={selectedLanguage}
                onChange={onLanguageChange}
                size="md"
              />
            </div>
          </Card>
        )}

        {/* Modules List */}
        <div className="space-y-4">
          <Typography variant="h5">Course Content</Typography>
          
          <div className="space-y-4">
            {modules.map((module, index) => (
              <ModuleSection
                key={module.id}
                module={module}
                currentLessonId={currentLessonId}
                onLessonClick={onLessonClick}
                defaultExpanded={index === 0}
              />
            ))}
          </div>
        </div>
      </div>
    </AppLayoutTemplate>
  );
};

StudentCourseTemplate.displayName = 'StudentCourseTemplate';
