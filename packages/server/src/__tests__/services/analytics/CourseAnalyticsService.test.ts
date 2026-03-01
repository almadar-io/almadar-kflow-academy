/**
 * Unit Tests for CourseAnalyticsService
 */

import { CourseAnalyticsService } from '../../../services/analytics/CourseAnalyticsService';
import type { KnowledgeGraphAccessLayer } from '../../../services/knowledgeGraphAccess/KnowledgeGraphAccessLayer';
import type { EnrollmentService } from '../../../services/enrollment/EnrollmentService';
import type { CourseEnrollment } from '../../../types/enrollment';

// Mock Firebase Admin
jest.mock('../../../config/firebaseAdmin', () => ({
  getFirestore: jest.fn(),
}));

import { getFirestore } from '../../../config/firebaseAdmin';

describe('CourseAnalyticsService', () => {
  let analyticsService: CourseAnalyticsService;
  let mockAccessLayer: jest.Mocked<KnowledgeGraphAccessLayer>;
  let mockEnrollmentService: jest.Mocked<EnrollmentService>;
  let mockFirestore: any;

  const mockMentorId = 'mentor-123';
  const mockGraphId = 'graph-456';

  // Sample enrollments for testing
  const createMockEnrollments = (): CourseEnrollment[] => {
    const now = Date.now();
    return [
      {
        id: 'enroll-1',
        mentorId: mockMentorId,
        graphId: mockGraphId,
        enrolledAt: now - 30 * 24 * 60 * 60 * 1000, // 30 days ago
        enrolledVia: 'public',
        progress: {
          currentLayerId: 'layer-2',
          currentConceptId: 'concept-3',
          completedLayers: ['layer-1'],
          completedConcepts: ['concept-1', 'concept-2'],
          assessmentResults: {
            'concept-1': {
              assessmentId: 'assess-1',
              conceptId: 'concept-1',
              score: 85,
              maxScore: 100,
              percentage: 85,
              passed: true,
              attempts: 1,
              lastAttemptAt: now - 25 * 24 * 60 * 60 * 1000,
            },
          },
          totalTimeSpent: 120,
          lastAccessedAt: now - 2 * 24 * 60 * 60 * 1000,
          overallProgress: 67,
        },
        settings: {
          preferredLanguage: 'en',
          showBilingualMode: false,
          notificationsEnabled: true,
          notificationFrequency: 'weekly',
          autoAdvance: true,
          showHints: true,
        },
        status: 'active',
        createdAt: now - 30 * 24 * 60 * 60 * 1000,
        updatedAt: now - 2 * 24 * 60 * 60 * 1000,
      },
      {
        id: 'enroll-2',
        mentorId: mockMentorId,
        graphId: mockGraphId,
        enrolledAt: now - 60 * 24 * 60 * 60 * 1000, // 60 days ago
        enrolledVia: 'public',
        progress: {
          currentLayerId: undefined,
          currentConceptId: undefined,
          completedLayers: ['layer-1', 'layer-2'],
          completedConcepts: ['concept-1', 'concept-2', 'concept-3'],
          assessmentResults: {
            'concept-1': {
              assessmentId: 'assess-1',
              conceptId: 'concept-1',
              score: 90,
              maxScore: 100,
              percentage: 90,
              passed: true,
              attempts: 1,
              lastAttemptAt: now - 50 * 24 * 60 * 60 * 1000,
            },
            'concept-2': {
              assessmentId: 'assess-2',
              conceptId: 'concept-2',
              score: 70,
              maxScore: 100,
              percentage: 70,
              passed: true,
              attempts: 2,
              lastAttemptAt: now - 45 * 24 * 60 * 60 * 1000,
            },
          },
          totalTimeSpent: 180,
          lastAccessedAt: now - 30 * 24 * 60 * 60 * 1000,
          overallProgress: 100,
        },
        settings: {
          preferredLanguage: 'es',
          showBilingualMode: true,
          notificationsEnabled: true,
          notificationFrequency: 'daily',
          autoAdvance: true,
          showHints: true,
        },
        status: 'completed',
        createdAt: now - 60 * 24 * 60 * 60 * 1000,
        updatedAt: now - 30 * 24 * 60 * 60 * 1000,
      },
      {
        id: 'enroll-3',
        mentorId: mockMentorId,
        graphId: mockGraphId,
        enrolledAt: now - 10 * 24 * 60 * 60 * 1000, // 10 days ago
        enrolledVia: 'direct',
        progress: {
          currentLayerId: 'layer-1',
          currentConceptId: 'concept-1',
          completedLayers: [],
          completedConcepts: [],
          assessmentResults: {},
          totalTimeSpent: 30,
          lastAccessedAt: now - 5 * 24 * 60 * 60 * 1000,
          overallProgress: 0,
        },
        settings: {
          preferredLanguage: 'en',
          showBilingualMode: false,
          notificationsEnabled: false,
          notificationFrequency: 'never',
          autoAdvance: true,
          showHints: true,
        },
        status: 'active',
        createdAt: now - 10 * 24 * 60 * 60 * 1000,
        updatedAt: now - 5 * 24 * 60 * 60 * 1000,
      },
    ];
  };

  beforeEach(() => {
    jest.clearAllMocks();

    const mockEnrollments = createMockEnrollments();

    // Mock Firestore collectionGroup query
    mockFirestore = {
      collectionGroup: jest.fn(() => ({
        where: jest.fn().mockReturnThis(),
        get: jest.fn().mockResolvedValue({
          docs: mockEnrollments.map(e => ({
            data: () => e,
            id: e.id,
            ref: { parent: { parent: { id: `student-${e.id}` } } },
          })),
        }),
      })),
    };

    (getFirestore as jest.Mock).mockReturnValue(mockFirestore);

    // Mock KnowledgeGraphAccessLayer
    mockAccessLayer = {
      getCourseSettings: jest.fn().mockResolvedValue({
        title: 'Test Course',
        defaultLanguage: 'en',
      }),
      getSeedConceptForPublishing: jest.fn().mockResolvedValue({
        id: 'seed-concept',
        name: 'Test Course',
        description: 'Test description',
        modules: [
          { id: 'layer-1', name: 'Module 1', layerNumber: 1, conceptCount: 2 },
          { id: 'layer-2', name: 'Module 2', layerNumber: 2, conceptCount: 1 },
        ],
      }),
      getPublishedModules: jest.fn().mockResolvedValue([
        { moduleSettingsId: 'ms-1', layerId: 'layer-1', title: 'Module 1', sequence: 1, isPublished: true },
        { moduleSettingsId: 'ms-2', layerId: 'layer-2', title: 'Module 2', sequence: 2, isPublished: true },
      ]),
      getAllPublishedLessons: jest.fn().mockResolvedValue([
        { lessonSettingsId: 'ls-1', conceptId: 'concept-1', title: 'Lesson 1' },
        { lessonSettingsId: 'ls-2', conceptId: 'concept-2', title: 'Lesson 2' },
        { lessonSettingsId: 'ls-3', conceptId: 'concept-3', title: 'Lesson 3' },
      ]),
      getLessonSettings: jest.fn().mockResolvedValue({
        conceptId: 'concept-1',
        title: 'Lesson 1',
        hasAssessment: true,
        passingScore: 70,
      }),
      getNode: jest.fn().mockResolvedValue({
        id: 'concept-1',
        type: 'Concept',
        properties: { name: 'Lesson 1', layer: 1 },
      }),
      getLessonContentForPublishing: jest.fn().mockResolvedValue({
        content: '# Lesson content',
      }),
    } as unknown as jest.Mocked<KnowledgeGraphAccessLayer>;

    // Mock EnrollmentService
    mockEnrollmentService = {
      getCourseStudents: jest.fn().mockResolvedValue([
        { enrollmentId: 'enroll-1', studentId: 'student-1' },
        { enrollmentId: 'enroll-2', studentId: 'student-2' },
        { enrollmentId: 'enroll-3', studentId: 'student-3' },
      ]),
      findEnrollment: jest.fn().mockImplementation(async (studentId: string) => {
        const enrollments = createMockEnrollments();
        return enrollments.find(e => e.id === `enroll-${studentId.split('-')[1]}`) || null;
      }),
    } as unknown as jest.Mocked<EnrollmentService>;

    analyticsService = new CourseAnalyticsService(mockAccessLayer, mockEnrollmentService);
  });

  describe('getCourseAnalytics', () => {
    it('should return comprehensive course analytics', async () => {
      const analytics = await analyticsService.getCourseAnalytics(mockMentorId, mockGraphId);

      expect(analytics).toBeDefined();
      expect(analytics.mentorId).toBe(mockMentorId);
      expect(analytics.graphId).toBe(mockGraphId);
      expect(analytics.courseName).toBe('Test Course');
    });

    it('should calculate enrollment stats correctly', async () => {
      const analytics = await analyticsService.getCourseAnalytics(mockMentorId, mockGraphId);

      expect(analytics.totalEnrollments).toBe(3);
      expect(analytics.activeEnrollments).toBe(2);
      expect(analytics.completedEnrollments).toBe(1);
      expect(analytics.droppedEnrollments).toBe(0);
    });

    it('should calculate progress stats correctly', async () => {
      const analytics = await analyticsService.getCourseAnalytics(mockMentorId, mockGraphId);

      // Average of 67, 100, 0 = 55.67 ≈ 56
      expect(analytics.averageProgress).toBe(56);
      // Median of [0, 67, 100] = 67
      expect(analytics.medianProgress).toBe(67);
    });

    it('should calculate progress distribution correctly', async () => {
      const analytics = await analyticsService.getCourseAnalytics(mockMentorId, mockGraphId);

      expect(analytics.progressDistribution.notStarted).toBe(1); // 0%
      expect(analytics.progressDistribution.almostDone).toBe(1); // 67%
      expect(analytics.progressDistribution.completed).toBe(1); // 100%
    });

    it('should calculate assessment stats correctly', async () => {
      const analytics = await analyticsService.getCourseAnalytics(mockMentorId, mockGraphId);

      expect(analytics.assessmentStats.totalAttempts).toBe(4); // 1 + 1 + 2
      expect(analytics.assessmentStats.passRate).toBe(100); // All passed
      expect(analytics.assessmentStats.lessonsWithAssessments).toBe(2);
    });

    it('should include content stats', async () => {
      const analytics = await analyticsService.getCourseAnalytics(mockMentorId, mockGraphId);

      expect(analytics.totalModules).toBe(2);
      expect(analytics.totalLessons).toBe(3);
      expect(analytics.publishedModules).toBe(2);
      expect(analytics.publishedLessons).toBe(3);
    });
  });

  describe('getLessonAnalytics', () => {
    it('should return lesson analytics', async () => {
      const analytics = await analyticsService.getLessonAnalytics(
        mockMentorId,
        mockGraphId,
        'concept-1'
      );

      expect(analytics).toBeDefined();
      expect(analytics.conceptId).toBe('concept-1');
      expect(analytics.lessonName).toBe('Lesson 1');
    });

    it('should calculate completion stats', async () => {
      const analytics = await analyticsService.getLessonAnalytics(
        mockMentorId,
        mockGraphId,
        'concept-1'
      );

      // 2 students completed concept-1 (enroll-1 and enroll-2)
      expect(analytics.completionCount).toBe(2);
    });

    it('should include assessment stats if applicable', async () => {
      const analytics = await analyticsService.getLessonAnalytics(
        mockMentorId,
        mockGraphId,
        'concept-1'
      );

      expect(analytics.hasAssessment).toBe(true);
      expect(analytics.assessmentStats).toBeDefined();
      expect(analytics.assessmentStats?.passRate).toBe(100);
    });

    it('should throw error for non-existent lesson', async () => {
      mockAccessLayer.getNode.mockResolvedValueOnce(null);

      await expect(
        analyticsService.getLessonAnalytics(mockMentorId, mockGraphId, 'non-existent')
      ).rejects.toThrow('Lesson not found');
    });
  });

  describe('getStudentAnalytics', () => {
    it('should return student analytics', async () => {
      mockEnrollmentService.findEnrollment.mockResolvedValueOnce(createMockEnrollments()[0]);

      const analytics = await analyticsService.getStudentAnalytics(
        mockMentorId,
        mockGraphId,
        'student-1'
      );

      expect(analytics).toBeDefined();
      expect(analytics.studentId).toBe('student-1');
      expect(analytics.enrollmentId).toBe('enroll-1');
    });

    it('should calculate progress correctly', async () => {
      mockEnrollmentService.findEnrollment.mockResolvedValueOnce(createMockEnrollments()[0]);

      const analytics = await analyticsService.getStudentAnalytics(
        mockMentorId,
        mockGraphId,
        'student-1'
      );

      expect(analytics.overallProgress).toBe(67);
      expect(analytics.completedLessons).toBe(2);
      expect(analytics.completedModules).toBe(1);
    });

    it('should calculate assessment stats correctly', async () => {
      mockEnrollmentService.findEnrollment.mockResolvedValueOnce(createMockEnrollments()[0]);

      const analytics = await analyticsService.getStudentAnalytics(
        mockMentorId,
        mockGraphId,
        'student-1'
      );

      expect(analytics.assessmentsCompleted).toBe(1);
      expect(analytics.assessmentsPassed).toBe(1);
      expect(analytics.averageAssessmentScore).toBe(85);
    });

    it('should identify at-risk students', async () => {
      // Student with 0% progress and old last access should be at risk
      const atRiskEnrollment = createMockEnrollments()[2];
      atRiskEnrollment.progress.lastAccessedAt = Date.now() - 35 * 24 * 60 * 60 * 1000; // 35 days ago
      mockEnrollmentService.findEnrollment.mockResolvedValueOnce(atRiskEnrollment);

      const analytics = await analyticsService.getStudentAnalytics(
        mockMentorId,
        mockGraphId,
        'student-3'
      );

      expect(analytics.atRiskOfDropping).toBe(true);
    });

    it('should throw error if student not enrolled', async () => {
      mockEnrollmentService.findEnrollment.mockResolvedValueOnce(null);

      await expect(
        analyticsService.getStudentAnalytics(mockMentorId, mockGraphId, 'non-enrolled')
      ).rejects.toThrow('Student not enrolled in this course');
    });
  });

  describe('getLanguageAnalytics', () => {
    it('should return language analytics', async () => {
      const analytics = await analyticsService.getLanguageAnalytics(mockMentorId, mockGraphId);

      expect(analytics).toBeDefined();
      expect(analytics.primaryLanguage).toBe('en');
    });

    it('should calculate language usage correctly', async () => {
      const analytics = await analyticsService.getLanguageAnalytics(mockMentorId, mockGraphId);

      expect(analytics.languageUsage.length).toBe(2); // 'en' and 'es'
      
      const englishUsage = analytics.languageUsage.find(l => l.language === 'en');
      expect(englishUsage?.studentCount).toBe(2);
      
      const spanishUsage = analytics.languageUsage.find(l => l.language === 'es');
      expect(spanishUsage?.studentCount).toBe(1);
    });

    it('should calculate bilingual mode usage', async () => {
      const analytics = await analyticsService.getLanguageAnalytics(mockMentorId, mockGraphId);

      // 1 out of 3 uses bilingual mode = 33%
      expect(analytics.bilingualModeUsage).toBe(33);
    });
  });
});
