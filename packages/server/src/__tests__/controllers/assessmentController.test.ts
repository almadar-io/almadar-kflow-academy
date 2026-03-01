import { Request, Response } from 'express';
import {
  createAssessmentHandler,
  updateAssessmentHandler,
  getAssessmentHandler,
  getAssessmentByLessonHandler,
  deleteAssessmentHandler,
  submitAssessmentHandler,
  getAssessmentSubmissionHandler,
  getAssessmentSubmissionsHandler,
  evaluateAnswerHandler,
} from '../../controllers/assessmentController';
import {
  createAssessment,
  updateAssessment,
  getAssessment,
  getAssessmentByLessonId,
  deleteAssessment,
  submitAssessment,
  getAssessmentSubmission,
  getAssessmentSubmissions,
  evaluateSingleAnswer,
} from '../../services/assessmentService';
import { upsertUser } from '../../services/userService';
import {
  createMockRequest,
  createMockResponse,
  createMockDecodedToken,
  setupFirebaseAdminMocks,
  resetAllMocks,
} from '../testUtils.helper';

// Mock services
jest.mock('../../services/assessmentService', () => ({
  createAssessment: jest.fn(),
  updateAssessment: jest.fn(),
  getAssessment: jest.fn(),
  getAssessmentByLessonId: jest.fn(),
  getAssessmentByLessonIdForStudent: jest.fn(),
  deleteAssessment: jest.fn(),
  submitAssessment: jest.fn(),
  getAssessmentSubmission: jest.fn(),
  getAssessmentSubmissions: jest.fn(),
  evaluateSingleAnswer: jest.fn(),
}));

jest.mock('../../services/userService', () => ({
  upsertUser: jest.fn(),
}));

describe('Assessment Controller - Backend', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  const mockUid = 'test-uid';
  const mockEmail = 'test@example.com';
  const mockCourseId = 'course-123';
  const mockModuleId = 'module-123';
  const mockLessonId = 'lesson-123';
  const mockAssessmentId = 'assessment-123';

  beforeEach(() => {
    setupFirebaseAdminMocks();
    resetAllMocks();
    mockRequest = createMockRequest();
    mockResponse = createMockResponse();
    jest.clearAllMocks();
  });

  describe('createAssessmentHandler', () => {
    it('should create assessment successfully', async () => {
      const decodedToken = createMockDecodedToken({ uid: mockUid, email: mockEmail });
      const mockAssessment = {
        id: mockAssessmentId,
        courseId: mockCourseId,
        moduleId: mockModuleId,
        lessonId: mockLessonId,
        title: 'Test Assessment',
        questions: [],
      };
      mockRequest = createMockRequest(
        {
          params: { courseId: mockCourseId, moduleId: mockModuleId, id: mockLessonId },
          body: {
            title: 'Test Assessment',
            description: 'Test description',
            passingScore: 70,
          },
          firebaseUser: decodedToken,
        },
        decodedToken
      );

      (createAssessment as jest.Mock).mockResolvedValue(mockAssessment);
      (upsertUser as jest.Mock).mockResolvedValue(undefined);

      await createAssessmentHandler(mockRequest as any, mockResponse as Response);

      expect(upsertUser).toHaveBeenCalledWith(mockUid, mockEmail);
      expect(createAssessment).toHaveBeenCalledWith(
        mockCourseId,
        mockModuleId,
        mockLessonId,
        expect.objectContaining({
          title: 'Test Assessment',
          description: 'Test description',
          passingScore: 70,
        })
      );
      expect(mockResponse.json).toHaveBeenCalledWith({ assessment: mockAssessment });
    });

    it('should return 401 if user is not authenticated', async () => {
      mockRequest = createMockRequest({
        params: { courseId: mockCourseId, moduleId: mockModuleId, id: mockLessonId },
        body: { title: 'Test Assessment' },
      });

      await createAssessmentHandler(mockRequest as any, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: 'Unauthorized' });
    });

    it('should return 400 if title is missing', async () => {
      const decodedToken = createMockDecodedToken({ uid: mockUid });
      mockRequest = createMockRequest(
        {
          params: { courseId: mockCourseId, moduleId: mockModuleId, id: mockLessonId },
          body: {},
          firebaseUser: decodedToken,
        },
        decodedToken
      );

      await createAssessmentHandler(mockRequest as any, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: 'title is required' });
    });
  });

  describe('updateAssessmentHandler', () => {
    it('should update assessment successfully', async () => {
      const decodedToken = createMockDecodedToken({ uid: mockUid });
      const updatedAssessment = {
        id: mockAssessmentId,
        title: 'Updated Assessment',
      };
      mockRequest = createMockRequest(
        {
          params: {
            courseId: mockCourseId,
            moduleId: mockModuleId,
            id: mockLessonId,
            assessmentId: mockAssessmentId,
          },
          body: { title: 'Updated Assessment' },
          firebaseUser: decodedToken,
        },
        decodedToken
      );

      (updateAssessment as jest.Mock).mockResolvedValue(updatedAssessment);

      await updateAssessmentHandler(mockRequest as any, mockResponse as Response);

      expect(updateAssessment).toHaveBeenCalledWith(
        mockCourseId,
        mockAssessmentId,
        { title: 'Updated Assessment' }
      );
      expect(mockResponse.json).toHaveBeenCalledWith({ assessment: updatedAssessment });
    });
  });

  describe('getAssessmentHandler', () => {
    it('should get assessment successfully', async () => {
      const decodedToken = createMockDecodedToken({ uid: mockUid });
      const mockAssessment = {
        id: mockAssessmentId,
        courseId: mockCourseId,
        title: 'Test Assessment',
      };
      mockRequest = createMockRequest(
        {
          params: { courseId: mockCourseId, id: mockAssessmentId },
          firebaseUser: decodedToken,
        },
        decodedToken
      );

      (getAssessment as jest.Mock).mockResolvedValue(mockAssessment);

      await getAssessmentHandler(mockRequest as any, mockResponse as Response);

      expect(getAssessment).toHaveBeenCalledWith(mockCourseId, mockAssessmentId);
      expect(mockResponse.json).toHaveBeenCalledWith({ assessment: mockAssessment });
    });

    it('should return 404 if assessment not found', async () => {
      const decodedToken = createMockDecodedToken({ uid: mockUid });
      mockRequest = createMockRequest(
        {
          params: { courseId: mockCourseId, id: mockAssessmentId },
          firebaseUser: decodedToken,
        },
        decodedToken
      );

      (getAssessment as jest.Mock).mockResolvedValue(null);

      await getAssessmentHandler(mockRequest as any, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: 'Assessment not found' });
    });
  });

  describe('getAssessmentByLessonHandler', () => {
    it('should get assessment by lesson successfully', async () => {
      const decodedToken = createMockDecodedToken({ uid: mockUid });
      const mockAssessment = {
        id: mockAssessmentId,
        lessonId: mockLessonId,
      };
      mockRequest = createMockRequest(
        {
          params: { courseId: mockCourseId, moduleId: mockModuleId, id: mockLessonId },
          firebaseUser: decodedToken,
        },
        decodedToken
      );

      (getAssessmentByLessonId as jest.Mock).mockResolvedValue(mockAssessment);

      await getAssessmentByLessonHandler(mockRequest as any, mockResponse as Response);

      expect(getAssessmentByLessonId).toHaveBeenCalledWith(mockCourseId, mockLessonId);
      expect(mockResponse.json).toHaveBeenCalledWith({ assessment: mockAssessment });
    });
  });

  describe('deleteAssessmentHandler', () => {
    it('should delete assessment successfully', async () => {
      const decodedToken = createMockDecodedToken({ uid: mockUid });
      mockRequest = createMockRequest(
        {
          params: { courseId: mockCourseId, id: mockAssessmentId },
          firebaseUser: decodedToken,
        },
        decodedToken
      );

      (deleteAssessment as jest.Mock).mockResolvedValue(undefined);

      await deleteAssessmentHandler(mockRequest as any, mockResponse as Response);

      expect(deleteAssessment).toHaveBeenCalledWith(mockCourseId, mockAssessmentId);
      expect(mockResponse.json).toHaveBeenCalledWith({ success: true });
    });
  });

  describe('submitAssessmentHandler', () => {
    it('should submit assessment successfully', async () => {
      const decodedToken = createMockDecodedToken({ uid: mockUid });
      const mockSubmission = {
        id: 'submission-123',
        assessmentId: mockAssessmentId,
        studentId: mockUid,
        score: 85,
      };
      mockRequest = createMockRequest(
        {
          body: {
            courseId: mockCourseId,
            assessmentId: mockAssessmentId,
            enrollmentId: 'enrollment-123',
            lessonId: mockLessonId,
            answers: [{ questionId: 'q1', answer: 'Answer 1' }],
          },
          firebaseUser: decodedToken,
        },
        decodedToken
      );

      (submitAssessment as jest.Mock).mockResolvedValue(mockSubmission);

      await submitAssessmentHandler(mockRequest as any, mockResponse as Response);

      expect(submitAssessment).toHaveBeenCalledWith(
        mockCourseId,
        mockAssessmentId,
        mockUid,
        'enrollment-123',
        mockLessonId,
        [{ questionId: 'q1', answer: 'Answer 1' }]
      );
      expect(mockResponse.json).toHaveBeenCalledWith({ submission: mockSubmission });
    });

    it('should return 400 if required fields are missing', async () => {
      const decodedToken = createMockDecodedToken({ uid: mockUid });
      mockRequest = createMockRequest(
        {
          body: {
            courseId: mockCourseId,
            // Missing other required fields
          },
          firebaseUser: decodedToken,
        },
        decodedToken
      );

      await submitAssessmentHandler(mockRequest as any, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: 'Missing required fields' });
    });
  });

  describe('getAssessmentSubmissionHandler', () => {
    it('should get assessment submission successfully', async () => {
      const decodedToken = createMockDecodedToken({ uid: mockUid });
      const mockSubmission = {
        id: 'submission-123',
        assessmentId: mockAssessmentId,
        studentId: mockUid,
      };
      mockRequest = createMockRequest(
        {
          params: {
            courseId: mockCourseId,
            assessmentId: mockAssessmentId,
            id: 'submission-123',
          },
          firebaseUser: decodedToken,
        },
        decodedToken
      );

      (getAssessmentSubmission as jest.Mock).mockResolvedValue(mockSubmission);

      await getAssessmentSubmissionHandler(mockRequest as any, mockResponse as Response);

      expect(getAssessmentSubmission).toHaveBeenCalledWith(
        mockCourseId,
        mockAssessmentId,
        'submission-123'
      );
      expect(mockResponse.json).toHaveBeenCalledWith({ submission: mockSubmission });
    });

    it('should return 404 if submission not found', async () => {
      const decodedToken = createMockDecodedToken({ uid: mockUid });
      mockRequest = createMockRequest(
        {
          params: {
            courseId: mockCourseId,
            assessmentId: mockAssessmentId,
            id: 'submission-123',
          },
          firebaseUser: decodedToken,
        },
        decodedToken
      );

      (getAssessmentSubmission as jest.Mock).mockResolvedValue(null);

      await getAssessmentSubmissionHandler(mockRequest as any, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: 'Submission not found' });
    });
  });

  describe('getAssessmentSubmissionsHandler', () => {
    it('should get assessment submissions successfully', async () => {
      const decodedToken = createMockDecodedToken({ uid: mockUid });
      const mockSubmissions = [
        { id: 'submission-1', studentId: 'student-1' },
        { id: 'submission-2', studentId: 'student-2' },
      ];
      mockRequest = createMockRequest(
        {
          params: { courseId: mockCourseId, id: mockAssessmentId },
          query: {},
          firebaseUser: decodedToken,
        },
        decodedToken
      );

      (getAssessmentSubmissions as jest.Mock).mockResolvedValue(mockSubmissions);

      await getAssessmentSubmissionsHandler(mockRequest as any, mockResponse as Response);

      expect(getAssessmentSubmissions).toHaveBeenCalledWith(
        mockCourseId,
        mockAssessmentId,
        undefined,
        undefined
      );
      expect(mockResponse.json).toHaveBeenCalledWith({ submissions: mockSubmissions });
    });

    it('should filter by studentId and enrollmentId when provided', async () => {
      const decodedToken = createMockDecodedToken({ uid: mockUid });
      mockRequest = createMockRequest(
        {
          params: { courseId: mockCourseId, id: mockAssessmentId },
          query: { studentId: 'student-123', enrollmentId: 'enrollment-123' },
          firebaseUser: decodedToken,
        },
        decodedToken
      );

      (getAssessmentSubmissions as jest.Mock).mockResolvedValue([]);

      await getAssessmentSubmissionsHandler(mockRequest as any, mockResponse as Response);

      expect(getAssessmentSubmissions).toHaveBeenCalledWith(
        mockCourseId,
        mockAssessmentId,
        'student-123',
        'enrollment-123'
      );
    });
  });

  describe('evaluateAnswerHandler', () => {
    it('should evaluate answer successfully', async () => {
      const decodedToken = createMockDecodedToken({ uid: mockUid });
      const mockEvaluation = {
        score: 8,
        percentage: 80,
        feedback: 'Good answer',
        isCorrect: true,
        strengths: ['Clear explanation'],
        weaknesses: [],
      };
      mockRequest = createMockRequest(
        {
          body: {
            courseId: mockCourseId,
            moduleId: mockModuleId,
            lessonId: mockLessonId,
            question: 'What is React?',
            studentAnswer: 'A JavaScript library',
            correctAnswer: 'A JavaScript library for building user interfaces',
            maxPoints: 10,
          },
          firebaseUser: decodedToken,
        },
        decodedToken
      );

      (evaluateSingleAnswer as jest.Mock).mockResolvedValue(mockEvaluation);

      await evaluateAnswerHandler(mockRequest as any, mockResponse as Response);

      expect(evaluateSingleAnswer).toHaveBeenCalledWith(
        mockCourseId,
        mockModuleId,
        mockLessonId,
        'What is React?',
        'A JavaScript library',
        'A JavaScript library for building user interfaces',
        10
      );
      expect(mockResponse.json).toHaveBeenCalledWith({ evaluation: mockEvaluation });
    });

    it('should return 400 if required fields are missing', async () => {
      const decodedToken = createMockDecodedToken({ uid: mockUid });
      mockRequest = createMockRequest(
        {
          body: {
            courseId: mockCourseId,
            // Missing other required fields
          },
          firebaseUser: decodedToken,
        },
        decodedToken
      );

      await evaluateAnswerHandler(mockRequest as any, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: 'Missing required fields' });
    });

    it('should return 400 if maxPoints is invalid', async () => {
      const decodedToken = createMockDecodedToken({ uid: mockUid });
      mockRequest = createMockRequest(
        {
          body: {
            courseId: mockCourseId,
            moduleId: mockModuleId,
            lessonId: mockLessonId,
            question: 'What is React?',
            studentAnswer: 'A JavaScript library',
            maxPoints: 0,
          },
          firebaseUser: decodedToken,
        },
        decodedToken
      );

      await evaluateAnswerHandler(mockRequest as any, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'maxPoints must be greater than 0',
      });
    });
  });
});

