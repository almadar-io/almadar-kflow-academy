/**
 * Container Helper Utilities for Mentor Feature
 * 
 * These utilities help transform API data to component library prop formats.
 * Feature-specific transformations live here.
 */

import type { MentorPublishedCourse } from '../../knowledge-graph/hooks';
import type { CourseCardProps } from '@components/organisms/CourseCard';
import type { LearningPathSummary } from '../../knowledge-graph/api/types';

/**
 * Transform MentorPublishedCourse to CourseCardProps
 */
export const transformCourseToCard = (course: MentorPublishedCourse): CourseCardProps => {
  return {
    id: course.graphId,
    title: course.title,
    description: course.description,
    imageUrl: course.thumbnailUrl,
    isPublic: course.visibility === 'public',
    status: course.isPublished ? 'published' : 'draft',
    modules: course.totalModules || 0,
    // Note: progress would come from student progress data if available
    progress: undefined,
    onClick: () => {
      // Navigation handled by container
    },
  };
};

/**
 * Transform LearningPathSummary to a display format
 * (Can be used for cards or other components)
 */
export const transformLearningPathToDisplay = (path: LearningPathSummary) => {
  return {
    id: path.id,
    title: path.title || 'Untitled Learning Path',
    description: path.description,
    conceptCount: path.conceptCount,
    seedConcept: path.seedConcept,
    updatedAt: path.updatedAt,
    createdAt: path.createdAt,
  };
};

/**
 * Error handling utility for containers
 */
export const useContainerError = (error: string | null) => {
  if (!error) return null;
  
  return {
    message: error,
    variant: 'error' as const,
  };
};
