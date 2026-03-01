/**
 * EnrollmentTemplate Component
 * 
 * Course enrollment flow for students to preview and enroll in courses.
 * Shows course details, curriculum preview, and enrollment options.
 */

import React, { useState } from 'react';
import type { LucideIcon } from 'lucide-react';
import {
  ArrowLeft,
  BookOpen,
  Clock,
  Users,
  Star,
  Globe,
  CheckCircle,
  PlayCircle,
  Lock,
  ChevronDown,
  ChevronRight,
  Award,
  Layers,
  MessageSquare,
} from 'lucide-react';
import { AppLayoutTemplate } from '../AppLayoutTemplate';
import { LanguageSelector, LanguageOption, DEFAULT_LANGUAGES } from '../../molecules/LanguageSelector';
import { Card } from '../../molecules/Card';
import { Button } from '../../atoms/Button';
import { Typography } from '../../atoms/Typography';
import { Badge } from '../../atoms/Badge';
import { Avatar } from '../../atoms/Avatar';
import { Icon } from '../../atoms/Icon';
import { Divider } from '../../atoms/Divider';
import { cn } from '../../../utils/theme';

export interface EnrollmentLesson {
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
   * Is free preview available
   */
  isFreePreview?: boolean;
}

export interface EnrollmentModule {
  /**
   * Module ID
   */
  id: string;
  
  /**
   * Module title
   */
  title: string;
  
  /**
   * Lessons count
   */
  lessonCount: number;
  
  /**
   * Total duration in minutes
   */
  duration: number;
  
  /**
   * Preview lessons (shown when expanded)
   */
  lessons?: EnrollmentLesson[];
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
   * Instructor title/bio
   */
  title?: string;
  
  /**
   * Course count
   */
  courseCount?: number;
  
  /**
   * Student count
   */
  studentCount?: number;
  
  /**
   * Average rating
   */
  rating?: number;
}

export interface CourseReview {
  /**
   * Review ID
   */
  id: string;
  
  /**
   * Reviewer name
   */
  reviewerName: string;
  
  /**
   * Reviewer avatar
   */
  reviewerAvatar?: string;
  
  /**
   * Rating (1-5)
   */
  rating: number;
  
  /**
   * Review text
   */
  text: string;
  
  /**
   * Review date
   */
  date: Date | string;
}

export interface EnrollmentTemplateProps {
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
  courseDescription: string;
  
  /**
   * Course thumbnail/image
   */
  courseThumbnail?: string;
  
  /**
   * Course category
   */
  category?: string;
  
  /**
   * Difficulty level
   */
  difficulty?: 'beginner' | 'intermediate' | 'advanced';
  
  /**
   * Total lessons count
   */
  totalLessons: number;
  
  /**
   * Total duration in hours
   */
  totalDuration: number;
  
  /**
   * Average rating (0-5)
   */
  rating?: number;
  
  /**
   * Rating count
   */
  ratingCount?: number;
  
  /**
   * Student count
   */
  studentCount?: number;
  
  /**
   * Last updated date
   */
  lastUpdated?: Date | string;
  
  /**
   * Course instructor
   */
  instructor?: CourseInstructor;
  
  /**
   * Course modules/curriculum
   */
  modules: EnrollmentModule[];
  
  /**
   * What you'll learn bullets
   */
  learningOutcomes?: string[];
  
  /**
   * Course prerequisites
   */
  prerequisites?: string[];
  
  /**
   * Course reviews
   */
  reviews?: CourseReview[];
  
  /**
   * Available languages
   */
  availableLanguages?: LanguageOption[];
  
  /**
   * Is already enrolled
   */
  isEnrolled?: boolean;
  
  /**
   * Is enrollment loading
   */
  isEnrolling?: boolean;
  
  /**
   * On enroll
   */
  onEnroll?: () => void;
  
  /**
   * On start course (if already enrolled)
   */
  onStartCourse?: () => void;
  
  /**
   * On preview lesson
   */
  onPreviewLesson?: (lessonId: string) => void;
  
  /**
   * On back navigation
   */
  onBack?: () => void;
  
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

const formatDuration = (hours: number): string => {
  if (hours < 1) return `${Math.round(hours * 60)}m`;
  return `${hours}h`;
};

const formatDate = (date: Date | string): string => {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
};

const DifficultyBadge: React.FC<{ level: 'beginner' | 'intermediate' | 'advanced' }> = ({ level }) => {
  const config = {
    beginner: { variant: 'success' as const, label: 'Beginner' },
    intermediate: { variant: 'warning' as const, label: 'Intermediate' },
    advanced: { variant: 'danger' as const, label: 'Advanced' },
  };
  return <Badge variant={config[level].variant}>{config[level].label}</Badge>;
};

const StarRating: React.FC<{ rating: number; count?: number }> = ({ rating, count }) => (
  <div className="flex items-center gap-2">
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <Icon
          key={star}
          icon={Star}
          size="sm"
          className={cn(
            star <= Math.floor(rating)
              ? 'text-yellow-400 fill-yellow-400'
              : 'text-gray-300 dark:text-gray-600'
          )}
        />
      ))}
    </div>
    <Typography variant="body" weight="semibold">{rating.toFixed(1)}</Typography>
    {count !== undefined && (
      <Typography variant="small" color="secondary">({count.toLocaleString()} ratings)</Typography>
    )}
  </div>
);

const ModulePreview: React.FC<{
  module: EnrollmentModule;
  onPreviewLesson?: (lessonId: string) => void;
}> = ({ module, onPreviewLesson }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-left"
      >
        <div className="flex items-center gap-3">
          <Icon
            icon={isExpanded ? ChevronDown : ChevronRight}
            size="sm"
            className="text-gray-400"
          />
          <Typography variant="body" weight="medium">{module.title}</Typography>
        </div>
        <Typography variant="small" color="secondary">
          {module.lessonCount} lessons • {module.duration}m
        </Typography>
      </button>
      
      {isExpanded && module.lessons && (
        <div className="border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
          {module.lessons.map((lesson, index) => (
            <div
              key={lesson.id}
              className={cn(
                'flex items-center justify-between px-4 py-3',
                index < module.lessons!.length - 1 && 'border-b border-gray-200 dark:border-gray-700'
              )}
            >
              <div className="flex items-center gap-3">
                <Icon
                  icon={lesson.isFreePreview ? PlayCircle : Lock}
                  size="sm"
                  className={lesson.isFreePreview ? 'text-indigo-500' : 'text-gray-400'}
                />
                <Typography variant="small">{lesson.title}</Typography>
                {lesson.isFreePreview && (
                  <Badge variant="info" size="sm">Preview</Badge>
                )}
              </div>
              <div className="flex items-center gap-2">
                {lesson.duration && (
                  <Typography variant="small" color="secondary">{lesson.duration}m</Typography>
                )}
                {lesson.isFreePreview && onPreviewLesson && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      onPreviewLesson(lesson.id);
                    }}
                  >
                    Watch
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export const EnrollmentTemplate: React.FC<EnrollmentTemplateProps> = ({
  courseId,
  courseTitle,
  courseDescription,
  courseThumbnail,
  category,
  difficulty,
  totalLessons,
  totalDuration,
  rating,
  ratingCount,
  studentCount,
  lastUpdated,
  instructor,
  modules,
  learningOutcomes = [],
  prerequisites = [],
  reviews = [],
  availableLanguages = DEFAULT_LANGUAGES,
  isEnrolled = false,
  isEnrolling = false,
  onEnroll,
  onStartCourse,
  onPreviewLesson,
  onBack,
  user,
  navigationItems = [],
  logo,
  onLogoClick,
  onLogout,
  className,
}) => {
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
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Back Button */}
        {onBack && (
          <Button variant="ghost" size="sm" icon={ArrowLeft} onClick={onBack}>
            Back to Courses
          </Button>
        )}

        {/* Course Header */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Course Info - 2 columns */}
          <div className="lg:col-span-2 space-y-4">
            {/* Thumbnail (mobile) */}
            <div className="lg:hidden aspect-video rounded-xl overflow-hidden bg-gradient-to-br from-indigo-500 to-purple-600">
              {courseThumbnail ? (
                <img src={courseThumbnail} alt={courseTitle} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Icon icon={BookOpen} className="w-16 h-16 text-white/50" />
                </div>
              )}
            </div>

            {/* Meta badges */}
            <div className="flex flex-wrap items-center gap-2">
              {category && <Badge variant="default">{category}</Badge>}
              {difficulty && <DifficultyBadge level={difficulty} />}
              {availableLanguages.length > 1 && (
                <Badge variant="info">
                  <Icon icon={Globe} size="xs" className="mr-1" />
                  {availableLanguages.length} Languages
                </Badge>
              )}
            </div>

            <Typography variant="h2">{courseTitle}</Typography>
            
            <Typography variant="body" color="secondary" className="text-lg">
              {courseDescription}
            </Typography>

            {/* Course Stats */}
            <div className="flex flex-wrap items-center gap-4">
              {rating !== undefined && (
                <StarRating rating={rating} count={ratingCount} />
              )}
              {studentCount !== undefined && (
                <span className="flex items-center gap-1 text-sm text-gray-500">
                  <Icon icon={Users} size="sm" />
                  {studentCount.toLocaleString()} students
                </span>
              )}
            </div>

            {/* Instructor */}
            {instructor && (
              <Card className="mt-4">
                <div className="flex items-start gap-4">
                  <Avatar
                    src={instructor.avatar}
                    initials={instructor.name.substring(0, 2)}
                    size="lg"
                  />
                  <div className="flex-1">
                    <Typography variant="small" color="secondary">Instructor</Typography>
                    <Typography variant="h6">{instructor.name}</Typography>
                    {instructor.title && (
                      <Typography variant="small" color="secondary">{instructor.title}</Typography>
                    )}
                    <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                      {instructor.courseCount !== undefined && (
                        <span className="flex items-center gap-1">
                          <Icon icon={BookOpen} size="xs" />
                          {instructor.courseCount} courses
                        </span>
                      )}
                      {instructor.studentCount !== undefined && (
                        <span className="flex items-center gap-1">
                          <Icon icon={Users} size="xs" />
                          {instructor.studentCount.toLocaleString()} students
                        </span>
                      )}
                      {instructor.rating !== undefined && (
                        <span className="flex items-center gap-1">
                          <Icon icon={Star} size="xs" className="text-yellow-400" />
                          {instructor.rating.toFixed(1)} rating
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </Card>
            )}
          </div>

          {/* Enrollment Card - 1 column */}
          <div className="lg:col-span-1">
            <Card className="sticky top-4">
              {/* Thumbnail (desktop) */}
              <div className="hidden lg:block aspect-video rounded-lg overflow-hidden bg-gradient-to-br from-indigo-500 to-purple-600 mb-4">
                {courseThumbnail ? (
                  <img src={courseThumbnail} alt={courseTitle} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Icon icon={BookOpen} className="w-12 h-12 text-white/50" />
                  </div>
                )}
              </div>

              {/* Course Highlights */}
              <div className="space-y-3 mb-6">
                <div className="flex items-center gap-3">
                  <Icon icon={BookOpen} size="md" className="text-indigo-500" />
                  <div>
                    <Typography variant="body" weight="medium">{totalLessons} lessons</Typography>
                    <Typography variant="small" color="secondary">Comprehensive curriculum</Typography>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Icon icon={Clock} size="md" className="text-indigo-500" />
                  <div>
                    <Typography variant="body" weight="medium">{formatDuration(totalDuration)} total</Typography>
                    <Typography variant="small" color="secondary">Learn at your pace</Typography>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Icon icon={Layers} size="md" className="text-indigo-500" />
                  <div>
                    <Typography variant="body" weight="medium">{modules.length} modules</Typography>
                    <Typography variant="small" color="secondary">Structured learning path</Typography>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Icon icon={Award} size="md" className="text-indigo-500" />
                  <div>
                    <Typography variant="body" weight="medium">Certificate</Typography>
                    <Typography variant="small" color="secondary">Upon completion</Typography>
                  </div>
                </div>
              </div>

              <Divider className="my-4" />

              {/* CTA */}
              {isEnrolled ? (
                <div className="space-y-3">
                  <Badge variant="success" className="w-full justify-center py-2">
                    <Icon icon={CheckCircle} size="sm" className="mr-2" />
                    Already Enrolled
                  </Badge>
                  <Button
                    variant="primary"
                    className="w-full"
                    icon={PlayCircle}
                    onClick={onStartCourse}
                  >
                    Go to Course
                  </Button>
                </div>
              ) : (
                <Button
                  variant="primary"
                  className="w-full"
                  size="lg"
                  onClick={onEnroll}
                  disabled={isEnrolling}
                >
                  {isEnrolling ? 'Enrolling...' : 'Enroll Now — Free'}
                </Button>
              )}

              {lastUpdated && (
                <Typography variant="small" color="secondary" className="text-center mt-4">
                  Last updated {formatDate(lastUpdated)}
                </Typography>
              )}
            </Card>
          </div>
        </div>

        {/* What You'll Learn */}
        {learningOutcomes.length > 0 && (
          <Card>
            <Typography variant="h5" className="mb-4">What you'll learn</Typography>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {learningOutcomes.map((outcome, index) => (
                <div key={index} className="flex items-start gap-2">
                  <Icon icon={CheckCircle} size="sm" className="text-green-500 mt-0.5 flex-shrink-0" />
                  <Typography variant="body">{outcome}</Typography>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Prerequisites */}
        {prerequisites.length > 0 && (
          <Card>
            <Typography variant="h5" className="mb-4">Prerequisites</Typography>
            <ul className="list-disc list-inside space-y-2">
              {prerequisites.map((prereq, index) => (
                <li key={index}>
                  <Typography variant="body" as="span">{prereq}</Typography>
                </li>
              ))}
            </ul>
          </Card>
        )}

        {/* Course Content */}
        <Card>
          <div className="flex items-center justify-between mb-4">
            <Typography variant="h5">Course Content</Typography>
            <Typography variant="small" color="secondary">
              {modules.length} modules • {totalLessons} lessons • {formatDuration(totalDuration)}
            </Typography>
          </div>
          <div className="space-y-2">
            {modules.map((module) => (
              <ModulePreview
                key={module.id}
                module={module}
                onPreviewLesson={onPreviewLesson}
              />
            ))}
          </div>
        </Card>

        {/* Reviews */}
        {reviews.length > 0 && (
          <Card>
            <div className="flex items-center justify-between mb-4">
              <Typography variant="h5">Student Reviews</Typography>
              {rating !== undefined && (
                <div className="flex items-center gap-2">
                  <Icon icon={Star} size="md" className="text-yellow-400 fill-yellow-400" />
                  <Typography variant="h4">{rating.toFixed(1)}</Typography>
                  <Typography variant="small" color="secondary">
                    ({ratingCount?.toLocaleString()} reviews)
                  </Typography>
                </div>
              )}
            </div>
            <div className="space-y-4">
              {reviews.slice(0, 5).map((review) => (
                <div key={review.id} className="pb-4 border-b border-gray-200 dark:border-gray-700 last:border-0 last:pb-0">
                  <div className="flex items-start gap-3">
                    <Avatar
                      src={review.reviewerAvatar}
                      initials={review.reviewerName.substring(0, 2)}
                      size="sm"
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Typography variant="body" weight="medium">{review.reviewerName}</Typography>
                        <div className="flex items-center gap-0.5">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <Icon
                              key={star}
                              icon={Star}
                              size="xs"
                              className={cn(
                                star <= review.rating
                                  ? 'text-yellow-400 fill-yellow-400'
                                  : 'text-gray-300'
                              )}
                            />
                          ))}
                        </div>
                      </div>
                      <Typography variant="body" color="secondary">{review.text}</Typography>
                      <Typography variant="small" color="muted" className="mt-1">
                        {formatDate(review.date)}
                      </Typography>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>
    </AppLayoutTemplate>
  );
};

EnrollmentTemplate.displayName = 'EnrollmentTemplate';
