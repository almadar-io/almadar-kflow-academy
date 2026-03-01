/**
 * Unit Tests for Analytics Controller
 */

import { Request, Response } from 'express';
import {
  getCourseAnalyticsHandler,
  getLessonAnalyticsHandler,
  getStudentAnalyticsHandler,
  getLanguageAnalyticsHandler,
} from '../../controllers/analyticsController';

// Mock the services
jest.mock('../../services/analytics/CourseAnalyticsService', () => {
  return {
    CourseAnalyticsService: jest.fn().mockImplementation(() => ({
      getCourseAnalytics: jest.fn().mockResolvedValue({
        courseId: 'course-123',
        courseName: 'Test Course',
        totalStudents: 100,
        activeStudents: 75,
        totalLessons: 20,
        averageCompletionRate: 65.5,
        progressDistribution: {
          notStarted: 10,
          inProgress: 50,
          nearCompletion: 25,
          completed: 15,
        },
        assessmentOverview: {
          totalAssessments: 10,
          averageScore: 78.5,
          passRate: 85,
        },
      }),
      getLessonAnalytics: jest.fn().mockResolvedValue({
        lessonId: 'lesson-123',
        lessonName: 'Introduction',
        completionCount: 80,
        averageTimeSpent: 1200,
        assessmentStats: {
          attemptCount: 100,
          averageScore: 82,
          passRate: 90,
        },
      }),
      getStudentAnalytics: jest.fn().mockResolvedValue({
        studentId: 'student-123',
        enrolledAt: Date.now() - 86400000,
        lastActiveAt: Date.now(),
        lessonsCompleted: 15,
        totalLessons: 20,
        averageAssessmentScore: 88,
        engagementScore: 95,
        isAtRisk: false,
      }),
      getLanguageAnalytics: jest.fn().mockResolvedValue({
        primaryLanguage: 'en',
        translatedLanguages: ['es', 'ar'],
        languageUsage: {
          en: 70,
          es: 20,
          ar: 10,
        },
        translationStats: {
          totalTranslations: 40,
          staleTranslations: 5,
          coveragePercentage: 80,
        },
      }),
    })),
  };
});

jest.mock('../../services/knowledgeGraphAccess/KnowledgeGraphAccessLayer', () => {
  return {
    KnowledgeGraphAccessLayer: jest.fn().mockImplementation(() => ({})),
  };
});

jest.mock('../../services/enrollment/EnrollmentService', () => {
  return {
    EnrollmentService: jest.fn().mockImplementation(() => ({})),
  };
});

describe('Analytics Controller', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let responseJson: jest.Mock;
  let responseStatus: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();

    responseJson = jest.fn().mockReturnThis();
    responseStatus = jest.fn().mockReturnThis();

    mockResponse = {
      json: responseJson,
      status: responseStatus,
    };
  });

  // ==================== getCourseAnalyticsHandler ====================

  describe('getCourseAnalyticsHandler', () => {
    it('should return course analytics successfully', async () => {
      mockRequest = {
        firebaseUser: { uid: 'user-123' },
        params: { graphId: 'graph-123' },
      } as any;

      await getCourseAnalyticsHandler(
        mockRequest as any,
        mockResponse as any
      );

      expect(responseJson).toHaveBeenCalledWith({
        analytics: expect.objectContaining({
          courseId: 'course-123',
          totalStudents: 100,
          averageCompletionRate: 65.5,
        }),
      });
    });

    it('should return 401 if not authenticated', async () => {
      mockRequest = {
        firebaseUser: undefined,
        params: { graphId: 'graph-123' },
      } as any;

      await getCourseAnalyticsHandler(
        mockRequest as any,
        mockResponse as any
      );

      expect(responseStatus).toHaveBeenCalledWith(401);
      expect(responseJson).toHaveBeenCalledWith({ error: 'Unauthorized' });
    });
  });

  // ==================== getLessonAnalyticsHandler ====================

  describe('getLessonAnalyticsHandler', () => {
    it('should return lesson analytics successfully', async () => {
      mockRequest = {
        firebaseUser: { uid: 'user-123' },
        params: { graphId: 'graph-123', lessonId: 'lesson-456' },
      } as any;

      await getLessonAnalyticsHandler(
        mockRequest as any,
        mockResponse as any
      );

      expect(responseJson).toHaveBeenCalledWith({
        analytics: expect.objectContaining({
          lessonId: 'lesson-123',
          completionCount: 80,
        }),
      });
    });

    it('should return 401 if not authenticated', async () => {
      mockRequest = {
        firebaseUser: undefined,
        params: { graphId: 'graph-123', lessonId: 'lesson-456' },
      } as any;

      await getLessonAnalyticsHandler(
        mockRequest as any,
        mockResponse as any
      );

      expect(responseStatus).toHaveBeenCalledWith(401);
    });
  });

  // ==================== getStudentAnalyticsHandler ====================

  describe('getStudentAnalyticsHandler', () => {
    it('should return student analytics successfully', async () => {
      mockRequest = {
        firebaseUser: { uid: 'user-123' },
        params: { graphId: 'graph-123', studentId: 'student-456' },
      } as any;

      await getStudentAnalyticsHandler(
        mockRequest as any,
        mockResponse as any
      );

      expect(responseJson).toHaveBeenCalledWith({
        analytics: expect.objectContaining({
          studentId: 'student-123',
          lessonsCompleted: 15,
          engagementScore: 95,
        }),
      });
    });

    it('should return 401 if not authenticated', async () => {
      mockRequest = {
        firebaseUser: undefined,
        params: { graphId: 'graph-123', studentId: 'student-456' },
      } as any;

      await getStudentAnalyticsHandler(
        mockRequest as any,
        mockResponse as any
      );

      expect(responseStatus).toHaveBeenCalledWith(401);
    });
  });

  // ==================== getLanguageAnalyticsHandler ====================

  describe('getLanguageAnalyticsHandler', () => {
    it('should return language analytics successfully', async () => {
      mockRequest = {
        firebaseUser: { uid: 'user-123' },
        params: { graphId: 'graph-123' },
      } as any;

      await getLanguageAnalyticsHandler(
        mockRequest as any,
        mockResponse as any
      );

      expect(responseJson).toHaveBeenCalledWith({
        analytics: expect.objectContaining({
          primaryLanguage: 'en',
          translatedLanguages: ['es', 'ar'],
        }),
      });
    });

    it('should return 401 if not authenticated', async () => {
      mockRequest = {
        firebaseUser: undefined,
        params: { graphId: 'graph-123' },
      } as any;

      await getLanguageAnalyticsHandler(
        mockRequest as any,
        mockResponse as any
      );

      expect(responseStatus).toHaveBeenCalledWith(401);
    });
  });
});
