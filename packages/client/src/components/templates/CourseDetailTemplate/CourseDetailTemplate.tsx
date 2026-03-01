/**
 * CourseDetailTemplate Component
 * 
 * Single course view with modules, lessons, and progress tracking.
 * Uses Header, CourseSidebar, LessonCard, ProgressTracker organisms and Breadcrumb, Tabs, Card molecules.
 */

import React, { useState } from 'react';
import type { LucideIcon } from 'lucide-react';
import { Play, Clock, Users, Star, BookOpen, CheckCircle, ArrowLeft } from 'lucide-react';
import { Header } from '../../organisms/Header';
import { CourseSidebar, Module } from '../../organisms/CourseSidebar';
import { LessonCard } from '../../organisms/LessonCard';
import { Breadcrumb, BreadcrumbItem } from '../../molecules/Breadcrumb';
import { Tabs, TabItem } from '../../molecules/Tabs';
import { Card } from '../../molecules/Card';
import { ButtonGroup } from '../../molecules/ButtonGroup';
import { Button } from '../../atoms/Button';
import { Typography } from '../../atoms/Typography';
import { Badge } from '../../atoms/Badge';
import { ProgressBar } from '../../atoms/ProgressBar';
import { Avatar } from '../../atoms/Avatar';
import { cn } from '../../../utils/theme';

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
   * Instructor title/bio
   */
  title?: string;
}

export interface CourseDetailTemplateProps {
  /**
   * Course ID
   */
  id: string;
  
  /**
   * Course title
   */
  title: string;
  
  /**
   * Course description
   */
  description: string;
  
  /**
   * Course image/thumbnail
   */
  image?: string;
  
  /**
   * Course progress (0-100)
   */
  progress: number;
  
  /**
   * Total lessons count
   */
  totalLessons: number;
  
  /**
   * Completed lessons count
   */
  completedLessons: number;
  
  /**
   * Course duration (e.g., "4 hours")
   */
  duration?: string;
  
  /**
   * Student count
   */
  studentCount?: number;
  
  /**
   * Course rating
   */
  rating?: number;
  
  /**
   * Course status
   */
  status?: 'not-started' | 'in-progress' | 'completed';
  
  /**
   * Course modules
   */
  modules: Module[];
  
  /**
   * Current lesson ID
   */
  currentLessonId?: string;
  
  /**
   * Instructor information
   */
  instructor?: CourseInstructor;
  
  /**
   * Breadcrumb items
   */
  breadcrumbs?: BreadcrumbItem[];
  
  /**
   * On lesson click
   */
  onLessonClick?: (lessonId: string) => void;
  
  /**
   * On continue/start click
   */
  onContinueClick?: () => void;
  
  /**
   * On enroll click
   */
  onEnrollClick?: () => void;
  
  /**
   * Is enrolled
   */
  isEnrolled?: boolean;
  
  /**
   * User information for header
   */
  user?: {
    name: string;
    email?: string;
    avatar?: string;
  };
  
  /**
   * Logo element
   */
  logo?: React.ReactNode;
  
  /**
   * On logo click
   */
  onLogoClick?: () => void;
  
  /**
   * Additional course content (for tabs)
   */
  overviewContent?: React.ReactNode;
  
  /**
   * Discussion content
   */
  discussionContent?: React.ReactNode;
  
  /**
   * On back to courses/home handler
   */
  onBackToCourses?: () => void;
  
  /**
   * Additional CSS classes
   */
  className?: string;
}

export const CourseDetailTemplate: React.FC<CourseDetailTemplateProps> = ({
  id,
  title,
  description,
  image,
  progress,
  totalLessons,
  completedLessons,
  duration,
  studentCount,
  rating,
  status = 'not-started',
  modules,
  currentLessonId,
  instructor,
  breadcrumbs = [],
  onLessonClick,
  onContinueClick,
  onEnrollClick,
  isEnrolled = false,
  user,
  logo,
  onLogoClick,
  overviewContent,
  discussionContent,
  onBackToCourses,
  className,
}) => {
  const [activeTab, setActiveTab] = useState('content');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const tabs: TabItem[] = [
    { id: 'overview', label: 'Overview', content: null },
    { id: 'content', label: 'Content', content: null },
    ...(discussionContent ? [{ id: 'discussion', label: 'Discussion', content: null }] : []),
  ];

  const getStatusBadge = () => {
    switch (status) {
      case 'completed':
        return <Badge variant="success">Completed</Badge>;
      case 'in-progress':
        return <Badge variant="primary">In Progress</Badge>;
      default:
        return <Badge variant="default">Not Started</Badge>;
    }
  };

  // Get user initials for avatar
  const userInitials = user?.name
    ?.split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || 'U';

  return (
    <div className={cn('min-h-screen bg-gray-50 dark:bg-gray-900', className)}>
      {/* Header - visible on all screen sizes for this template */}
      <Header
        brandName="KFlow"
        logo={logo}
        userAvatar={{ initials: userInitials }}
        userName={user?.name}
        variant="desktop"
        sticky={true}
      />

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        {/* Back button and Breadcrumb */}
        <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-3 sm:px-4 md:px-6 lg:px-8 py-2 sm:py-3">
          <div className="flex items-center gap-4">
            {onBackToCourses && (
              <Button
                variant="ghost"
                size="sm"
                icon={ArrowLeft}
                onClick={onBackToCourses}
                className="flex-shrink-0"
              >
                <span className="hidden sm:inline">Back to Courses</span>
                <span className="sm:hidden">Back</span>
              </Button>
            )}
            {breadcrumbs.length > 0 && (
              <Breadcrumb items={breadcrumbs} />
            )}
          </div>
        </div>

        {/* Course hero section */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white">
          <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-6 sm:py-8 md:py-12">
            <div className="flex flex-col lg:flex-row gap-4 sm:gap-6 lg:gap-8">
              {/* Course info */}
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-4">
                  {getStatusBadge()}
                </div>
                <Typography variant="h2" className="text-white mb-3 sm:mb-4 text-2xl sm:text-3xl md:text-4xl">
                  {title}
                </Typography>
                <Typography variant="body" className="text-white/90 mb-4 sm:mb-6 text-sm sm:text-base">
                  {description}
                </Typography>

                {/* Course meta */}
                <div className="flex flex-wrap items-center gap-2 sm:gap-4 mb-4 sm:mb-6 text-white/80 text-xs sm:text-sm">
                  {duration && (
                    <div className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      <span className="text-sm">{duration}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-1">
                    <BookOpen className="w-4 h-4" />
                    <span className="text-sm">{totalLessons} lessons</span>
                  </div>
                  {studentCount !== undefined && (
                    <div className="flex items-center gap-1">
                      <Users className="w-4 h-4" />
                      <span className="text-sm">{studentCount} students</span>
                    </div>
                  )}
                  {rating !== undefined && (
                    <div className="flex items-center gap-1">
                      <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                      <span className="text-sm">{rating.toFixed(1)}</span>
                    </div>
                  )}
                </div>

                {/* Progress bar */}
                {isEnrolled && (
                  <div className="mb-6">
                    <div className="flex items-center justify-between text-sm text-white/80 mb-2">
                      <span>{completedLessons} of {totalLessons} lessons completed</span>
                      <span>{progress}%</span>
                    </div>
                    <ProgressBar
                      value={progress}
                      color="success"
                      className="bg-white/20"
                    />
                  </div>
                )}

                {/* Actions */}
                <ButtonGroup>
                  {isEnrolled ? (
                    <Button
                      variant="secondary"
                      size="lg"
                      icon={status === 'completed' ? CheckCircle : Play}
                      onClick={onContinueClick}
                    >
                      {status === 'completed' ? 'Review Course' : 'Continue Learning'}
                    </Button>
                  ) : (
                    <>
                      {onContinueClick && modules.length > 0 && (
                        <Button
                          variant="primary"
                          size="lg"
                          icon={Play}
                          onClick={onContinueClick}
                        >
                          Preview Course
                        </Button>
                      )}
                      {onEnrollClick && (
                        <Button
                          variant="secondary"
                          size="lg"
                          onClick={onEnrollClick}
                        >
                          Enroll Now
                        </Button>
                      )}
                    </>
                  )}
                </ButtonGroup>
              </div>

              {/* Instructor card */}
              {instructor && (
                <Card className="w-full lg:w-80 flex-shrink-0 mt-4 lg:mt-0">
                  <div className="flex items-center gap-3 sm:gap-4">
                    <Avatar
                      src={instructor.avatar}
                      initials={instructor.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                      alt={instructor.name}
                      size="lg"
                    />
                    <div>
                      <Typography variant="body" weight="semibold">
                        {instructor.name}
                      </Typography>
                      {instructor.title && (
                        <Typography variant="small" color="secondary">
                          {instructor.title}
                        </Typography>
                      )}
                    </div>
                  </div>
                </Card>
              )}
            </div>
          </div>
        </div>

        {/* Content area with tabs and sidebar */}
        <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-6 md:py-8">
          <div className="flex flex-col lg:flex-row gap-4 sm:gap-6 lg:gap-8">
            {/* Main content */}
            <div className="flex-1 min-w-0 order-2 lg:order-1">
              <Tabs
                items={tabs}
                activeTab={activeTab}
                onTabChange={setActiveTab}
                className="mb-6"
              />

              {activeTab === 'overview' && (
                <Card>
                  {overviewContent || (
                    <div className="prose dark:prose-invert max-w-none">
                      <Typography variant="h5" className="mb-4">
                        About this course
                      </Typography>
                      <Typography variant="body" color="secondary">
                        {description}
                      </Typography>
                    </div>
                  )}
                </Card>
              )}

              {activeTab === 'content' && (
                <div className="space-y-4">
                  {modules.map((module) => (
                    <Card key={module.id}>
                      <Typography variant="h6" className="mb-4">
                        {module.title}
                      </Typography>
                      <div className="space-y-2">
                        {module.lessons.map((lesson) => (
                          <button
                            key={lesson.id}
                            type="button"
                            onClick={() => onLessonClick?.(lesson.id)}
                            className={cn(
                              'w-full flex items-center justify-between p-3 rounded-lg',
                              'hover:bg-gray-50 dark:hover:bg-gray-700',
                              'transition-colors text-left',
                              lesson.id === currentLessonId && 'bg-indigo-50 dark:bg-indigo-900/20',
                              lesson.status === 'locked' && 'opacity-50 cursor-not-allowed'
                            )}
                            disabled={lesson.status === 'locked'}
                          >
                            <div className="flex items-center gap-3">
                              {lesson.status === 'completed' ? (
                                <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
                              ) : lesson.status === 'current' ? (
                                <Play className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                              ) : (
                                <div className="w-5 h-5 rounded-full border-2 border-gray-300 dark:border-gray-600" />
                              )}
                              <Typography variant="body">{lesson.title}</Typography>
                            </div>
                            {lesson.duration && (
                              <Typography variant="small" color="muted">
                                {lesson.duration}m
                              </Typography>
                            )}
                          </button>
                        ))}
                      </div>
                    </Card>
                  ))}
                </div>
              )}

              {activeTab === 'discussion' && discussionContent && (
                <Card>{discussionContent}</Card>
              )}
            </div>

            {/* Course sidebar (desktop) */}
            <div className="hidden lg:block w-80 flex-shrink-0 order-1 lg:order-2">
              <div className="sticky top-20 lg:top-24">
                <CourseSidebar
                  title={title}
                  progress={progress}
                  modules={modules}
                  currentLessonId={currentLessonId}
                />
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

CourseDetailTemplate.displayName = 'CourseDetailTemplate';

