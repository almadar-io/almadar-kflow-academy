/**
 * Tests for Mentor Container Helpers
 */

import { transformCourseToCard, transformLearningPathToDisplay } from '../containerHelpers';
import type { MentorPublishedCourse } from '../../../knowledge-graph/api/publishingApi';
import type { LearningPathSummary } from '../../../knowledge-graph/api/types';

describe('Mentor Container Helpers', () => {
  describe('transformCourseToCard', () => {
    it('should transform MentorPublishedCourse to CourseCardProps', () => {
      const course: MentorPublishedCourse = {
        graphId: 'graph-1',
        title: 'Test Course',
        description: 'Test Description',
        thumbnailUrl: 'https://example.com/image.jpg',
        isPublished: true,
        publishedAt: Date.now(),
        visibility: 'public',
        enrollmentEnabled: true,
        totalModules: 2,
        totalLessons: 10,
      };

      const result = transformCourseToCard(course);

      expect(result).toMatchObject({
        id: 'graph-1',
        title: 'Test Course',
        description: 'Test Description',
        imageUrl: 'https://example.com/image.jpg',
        isPublic: true,
        status: 'published',
        modules: 2,
      });
    });

    it('should handle missing optional fields', () => {
      const course: MentorPublishedCourse = {
        graphId: 'graph-1',
        title: 'Test Course',
        isPublished: false,
        visibility: 'private',
        enrollmentEnabled: false,
      };

      const result = transformCourseToCard(course);

      expect(result).toMatchObject({
        id: 'graph-1',
        title: 'Test Course',
        description: undefined,
        imageUrl: undefined,
        isPublic: false,
        status: 'draft',
        modules: 0,
      });
    });
  });

  describe('transformLearningPathToDisplay', () => {
    it('should transform LearningPathSummary to display format', () => {
      const path: LearningPathSummary = {
        id: 'graph-1',
        title: 'Test Goal',
        description: 'Test Description',
        conceptCount: 10,
        seedConcept: {
          id: 'concept-1',
          name: 'Seed Concept',
          description: 'Seed description',
        },
        updatedAt: Date.now(),
        createdAt: Date.now(),
      };

      const result = transformLearningPathToDisplay(path);

      expect(result).toMatchObject({
        id: 'graph-1',
        title: 'Test Goal',
        description: 'Test Description',
        conceptCount: 10,
        seedConcept: {
          id: 'concept-1',
          name: 'Seed Concept',
          description: 'Seed description',
        },
      });
    });

    it('should handle missing title', () => {
      const path: LearningPathSummary = {
        id: 'graph-1',
        title: '',
        description: 'Test Description',
        conceptCount: 5,
        seedConcept: null,
        updatedAt: Date.now(),
        createdAt: Date.now(),
      };

      const result = transformLearningPathToDisplay(path);

      expect(result.title).toBe('Untitled Learning Path');
    });

    it('should handle null seed concept', () => {
      const path: LearningPathSummary = {
        id: 'graph-1',
        title: 'Test Goal',
        description: 'Test Description',
        conceptCount: 5,
        seedConcept: null,
        updatedAt: Date.now(),
        createdAt: Date.now(),
      };

      const result = transformLearningPathToDisplay(path);

      expect(result.seedConcept).toBeNull();
    });
  });
});
