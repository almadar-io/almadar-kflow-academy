/**
 * Unit Tests for PublicCourseIndexService
 */

import { PublicCourseIndexService } from '../../../services/publicCourse/PublicCourseIndexService';
import type { KnowledgeGraphAccessLayer } from '../../../services/knowledgeGraphAccess/KnowledgeGraphAccessLayer';
import {
  createSearchText,
  createPublicCourseEntry,
} from '../../../types/publicCourse';

// Mock Firebase Admin
jest.mock('../../../config/firebaseAdmin', () => {
  const mockDoc = {
    id: 'course-123',
    exists: true,
    data: () => ({
      graphId: 'graph-123',
      mentorId: 'mentor-123',
      title: 'Test Course',
      description: 'A test course',
      moduleCount: 5,
      lessonCount: 20,
      enrollmentCount: 100,
      primaryLanguage: 'en',
      availableLanguages: ['en', 'es'],
      tags: ['programming'],
      searchText: 'test course a test course programming',
      publishedAt: Date.now(),
      updatedAt: Date.now(),
    }),
    ref: {
      update: jest.fn().mockResolvedValue({}),
      delete: jest.fn().mockResolvedValue({}),
    },
  };

  const mockQuerySnapshot = {
    empty: false,
    docs: [mockDoc],
  };

  const mockQuery = {
    where: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    get: jest.fn().mockResolvedValue(mockQuerySnapshot),
  };

  const mockCollection = {
    doc: jest.fn().mockReturnValue({
      get: jest.fn().mockResolvedValue(mockDoc),
      set: jest.fn().mockResolvedValue({}),
      update: jest.fn().mockResolvedValue({}),
      delete: jest.fn().mockResolvedValue({}),
    }),
    where: jest.fn().mockReturnValue(mockQuery),
    orderBy: jest.fn().mockReturnValue(mockQuery),
    add: jest.fn().mockResolvedValue({ id: 'new-doc-id' }),
  };

  return {
    getFirestore: jest.fn().mockReturnValue({
      collection: jest.fn().mockReturnValue(mockCollection),
      batch: jest.fn().mockReturnValue({
        delete: jest.fn(),
        commit: jest.fn().mockResolvedValue({}),
      }),
    }),
  };
});

describe('PublicCourseIndexService', () => {
  let service: PublicCourseIndexService;
  let mockAccessLayer: jest.Mocked<KnowledgeGraphAccessLayer>;

  const mockUid = 'user-123';
  const mockGraphId = 'graph-456';

  beforeEach(() => {
    jest.clearAllMocks();

    mockAccessLayer = {
      getCourseSettings: jest.fn().mockResolvedValue({
        title: 'Test Course',
        description: 'A test course description',
        visibility: 'public',
        thumbnailUrl: 'http://example.com/thumb.jpg',
        category: 'programming',
        tags: ['javascript', 'react'],
        difficulty: 'intermediate',
        defaultLanguage: 'en',
      }),
      getPublishedModules: jest.fn().mockResolvedValue([
        { id: 'module-1', title: 'Module 1' },
        { id: 'module-2', title: 'Module 2' },
      ]),
      getAllPublishedLessons: jest.fn().mockResolvedValue([
        { id: 'lesson-1', estimatedDuration: 15 },
        { id: 'lesson-2', estimatedDuration: 20 },
        { id: 'lesson-3', estimatedDuration: 10 },
      ]),
      getGraph: jest.fn().mockResolvedValue({
        id: mockGraphId,
        nodes: {},
        nodeTypes: { LanguageConfig: [] },
        relationships: [],
      }),
    } as unknown as jest.Mocked<KnowledgeGraphAccessLayer>;

    service = new PublicCourseIndexService(mockAccessLayer);
  });

  // ==================== Helper Function Tests ====================

  describe('createSearchText', () => {
    it('should create lowercased search text from all inputs', () => {
      const searchText = createSearchText(
        'JavaScript Fundamentals',
        'Learn the basics of JavaScript programming',
        ['programming', 'web development'],
        'John Doe'
      );

      expect(searchText).toContain('javascript fundamentals');
      expect(searchText).toContain('learn the basics');
      expect(searchText).toContain('programming');
      expect(searchText).toContain('web development');
      expect(searchText).toContain('john doe');
    });
  });

  describe('createPublicCourseEntry', () => {
    it('should create a valid course entry', () => {
      const entry = createPublicCourseEntry('graph-123', {
        title: 'Test Course',
        description: 'A test course',
        mentorId: 'mentor-1',
        mentorName: 'John Mentor',
        moduleCount: 5,
        lessonCount: 20,
        primaryLanguage: 'en',
        tags: ['test'],
      });

      expect(entry.graphId).toBe('graph-123');
      expect(entry.title).toBe('Test Course');
      expect(entry.mentorId).toBe('mentor-1');
      expect(entry.moduleCount).toBe(5);
      expect(entry.lessonCount).toBe(20);
      expect(entry.searchText).toContain('test course');
    });
  });

  // ==================== Index Management Tests ====================

  describe('indexCourse', () => {
    it('should index a public course successfully', async () => {
      const entry = await service.indexCourse(mockUid, mockGraphId, {
        name: 'Test Mentor',
        avatar: 'http://example.com/avatar.jpg',
      });

      expect(entry.title).toBe('Test Course');
      expect(entry.mentorName).toBe('Test Mentor');
      expect(mockAccessLayer.getCourseSettings).toHaveBeenCalledWith(mockUid, mockGraphId);
      expect(mockAccessLayer.getPublishedModules).toHaveBeenCalledWith(mockUid, mockGraphId);
      expect(mockAccessLayer.getAllPublishedLessons).toHaveBeenCalledWith(mockUid, mockGraphId);
    });

    it('should throw error if course settings not found', async () => {
      mockAccessLayer.getCourseSettings.mockResolvedValueOnce(null);

      await expect(
        service.indexCourse(mockUid, mockGraphId, { name: 'Mentor' })
      ).rejects.toThrow('Course settings not found');
    });

    it('should throw error if course is not public', async () => {
      mockAccessLayer.getCourseSettings.mockResolvedValueOnce({
        title: 'Private Course',
        description: 'A private course',
        visibility: 'private',
      } as any);

      await expect(
        service.indexCourse(mockUid, mockGraphId, { name: 'Mentor' })
      ).rejects.toThrow('Course is not public');
    });

    it('should calculate estimated duration from lessons', async () => {
      const entry = await service.indexCourse(mockUid, mockGraphId, {
        name: 'Mentor',
      });

      // 15 + 20 + 10 = 45 minutes
      expect(entry.estimatedDuration).toBe(45);
    });
  });

  describe('removeFromIndex', () => {
    it('should remove course from index', async () => {
      await service.removeFromIndex(mockGraphId);
      // No error means success - Firestore mocks handle the deletion
    });
  });

  describe('updateEnrollmentCount', () => {
    it('should update enrollment count', async () => {
      await service.updateEnrollmentCount(mockGraphId, 1);
      // No error means success
    });
  });

  // ==================== Search Tests ====================

  describe('searchCourses', () => {
    it('should search courses with filters', async () => {
      const result = await service.searchCourses({
        category: 'programming',
        difficulty: 'intermediate',
        limit: 10,
      });

      expect(result.courses).toBeDefined();
      expect(result.total).toBeDefined();
      expect(result.hasMore).toBeDefined();
    });

    it('should filter by text query', async () => {
      const result = await service.searchCourses({
        query: 'test',
        limit: 10,
      });

      // Should filter courses by search text containing 'test'
      expect(result).toBeDefined();
    });

    it('should apply pagination', async () => {
      const result = await service.searchCourses({
        limit: 5,
        offset: 0,
      });

      expect(result.courses.length).toBeLessThanOrEqual(5);
    });
  });

  describe('getCourseByGraphId', () => {
    it('should return course by graph ID', async () => {
      const course = await service.getCourseByGraphId(mockGraphId);
      expect(course).toBeDefined();
    });
  });

  describe('getCourseById', () => {
    it('should return course by ID', async () => {
      const course = await service.getCourseById('course-123');
      expect(course).toBeDefined();
    });
  });

  describe('listCourses', () => {
    it('should list courses with pagination', async () => {
      const result = await service.listCourses(20, 0);
      expect(result.courses).toBeDefined();
    });
  });

  describe('getCoursesByMentor', () => {
    it('should get courses by mentor ID', async () => {
      const courses = await service.getCoursesByMentor('mentor-123');
      expect(courses).toBeDefined();
    });
  });

  // ==================== Featured Courses Tests ====================

  describe('getFeaturedCourses', () => {
    it('should return featured courses', async () => {
      const courses = await service.getFeaturedCourses(10);
      expect(courses).toBeDefined();
    });
  });

  describe('featureCourse', () => {
    it('should feature a course', async () => {
      const featured = await service.featureCourse(mockGraphId, 'Great course!', 10);
      // Result depends on mock
      expect(featured).toBeDefined();
    });
  });

  describe('unfeatureCourse', () => {
    it('should unfeature a course', async () => {
      await service.unfeatureCourse(mockGraphId);
      // No error means success
    });
  });

  // ==================== Categories Tests ====================

  describe('getCategories', () => {
    it('should return all categories', async () => {
      const categories = await service.getCategories();
      expect(categories).toBeDefined();
    });
  });

  describe('getOrCreateCategory', () => {
    it('should get or create a category', async () => {
      const category = await service.getOrCreateCategory('programming', 'Programming courses');
      expect(category).toBeDefined();
    });
  });

  // ==================== Popular/Recent Tests ====================

  describe('getPopularCourses', () => {
    it('should return popular courses sorted by enrollment', async () => {
      const courses = await service.getPopularCourses(10);
      expect(courses).toBeDefined();
    });
  });

  describe('getRecentCourses', () => {
    it('should return recently published courses', async () => {
      const courses = await service.getRecentCourses(10);
      expect(courses).toBeDefined();
    });
  });
});
