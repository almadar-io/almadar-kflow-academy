import { Request, Response } from 'express';
import {
  enrollStudentHandler,
  unenrollStudentHandler,
  getEnrollmentHandler,
  getStudentEnrollmentsHandler,
  getCourseEnrollmentHandler,
  updateProgressHandler,
  getEnrolledCoursesWithDetailsHandler,
  trackLessonCompletionHandler,
  canAdvanceToNextHandler,
  getProgressHandler,
  getAccessibleLessonsHandler,
} from '../../controllers/enrollmentController';
import {
  enrollStudent,
  unenrollStudent,
  getEnrollment,
  getStudentEnrollments,
  getCourseEnrollment,
  updateProgress,
  getEnrolledCoursesWithDetails,
} from '../../services/enrollmentService';
import {
  trackLessonCompletion,
  canAdvanceToNext,
  getProgress,
  getAccessibleLessons,
} from '../../services/progressService';
import {
  createMockRequest,
  createMockResponse,
  createMockDecodedToken,
  setupFirebaseAdminMocks,
  resetAllMocks,
} from '../testUtils.helper';

// Mock services
jest.mock('../../services/enrollmentService', () => ({
  enrollStudent: jest.fn(),
  unenrollStudent: jest.fn(),
  getEnrollment: jest.fn(),
  getStudentEnrollments: jest.fn(),
  getCourseEnrollment: jest.fn(),
  updateProgress: jest.fn(),
  getEnrolledCoursesWithDetails: jest.fn(),
}));

jest.mock('../../services/progressService', () => ({
  trackLessonCompletion: jest.fn(),
  canAdvanceToNext: jest.fn(),
  getProgress: jest.fn(),
  getAccessibleLessons: jest.fn(),
}));

describe('Enrollment Controller - Backend', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  const mockUid = 'test-uid';
  const mockStudentId = 'student-123';
  const mockCourseId = 'course-123';
  const mockEnrollmentId = 'enrollment-123';

  beforeEach(() => {
    setupFirebaseAdminMocks();
    resetAllMocks();
    mockRequest = createMockRequest();
    mockResponse = createMockResponse();
    jest.clearAllMocks();
  });

  describe('enrollStudentHandler', () => {
    it('should enroll student successfully', async () => {
      const decodedToken = createMockDecodedToken({ uid: mockStudentId });
      const mockEnrollment = {
        id: mockEnrollmentId,
        courseId: mockCourseId,
        studentId: mockStudentId,
        enrolledAt: Date.now(),
      };
      mockRequest = createMockRequest(
        {
          params: { id: mockCourseId },
          firebaseUser: decodedToken,
        },
        decodedToken
      );

      (enrollStudent as jest.Mock).mockResolvedValue(mockEnrollment);

      await enrollStudentHandler(mockRequest as any, mockResponse as Response);

      expect(enrollStudent).toHaveBeenCalledWith(mockCourseId, mockStudentId);
      expect(mockResponse.json).toHaveBeenCalledWith({ enrollment: mockEnrollment });
    });

    it('should return 401 if user is not authenticated', async () => {
      mockRequest = createMockRequest({
        params: { id: mockCourseId },
      });

      await enrollStudentHandler(mockRequest as any, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: 'Unauthorized' });
    });

    it('should handle errors gracefully', async () => {
      const decodedToken = createMockDecodedToken({ uid: mockStudentId });
      mockRequest = createMockRequest(
        {
          params: { id: mockCourseId },
          firebaseUser: decodedToken,
        },
        decodedToken
      );

      (enrollStudent as jest.Mock).mockRejectedValue(new Error('Course not found'));

      await enrollStudentHandler(mockRequest as any, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: 'Course not found' });
    });
  });

  describe('unenrollStudentHandler', () => {
    it('should unenroll student successfully', async () => {
      const decodedToken = createMockDecodedToken({ uid: mockUid });
      mockRequest = createMockRequest(
        {
          params: { id: mockCourseId, enrollmentId: mockEnrollmentId },
          firebaseUser: decodedToken,
        },
        decodedToken
      );

      (unenrollStudent as jest.Mock).mockResolvedValue(undefined);

      await unenrollStudentHandler(mockRequest as any, mockResponse as Response);

      expect(unenrollStudent).toHaveBeenCalledWith(mockCourseId, mockEnrollmentId);
      expect(mockResponse.json).toHaveBeenCalledWith({ success: true });
    });
  });

  describe('getEnrollmentHandler', () => {
    it('should get enrollment successfully', async () => {
      const decodedToken = createMockDecodedToken({ uid: mockUid });
      const mockEnrollment = {
        id: mockEnrollmentId,
        courseId: mockCourseId,
        studentId: mockStudentId,
      };
      mockRequest = createMockRequest(
        {
          params: { id: mockCourseId, enrollmentId: mockEnrollmentId },
          firebaseUser: decodedToken,
        },
        decodedToken
      );

      (getEnrollment as jest.Mock).mockResolvedValue(mockEnrollment);

      await getEnrollmentHandler(mockRequest as any, mockResponse as Response);

      expect(getEnrollment).toHaveBeenCalledWith(mockCourseId, mockEnrollmentId);
      expect(mockResponse.json).toHaveBeenCalledWith({ enrollment: mockEnrollment });
    });

    it('should return 404 if enrollment not found', async () => {
      const decodedToken = createMockDecodedToken({ uid: mockUid });
      mockRequest = createMockRequest(
        {
          params: { id: mockCourseId, enrollmentId: mockEnrollmentId },
          firebaseUser: decodedToken,
        },
        decodedToken
      );

      (getEnrollment as jest.Mock).mockResolvedValue(null);

      await getEnrollmentHandler(mockRequest as any, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: 'Enrollment not found' });
    });
  });

  describe('getStudentEnrollmentsHandler', () => {
    it('should get student enrollments successfully', async () => {
      const decodedToken = createMockDecodedToken({ uid: mockStudentId });
      const mockEnrollments = [
        { id: 'enrollment-1', courseId: 'course-1' },
        { id: 'enrollment-2', courseId: 'course-2' },
      ];
      mockRequest = createMockRequest(
        {
          firebaseUser: decodedToken,
        },
        decodedToken
      );

      (getStudentEnrollments as jest.Mock).mockResolvedValue(mockEnrollments);

      await getStudentEnrollmentsHandler(mockRequest as Request, mockResponse as Response);

      expect(getStudentEnrollments).toHaveBeenCalledWith(mockStudentId);
      expect(mockResponse.json).toHaveBeenCalledWith({ enrollments: mockEnrollments });
    });
  });

  describe('getCourseEnrollmentHandler', () => {
    it('should get course enrollment successfully', async () => {
      const decodedToken = createMockDecodedToken({ uid: mockStudentId });
      const mockEnrollment = {
        id: mockEnrollmentId,
        courseId: mockCourseId,
        studentId: mockStudentId,
      };
      mockRequest = createMockRequest(
        {
          params: { courseId: mockCourseId },
          firebaseUser: decodedToken,
        },
        decodedToken
      );

      (getCourseEnrollment as jest.Mock).mockResolvedValue(mockEnrollment);

      await getCourseEnrollmentHandler(mockRequest as any, mockResponse as Response);

      expect(getCourseEnrollment).toHaveBeenCalledWith(mockCourseId, mockStudentId);
      expect(mockResponse.json).toHaveBeenCalledWith({ enrollment: mockEnrollment });
    });
  });

  describe('updateProgressHandler', () => {
    it('should update progress successfully', async () => {
      const decodedToken = createMockDecodedToken({ uid: mockUid });
      const mockEnrollment = {
        id: mockEnrollmentId,
        courseId: mockCourseId,
        currentLessonId: 'lesson-123',
      };
      const updatedEnrollment = {
        ...mockEnrollment,
        currentLessonId: 'lesson-123',
      };
      mockRequest = createMockRequest(
        {
          params: { id: mockEnrollmentId },
          body: { lessonId: 'lesson-123' },
          firebaseUser: decodedToken,
        },
        decodedToken
      );

      // Mock getStudentEnrollments to return the enrollment
      (getStudentEnrollments as jest.Mock).mockResolvedValue([mockEnrollment]);
      (updateProgress as jest.Mock).mockResolvedValue(updatedEnrollment);

      await updateProgressHandler(mockRequest as any, mockResponse as Response);

      expect(getStudentEnrollments).toHaveBeenCalledWith(mockUid);
      expect(updateProgress).toHaveBeenCalledWith(
        mockCourseId,
        mockEnrollmentId,
        'lesson-123'
      );
      expect(mockResponse.json).toHaveBeenCalledWith({ enrollment: updatedEnrollment });
    });
  });

  describe('getEnrolledCoursesWithDetailsHandler', () => {
    it('should get enrolled courses with details successfully', async () => {
      const decodedToken = createMockDecodedToken({ uid: mockStudentId });
      const mockCourses = [
        {
          course: { id: 'course-1', title: 'Course 1' },
          enrollment: { id: 'enrollment-1' },
        },
      ];
      mockRequest = createMockRequest(
        {
          firebaseUser: decodedToken,
        },
        decodedToken
      );

      (getEnrolledCoursesWithDetails as jest.Mock).mockResolvedValue(mockCourses);

      await getEnrolledCoursesWithDetailsHandler(mockRequest as Request, mockResponse as Response);

      expect(getEnrolledCoursesWithDetails).toHaveBeenCalledWith(mockStudentId);
      expect(mockResponse.json).toHaveBeenCalledWith({ courses: mockCourses });
    });
  });

  describe('trackLessonCompletionHandler', () => {
    it('should track lesson completion successfully', async () => {
      const decodedToken = createMockDecodedToken({ uid: mockUid });
      const mockEnrollment = {
        id: mockEnrollmentId,
        completedLessonIds: ['lesson-123'],
      };
      mockRequest = createMockRequest(
        {
          params: { id: mockEnrollmentId },
          body: { lessonId: 'lesson-123' },
          firebaseUser: decodedToken,
        },
        decodedToken
      );

      (trackLessonCompletion as jest.Mock).mockResolvedValue(mockEnrollment);

      await trackLessonCompletionHandler(mockRequest as any, mockResponse as Response);

      expect(trackLessonCompletion).toHaveBeenCalledWith(
        mockUid,
        mockEnrollmentId,
        'lesson-123'
      );
      expect(mockResponse.json).toHaveBeenCalledWith({ enrollment: mockEnrollment });
    });
  });

  describe('canAdvanceToNextHandler', () => {
    it('should check if student can advance successfully', async () => {
      const decodedToken = createMockDecodedToken({ uid: mockUid });
      const mockResult = { canAdvance: true, nextLessonId: 'lesson-456' };
      mockRequest = createMockRequest(
        {
          params: { id: mockEnrollmentId },
          query: { lessonId: 'lesson-123' },
          firebaseUser: decodedToken,
        },
        decodedToken
      );

      (canAdvanceToNext as jest.Mock).mockResolvedValue(mockResult);

      await canAdvanceToNextHandler(mockRequest as any, mockResponse as Response);

      expect(canAdvanceToNext).toHaveBeenCalledWith(
        mockUid,
        mockEnrollmentId,
        'lesson-123'
      );
      expect(mockResponse.json).toHaveBeenCalledWith(mockResult);
    });
  });

  describe('getProgressHandler', () => {
    it('should get progress successfully', async () => {
      const decodedToken = createMockDecodedToken({ uid: mockUid });
      const mockProgress = {
        enrollment: { id: mockEnrollmentId },
        totalLessons: 10,
        completedLessons: 5,
        progressPercentage: 50,
      };
      mockRequest = createMockRequest(
        {
          params: { id: mockEnrollmentId },
          firebaseUser: decodedToken,
        },
        decodedToken
      );

      (getProgress as jest.Mock).mockResolvedValue(mockProgress);

      await getProgressHandler(mockRequest as any, mockResponse as Response);

      expect(getProgress).toHaveBeenCalledWith(mockUid, mockEnrollmentId);
      expect(mockResponse.json).toHaveBeenCalledWith({ progress: mockProgress });
    });
  });

  describe('getAccessibleLessonsHandler', () => {
    it('should get accessible lessons successfully', async () => {
      const decodedToken = createMockDecodedToken({ uid: mockUid });
      const mockLessons = [
        { id: 'lesson-1', title: 'Lesson 1' },
        { id: 'lesson-2', title: 'Lesson 2' },
      ];
      mockRequest = createMockRequest(
        {
          params: { id: mockEnrollmentId },
          firebaseUser: decodedToken,
        },
        decodedToken
      );

      (getAccessibleLessons as jest.Mock).mockResolvedValue(mockLessons);

      await getAccessibleLessonsHandler(mockRequest as any, mockResponse as Response);

      expect(getAccessibleLessons).toHaveBeenCalledWith(mockUid, mockEnrollmentId);
      expect(mockResponse.json).toHaveBeenCalledWith({ lessons: mockLessons });
    });
  });
});

