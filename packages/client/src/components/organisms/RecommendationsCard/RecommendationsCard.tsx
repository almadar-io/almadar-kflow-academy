/**
 * RecommendationsCard Organism Component
 * 
 * Displays course recommendations and continue learning options.
 * Uses Card, Icon, Typography, Button atoms and Card molecule.
 */

import React from 'react';
import { Sparkles, BookOpen, ArrowRight } from 'lucide-react';
import { Card } from '../../molecules/Card';
import { Icon } from '../../atoms/Icon';
import { Typography } from '../../atoms/Typography';
import { Spinner } from '../../atoms/Spinner';
import { Alert } from '../../molecules/Alert';
import { cn } from '../../../utils/theme';

export interface RecommendedCourse {
  id: string;
  title?: string;
  seedConceptName?: string;
  description?: string;
}

export interface RecommendationsCardProps {
  /**
   * Recommended courses
   */
  recommendedCourses?: RecommendedCourse[];
  
  /**
   * Continue learning courses
   */
  continueCourses?: RecommendedCourse[];
  
  /**
   * Is loading
   */
  isLoading?: boolean;
  
  /**
   * Error message
   */
  error?: string | null;
  
  /**
   * On course click
   */
  onCourseClick?: (courseId: string) => void;
  
  /**
   * Additional CSS classes
   */
  className?: string;
}

export const RecommendationsCard: React.FC<RecommendationsCardProps> = ({
  recommendedCourses = [],
  continueCourses = [],
  isLoading = false,
  error = null,
  onCourseClick,
  className,
}) => {
  const hasRecommendations = recommendedCourses.length > 0 || continueCourses.length > 0;

  if (isLoading) {
    return (
      <Card className={className} loading>
        <div className="flex items-center justify-center gap-3 py-8">
          <Spinner size="md" />
          <Typography variant="body" color="secondary">
            Loading recommendations...
          </Typography>
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={className}>
        <Alert variant="error" title="Error loading recommendations">
          {error}
        </Alert>
      </Card>
    );
  }

  if (!hasRecommendations) {
    return null; // Don't show section if no recommendations
  }

  const handleCourseClick = (courseId: string) => {
    if (onCourseClick) {
      onCourseClick(courseId);
    }
  };

  return (
    <Card
      className={className}
      header={
        <div className="flex items-center gap-2">
          <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg text-purple-600 dark:text-purple-400">
            <Icon icon={Sparkles} size="md" />
          </div>
          <Typography variant="h6">Recommended for You</Typography>
        </div>
      }
    >
      {/* Continue Learning Section */}
      {continueCourses.length > 0 && (
        <div className="mb-6">
          <Typography variant="body" className="text-sm font-semibold mb-3">
            Continue Learning
          </Typography>
          <div className="space-y-2">
            {continueCourses.map((course) => (
              <div
                key={course.id}
                onClick={() => handleCourseClick(course.id)}
                className={cn(
                  'flex items-center justify-between p-3 rounded-lg border border-gray-200 dark:border-gray-700',
                  'hover:border-indigo-300 dark:hover:border-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20',
                  'transition-colors cursor-pointer group',
                  onCourseClick && 'cursor-pointer'
                )}
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg text-indigo-600 dark:text-indigo-400 flex-shrink-0">
                    <Icon icon={BookOpen} size="sm" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <Typography variant="body" className="font-medium truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400">
                      {course.title || course.seedConceptName || `Course ${course.id}`}
                    </Typography>
                    {course.description && (
                      <Typography variant="body" color="secondary" className="text-xs line-clamp-1 mt-1">
                        {course.description}
                      </Typography>
                    )}
                  </div>
                </div>
                <Icon icon={ArrowRight} size="sm" className="text-gray-400 dark:text-gray-500 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 flex-shrink-0 ml-2" />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recommended Courses Section */}
      {recommendedCourses.length > 0 && (
        <div>
          <Typography variant="body" className="text-sm font-semibold mb-3">
            Discover New Courses
          </Typography>
          <div className="space-y-2">
            {recommendedCourses.map((course) => (
              <div
                key={course.id}
                onClick={() => handleCourseClick(course.id)}
                className={cn(
                  'flex items-center justify-between p-3 rounded-lg border border-gray-200 dark:border-gray-700',
                  'hover:border-indigo-300 dark:hover:border-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20',
                  'transition-colors cursor-pointer group',
                  onCourseClick && 'cursor-pointer'
                )}
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg text-purple-600 dark:text-purple-400 flex-shrink-0">
                    <Icon icon={BookOpen} size="sm" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <Typography variant="body" className="font-medium truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400">
                      {course.title || course.seedConceptName || `Course ${course.id}`}
                    </Typography>
                    {course.description && (
                      <Typography variant="body" color="secondary" className="text-xs line-clamp-1 mt-1">
                        {course.description}
                      </Typography>
                    )}
                  </div>
                </div>
                <Icon icon={ArrowRight} size="sm" className="text-gray-400 dark:text-gray-500 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 flex-shrink-0 ml-2" />
              </div>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
};

RecommendationsCard.displayName = 'RecommendationsCard';
