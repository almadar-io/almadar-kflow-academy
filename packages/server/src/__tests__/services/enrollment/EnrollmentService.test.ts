/**
 * Unit Tests for EnrollmentService
 */

import { EnrollmentService } from '../../../services/enrollment/EnrollmentService';
import type { KnowledgeGraphAccessLayer } from '../../../services/knowledgeGraphAccess/KnowledgeGraphAccessLayer';
import type { CourseEnrollment } from '../../../types/enrollment';

// Mock Firebase Admin
jest.mock('../../../config/firebaseAdmin', () => ({
  getFirestore: jest.fn(),
}));

import { getFirestore } from '../../../config/firebaseAdmin';

describe('EnrollmentService', () => {
  let enrollmentService: EnrollmentService;
  let mockAccessLayer: jest.Mocked<KnowledgeGraphAccessLayer>;
  let mockFirestore: any;
  let mockEnrollmentsCollection: any;
  let enrollmentsStore: Map<string, Map<string, CourseEnrollment>>;

  const mockStudentId = 'student-123';
  const mockMentorId = 'mentor-456';
  const mockGraphId = 'graph-789';

  beforeEach(() => {
    jest.clearAllMocks();

    // In-memory store for enrollments: studentId -> enrollmentId -> enrollment
    enrollmentsStore = new Map();

    // Mock collection methods
    mockEnrollmentsCollection = {
      doc: jest.fn((enrollmentId: string) => ({
        set: jest.fn(async (data: CourseEnrollment) => {
          const studentEnrollments = enrollmentsStore.get(mockStudentId) || new Map();
          studentEnrollments.set(enrollmentId, data);
          enrollmentsStore.set(mockStudentId, studentEnrollments);
        }),
        get: jest.fn(async () => {
          const studentEnrollments = enrollmentsStore.get(mockStudentId);
          const enrollment = studentEnrollments?.get(enrollmentId);
          return {
            exists: !!enrollment,
            data: () => enrollment,
          };
        }),
        update: jest.fn(async (updates: Partial<CourseEnrollment>) => {
          const studentEnrollments = enrollmentsStore.get(mockStudentId);
          const enrollment = studentEnrollments?.get(enrollmentId);
          if (enrollment) {
            const updated = { ...enrollment, ...updates };
            studentEnrollments?.set(enrollmentId, updated);
          }
        }),
        delete: jest.fn(async () => {
          const studentEnrollments = enrollmentsStore.get(mockStudentId);
          studentEnrollments?.delete(enrollmentId);
        }),
      })),
      where: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      get: jest.fn(async () => {
        const studentEnrollments = enrollmentsStore.get(mockStudentId);
        const docs = studentEnrollments
          ? Array.from(studentEnrollments.values()).map(e => ({
              data: () => e,
              id: e.id,
              ref: { parent: { parent: { id: mockStudentId } } },
            }))
          : [];
        return { docs, empty: docs.length === 0 };
      }),
    };

    // Mock users collection
    const mockUsersCollection = {
      doc: jest.fn((userId: string) => ({
        collection: jest.fn((collectionName: string) => {
          if (collectionName === 'courseEnrollments') {
            return mockEnrollmentsCollection;
          }
          return {};
        }),
      })),
    };

    // Mock collectionGroup for mentor queries
    const mockCollectionGroup = jest.fn(() => ({
      where: jest.fn().mockReturnThis(),
      get: jest.fn(async () => {
        // Return all enrollments across all students
        const allDocs: any[] = [];
        for (const [studentId, studentEnrollments] of enrollmentsStore) {
          for (const [, enrollment] of studentEnrollments) {
            allDocs.push({
              data: () => enrollment,
              id: enrollment.id,
              ref: { parent: { parent: { id: studentId } } },
            });
          }
        }
        return { docs: allDocs, empty: allDocs.length === 0 };
      }),
      count: jest.fn(() => ({
        get: jest.fn(async () => {
          let count = 0;
          for (const [, studentEnrollments] of enrollmentsStore) {
            count += studentEnrollments.size;
          }
          return { data: () => ({ count }) };
        }),
      })),
    }));

    mockFirestore = {
      collection: jest.fn((name: string) => {
        if (name === 'users') {
          return mockUsersCollection;
        }
        return {};
      }),
      collectionGroup: mockCollectionGroup,
    };

    (getFirestore as jest.Mock).mockReturnValue(mockFirestore);

    // Mock KnowledgeGraphAccessLayer
    mockAccessLayer = {
      isCoursePublished: jest.fn().mockResolvedValue(true),
      getSeedConceptForPublishing: jest.fn().mockResolvedValue({
        id: 'seed-concept',
        name: 'Test Course',
        description: 'Test description',
        modules: [
          { id: 'layer-1', name: 'Module 1', description: '', layerNumber: 1, conceptCount: 2 },
          { id: 'layer-2', name: 'Module 2', description: '', layerNumber: 2, conceptCount: 1 },
        ],
      }),
      getPublishedModules: jest.fn().mockResolvedValue([
        { moduleSettingsId: 'ms-1', layerId: 'layer-1', title: 'Module 1', sequence: 1, isPublished: true, lessonCount: 2, publishedLessonCount: 2 },
        { moduleSettingsId: 'ms-2', layerId: 'layer-2', title: 'Module 2', sequence: 2, isPublished: true, lessonCount: 1, publishedLessonCount: 1 },
      ]),
      getPublishedLessons: jest.fn().mockResolvedValue([
        { lessonSettingsId: 'ls-1', conceptId: 'concept-1', title: 'Lesson 1', sequence: 1, isPublished: true },
        { lessonSettingsId: 'ls-2', conceptId: 'concept-2', title: 'Lesson 2', sequence: 2, isPublished: true },
      ]),
      getAllPublishedLessons: jest.fn().mockResolvedValue([
        { lessonSettingsId: 'ls-1', conceptId: 'concept-1', title: 'Lesson 1', sequence: 1 },
        { lessonSettingsId: 'ls-2', conceptId: 'concept-2', title: 'Lesson 2', sequence: 2 },
        { lessonSettingsId: 'ls-3', conceptId: 'concept-3', title: 'Lesson 3', sequence: 3 },
      ]),
      getLessonSettings: jest.fn().mockResolvedValue({
        conceptId: 'concept-1',
        passingScore: 70,
        hasAssessment: true,
      }),
    } as unknown as jest.Mocked<KnowledgeGraphAccessLayer>;

    enrollmentService = new EnrollmentService(mockAccessLayer);
  });

  describe('enrollStudent', () => {
    it('should enroll a student in a published course', async () => {
      const enrollment = await enrollmentService.enrollStudent(
        mockStudentId,
        mockMentorId,
        mockGraphId
      );

      expect(enrollment).toBeDefined();
      expect(enrollment.mentorId).toBe(mockMentorId);
      expect(enrollment.graphId).toBe(mockGraphId);
      expect(enrollment.status).toBe('active');
      expect(enrollment.progress.currentLayerId).toBe('layer-1');
      expect(enrollment.progress.currentConceptId).toBe('concept-1');
    });

    it('should not create duplicate enrollment', async () => {
      // First enrollment
      const first = await enrollmentService.enrollStudent(
        mockStudentId,
        mockMentorId,
        mockGraphId
      );

      // Second enrollment attempt - should return existing
      const second = await enrollmentService.enrollStudent(
        mockStudentId,
        mockMentorId,
        mockGraphId
      );

      expect(second.id).toBe(first.id);
    });

    it('should throw error if course is not published', async () => {
      mockAccessLayer.isCoursePublished.mockResolvedValue(false);

      await expect(
        enrollmentService.enrollStudent(mockStudentId, mockMentorId, mockGraphId)
      ).rejects.toThrow('Course is not published');
    });

    it('should set enrollment options', async () => {
      const enrollment = await enrollmentService.enrollStudent(
        mockStudentId,
        mockMentorId,
        mockGraphId,
        {
          enrolledVia: 'public',
          preferredLanguage: 'es',
          notificationsEnabled: false,
        }
      );

      expect(enrollment.enrolledVia).toBe('public');
      expect(enrollment.settings.preferredLanguage).toBe('es');
      expect(enrollment.settings.notificationsEnabled).toBe(false);
    });
  });

  describe('getEnrollment', () => {
    it('should return enrollment if exists', async () => {
      // First enroll
      const created = await enrollmentService.enrollStudent(
        mockStudentId,
        mockMentorId,
        mockGraphId
      );

      // Then get
      const enrollment = await enrollmentService.getEnrollment(mockStudentId, created.id);

      expect(enrollment).toBeDefined();
      expect(enrollment?.id).toBe(created.id);
    });

    it('should return null if enrollment does not exist', async () => {
      const enrollment = await enrollmentService.getEnrollment(mockStudentId, 'non-existent');
      expect(enrollment).toBeNull();
    });
  });

  describe('unenrollStudent', () => {
    it('should delete enrollment', async () => {
      // First enroll
      const enrollment = await enrollmentService.enrollStudent(
        mockStudentId,
        mockMentorId,
        mockGraphId
      );

      // Then unenroll
      await enrollmentService.unenrollStudent(mockStudentId, enrollment.id);

      // Verify deleted
      const found = await enrollmentService.getEnrollment(mockStudentId, enrollment.id);
      expect(found).toBeNull();
    });
  });

  describe('updateProgress', () => {
    it('should update current position', async () => {
      const enrollment = await enrollmentService.enrollStudent(
        mockStudentId,
        mockMentorId,
        mockGraphId
      );

      const updated = await enrollmentService.updateProgress(mockStudentId, enrollment.id, {
        currentLayerId: 'layer-2',
        currentConceptId: 'concept-3',
      });

      expect(updated.progress.currentLayerId).toBe('layer-2');
      expect(updated.progress.currentConceptId).toBe('concept-3');
    });

    it('should track completed concepts', async () => {
      const enrollment = await enrollmentService.enrollStudent(
        mockStudentId,
        mockMentorId,
        mockGraphId
      );

      const updated = await enrollmentService.updateProgress(mockStudentId, enrollment.id, {
        completedConceptId: 'concept-1',
      });

      expect(updated.progress.completedConcepts).toContain('concept-1');
    });

    it('should update overall progress', async () => {
      const enrollment = await enrollmentService.enrollStudent(
        mockStudentId,
        mockMentorId,
        mockGraphId
      );

      // Complete 1 of 3 lessons
      const updated = await enrollmentService.updateProgress(mockStudentId, enrollment.id, {
        completedConceptId: 'concept-1',
      });

      expect(updated.progress.overallProgress).toBe(33); // 1/3 = 33%
    });

    it('should track time spent', async () => {
      const enrollment = await enrollmentService.enrollStudent(
        mockStudentId,
        mockMentorId,
        mockGraphId
      );

      const updated = await enrollmentService.updateProgress(mockStudentId, enrollment.id, {
        timeSpent: 15,
      });

      expect(updated.progress.totalTimeSpent).toBe(15);
    });
  });

  describe('recordAssessmentAttempt', () => {
    it('should record assessment result', async () => {
      const enrollment = await enrollmentService.enrollStudent(
        mockStudentId,
        mockMentorId,
        mockGraphId
      );

      const updated = await enrollmentService.recordAssessmentAttempt(
        mockStudentId,
        enrollment.id,
        {
          assessmentId: 'assessment-1',
          conceptId: 'concept-1',
          score: 80,
          maxScore: 100,
        }
      );

      const result = updated.progress.assessmentResults['concept-1'];
      expect(result).toBeDefined();
      expect(result.score).toBe(80);
      expect(result.percentage).toBe(80);
      expect(result.passed).toBe(true); // 80 >= 70 (passing score)
      expect(result.attempts).toBe(1);
    });

    it('should track multiple attempts', async () => {
      const enrollment = await enrollmentService.enrollStudent(
        mockStudentId,
        mockMentorId,
        mockGraphId
      );

      // First attempt (failing)
      await enrollmentService.recordAssessmentAttempt(mockStudentId, enrollment.id, {
        assessmentId: 'assessment-1',
        conceptId: 'concept-1',
        score: 50,
        maxScore: 100,
      });

      // Second attempt (passing)
      const updated = await enrollmentService.recordAssessmentAttempt(
        mockStudentId,
        enrollment.id,
        {
          assessmentId: 'assessment-1',
          conceptId: 'concept-1',
          score: 85,
          maxScore: 100,
        }
      );

      const result = updated.progress.assessmentResults['concept-1'];
      expect(result.attempts).toBe(2);
      expect(result.bestScore).toBe(85);
      expect(result.passed).toBe(true);
    });
  });

  describe('getStudentEnrollments', () => {
    it('should return student enrollments', async () => {
      // Enroll in a course
      const enrollment = await enrollmentService.enrollStudent(
        mockStudentId,
        mockMentorId,
        mockGraphId
      );

      const enrollments = await enrollmentService.getStudentEnrollments(mockStudentId);

      expect(enrollments.length).toBeGreaterThanOrEqual(1);
      expect(enrollments.find(e => e.id === enrollment.id)).toBeDefined();
    });

    it('should return empty array if no enrollments', async () => {
      // Clear the store
      enrollmentsStore.clear();

      const enrollments = await enrollmentService.getStudentEnrollments(mockStudentId);

      expect(enrollments).toEqual([]);
    });
  });

  describe('getCourseStudents', () => {
    it('should return enrolled students for a course', async () => {
      // Enroll student
      await enrollmentService.enrollStudent(mockStudentId, mockMentorId, mockGraphId);

      const students = await enrollmentService.getCourseStudents(mockMentorId, mockGraphId);

      expect(students.length).toBe(1);
      expect(students[0].studentId).toBe(mockStudentId);
      expect(students[0].totalLessons).toBe(3);
    });

    it('should calculate progress correctly', async () => {
      const enrollment = await enrollmentService.enrollStudent(
        mockStudentId,
        mockMentorId,
        mockGraphId
      );

      // Complete some lessons
      await enrollmentService.updateProgress(mockStudentId, enrollment.id, {
        completedConceptId: 'concept-1',
      });
      await enrollmentService.updateProgress(mockStudentId, enrollment.id, {
        completedConceptId: 'concept-2',
      });

      const students = await enrollmentService.getCourseStudents(mockMentorId, mockGraphId);

      expect(students[0].completedLessons).toBe(2);
      expect(students[0].overallProgress).toBe(67); // 2/3 = 67%
    });
  });

  describe('updateEnrollmentStatus', () => {
    it('should update enrollment status', async () => {
      const enrollment = await enrollmentService.enrollStudent(
        mockStudentId,
        mockMentorId,
        mockGraphId
      );

      const updated = await enrollmentService.updateEnrollmentStatus(
        mockStudentId,
        enrollment.id,
        'paused'
      );

      expect(updated.status).toBe('paused');
    });
  });

  describe('updateEnrollmentSettings', () => {
    it('should update enrollment settings', async () => {
      const enrollment = await enrollmentService.enrollStudent(
        mockStudentId,
        mockMentorId,
        mockGraphId
      );

      const updated = await enrollmentService.updateEnrollmentSettings(
        mockStudentId,
        enrollment.id,
        {
          preferredLanguage: 'fr',
          showBilingualMode: true,
        }
      );

      expect(updated.settings.preferredLanguage).toBe('fr');
      expect(updated.settings.showBilingualMode).toBe(true);
    });
  });

  describe('getCourseEnrollmentCount', () => {
    it('should return correct enrollment count', async () => {
      await enrollmentService.enrollStudent(mockStudentId, mockMentorId, mockGraphId);

      const count = await enrollmentService.getCourseEnrollmentCount(mockMentorId, mockGraphId);

      expect(count).toBe(1);
    });
  });
});
