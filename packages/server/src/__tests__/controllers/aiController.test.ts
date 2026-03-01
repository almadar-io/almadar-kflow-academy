import { Request, Response } from 'express';
import {
  explainConcept,
  progressiveExpandMultipleFromTextHandler,
  generateLayerPracticeHandler,
  answerQuestionHandler,
} from '../../controllers/aiController';
import {
  setupFirebaseAdminMocks,
  createMockDecodedToken,
  createMockRequest,
  createMockResponse,
  resetAllMocks,
} from '../testUtils.helper';
import { Concept } from '../../types/concept';
import { StoredConceptGraph } from '../../services/graphService';

// Mock Firebase Admin
jest.mock('../../config/firebaseAdmin', () => ({
  getFirebaseAuth: jest.fn(),
  getFirebaseAdmin: jest.fn(),
  getFirestore: jest.fn(),
}));

// Mock services
jest.mock('../../services/graphService', () => ({
  getUserGraphById: jest.fn(),
}));

jest.mock('../../services/userService', () => ({
  upsertUser: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../../services/layerService', () => ({
  saveLayer: jest.fn(),
  getLayerByNumber: jest.fn(),
}));

// Mock operations
jest.mock('../../operations', () => ({
  explain: jest.fn(),
  progressiveExpandMultipleFromText: jest.fn(),
  generateLayerPractice: jest.fn(),
  answerQuestion: jest.fn(),
}));

// Mock utilities
jest.mock('../../utils/streamHandler', () => ({
  handleStreamResponse: jest.fn(),
}));

jest.mock('../../utils/prerequisites', () => ({
  processPrerequisitesFromLesson: jest.fn(),
}));

jest.mock('../../utils/progressiveExpandProcessor', () => ({
  processProgressiveExpandContent: jest.fn(),
}));

import { getUserGraphById } from '../../services/graphService';
import { saveLayer, getLayerByNumber } from '../../services/layerService';
import { explain, progressiveExpandMultipleFromText, generateLayerPractice, answerQuestion } from '../../operations';
import { handleStreamResponse } from '../../utils/streamHandler';
import { processPrerequisitesFromLesson } from '../../utils/prerequisites';
import { processProgressiveExpandContent } from '../../utils/progressiveExpandProcessor';

describe('AI Controller Handlers - Backend', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;

  const mockConcept: Concept = {
    id: 'concept-1',
    name: 'React Components',
    description: 'Building blocks of React applications',
    layer: 0,
    parents: [],
    children: [],
  };

  const mockSeedConcept: Concept = {
    id: 'seed-1',
    name: 'React',
    description: 'A JavaScript library for building user interfaces',
    layer: 0,
    parents: [],
    children: [],
  };

  const mockGraph: StoredConceptGraph = {
    id: 'graph-1',
    seedConceptId: 'seed-1',
    concepts: {
      'React': mockSeedConcept,
      'React Components': mockConcept,
    },
    difficulty: 'intermediate',
    focus: 'web development',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    goalFocused: false,
  };

  beforeEach(() => {
    setupFirebaseAdminMocks();
    resetAllMocks();
    mockRequest = createMockRequest();
    mockResponse = createMockResponse();
    jest.clearAllMocks();
  });

  describe('explainConcept', () => {
    it('should return 400 when concept is missing', async () => {
      mockRequest.body = {};

      await explainConcept(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: 'Concept is required' });
    });

    it('should return 400 when concept name is missing', async () => {
      mockRequest.body = {
        concept: { id: 'concept-1' },
      };

      await explainConcept(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: 'Concept is required' });
    });

    it('should return 401 when graphId is provided but user is not authenticated', async () => {
      mockRequest.body = {
        concept: mockConcept,
        graphId: 'graph-1',
      };
      mockRequest.firebaseUser = undefined;

      await explainConcept(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: 'Unauthorized' });
    });

    it('should return 404 when graph is not found', async () => {
      const uid = 'test-uid';
      const decodedToken = createMockDecodedToken({ uid, email: 'test@example.com' });
      mockRequest = createMockRequest({ firebaseUser: decodedToken }, decodedToken);
      mockRequest.body = {
        concept: mockConcept,
        graphId: 'non-existent',
      };

      (getUserGraphById as jest.Mock).mockResolvedValue(null);

      await explainConcept(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: 'Graph not found' });
    });

    it('should handle streaming response', async () => {
      const uid = 'test-uid';
      const decodedToken = createMockDecodedToken({ uid, email: 'test@example.com' });
      mockRequest = createMockRequest({ firebaseUser: decodedToken }, decodedToken);
      mockRequest.body = {
        concept: mockConcept,
        simple: false,
      };

      const mockStream = (async function* () {
        yield { choices: [{ delta: { content: 'Lesson content' } }] };
      })();

      (explain as jest.Mock).mockResolvedValue({
        stream: mockStream,
        model: 'deepseek-chat',
      });

      (processPrerequisitesFromLesson as jest.Mock).mockReturnValue([]);
      (handleStreamResponse as jest.Mock).mockResolvedValue('');

      await explainConcept(mockRequest as Request, mockResponse as Response);

      expect(explain).toHaveBeenCalled();
      expect(handleStreamResponse).toHaveBeenCalled();
    });

    it('should handle non-streaming response (fallback)', async () => {
      const uid = 'test-uid';
      const decodedToken = createMockDecodedToken({ uid, email: 'test@example.com' });
      mockRequest = createMockRequest({ firebaseUser: decodedToken }, decodedToken);
      mockRequest.body = {
        concept: mockConcept,
      };

      // The handler always calls explain with stream: true, but if it returns without stream property,
      // it falls back to non-streaming. The handler does: res.json({ concepts: result })
      // So result can be an array or any value
      (explain as jest.Mock).mockResolvedValue([mockConcept] as any);

      await explainConcept(mockRequest as Request, mockResponse as Response);

      expect(explain).toHaveBeenCalled();
      expect(mockResponse.json).toHaveBeenCalledWith({ concepts: [mockConcept] });
    });

    it('should resolve concept from graph when graphId is provided', async () => {
      const uid = 'test-uid';
      const decodedToken = createMockDecodedToken({ uid, email: 'test@example.com' });
      mockRequest = createMockRequest({ firebaseUser: decodedToken }, decodedToken);
      mockRequest.body = {
        concept: { name: 'React Components' },
        graphId: 'graph-1',
      };

      (getUserGraphById as jest.Mock).mockResolvedValue(mockGraph);
      const mockStream = (async function* () {
        yield { choices: [{ delta: { content: 'Lesson content' } }] };
      })();
      (explain as jest.Mock).mockResolvedValue({
        stream: mockStream,
        model: 'deepseek-chat',
      });
      (processPrerequisitesFromLesson as jest.Mock).mockReturnValue([]);
      (handleStreamResponse as jest.Mock).mockResolvedValue('');

      await explainConcept(mockRequest as Request, mockResponse as Response);

      expect(getUserGraphById).toHaveBeenCalledWith(uid, 'graph-1');
      expect(explain).toHaveBeenCalledWith(
        mockConcept,
        mockSeedConcept,
        expect.objectContaining({
          graph: expect.any(Object),
        })
      );
    });

    it('should handle errors and return 500', async () => {
      mockRequest.body = {
        concept: mockConcept,
      };

      (explain as jest.Mock).mockRejectedValue(new Error('LLM error'));

      await explainConcept(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Failed to generate lesson',
        details: 'LLM error',
      });
    });
  });

  describe('progressiveExpandMultipleFromTextHandler', () => {
    it('should return 400 when concept is missing', async () => {
      mockRequest.body = {
        previousLayers: [],
      };

      await progressiveExpandMultipleFromTextHandler(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: 'Concept is required' });
    });

    it('should return 400 when previousLayers is not an array', async () => {
      mockRequest.body = {
        concept: mockConcept,
        previousLayers: 'not-an-array',
      };

      await progressiveExpandMultipleFromTextHandler(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: 'Previous layers must be an array' });
    });

    it('should return 401 when graphId is provided but user is not authenticated', async () => {
      mockRequest.body = {
        concept: mockConcept,
        previousLayers: [],
        graphId: 'graph-1',
      };
      mockRequest.firebaseUser = undefined;

      await progressiveExpandMultipleFromTextHandler(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: 'Unauthorized' });
    });

    it('should return 404 when graph is not found', async () => {
      const uid = 'test-uid';
      const decodedToken = createMockDecodedToken({ uid, email: 'test@example.com' });
      mockRequest = createMockRequest({ firebaseUser: decodedToken }, decodedToken);
      mockRequest.body = {
        concept: mockConcept,
        previousLayers: [],
        graphId: 'non-existent',
      };

      (getUserGraphById as jest.Mock).mockResolvedValue(null);

      await progressiveExpandMultipleFromTextHandler(mockRequest as Request, mockResponse as Response);

      expect(getUserGraphById).toHaveBeenCalledWith(uid, 'non-existent');
      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: 'Graph not found' });
    });

    it('should handle streaming response', async () => {
      const uid = 'test-uid';
      const decodedToken = createMockDecodedToken({ uid, email: 'test@example.com' });
      mockRequest = createMockRequest({ firebaseUser: decodedToken }, decodedToken);
      mockRequest.body = {
        concept: mockConcept,
        previousLayers: [],
        numConcepts: 5,
      };

      const mockStream = (async function* () {
        yield { content: 'Generated content' };
      })();

      (progressiveExpandMultipleFromText as jest.Mock).mockResolvedValue({
        stream: mockStream,
        model: 'deepseek-chat',
      });

      (processProgressiveExpandContent as jest.Mock).mockReturnValue({
        concepts: [mockConcept],
        goal: 'Learn React',
      });
      (handleStreamResponse as jest.Mock).mockResolvedValue('');

      await progressiveExpandMultipleFromTextHandler(mockRequest as Request, mockResponse as Response);

      expect(progressiveExpandMultipleFromText).toHaveBeenCalled();
      expect(handleStreamResponse).toHaveBeenCalled();
    });

    it('should handle non-streaming response', async () => {
      const uid = 'test-uid';
      const decodedToken = createMockDecodedToken({ uid, email: 'test@example.com' });
      mockRequest = createMockRequest({ firebaseUser: decodedToken }, decodedToken);
      mockRequest.body = {
        concept: mockConcept,
        previousLayers: [],
      };

      const result = {
        concepts: [{ ...mockConcept, layer: 1 }],
        goal: 'Learn React',
        model: 'deepseek-chat',
        prompt: 'Test prompt',
        response: 'Test response',
      };

      // Return non-streaming result (no stream property)
      (progressiveExpandMultipleFromText as jest.Mock).mockResolvedValue(result);

      await progressiveExpandMultipleFromTextHandler(mockRequest as Request, mockResponse as Response);

      expect(progressiveExpandMultipleFromText).toHaveBeenCalled();
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          concepts: result.concepts,
          model: result.model,
        })
      );
    });

    it('should fetch previous layer goal when graphId is provided', async () => {
      const uid = 'test-uid';
      const decodedToken = createMockDecodedToken({ uid, email: 'test@example.com' });
      mockRequest = createMockRequest({ firebaseUser: decodedToken }, decodedToken);
      mockRequest.body = {
        concept: mockConcept,
        previousLayers: [{ ...mockConcept, layer: 0 }],
        graphId: 'graph-1',
      };

      (getUserGraphById as jest.Mock).mockResolvedValue(mockGraph);
      (getLayerByNumber as jest.Mock).mockResolvedValue({
        layerNumber: 0,
        goal: 'Previous goal',
      });

      const mockStream = (async function* () {
        yield { content: 'Generated content' };
      })();

      (progressiveExpandMultipleFromText as jest.Mock).mockResolvedValue({
        stream: mockStream,
        model: 'deepseek-chat',
      });

      (processProgressiveExpandContent as jest.Mock).mockReturnValue({
        concepts: [mockConcept],
        goal: 'Learn React',
      });
      (handleStreamResponse as jest.Mock).mockResolvedValue('');

      await progressiveExpandMultipleFromTextHandler(mockRequest as Request, mockResponse as Response);

      expect(getLayerByNumber).toHaveBeenCalledWith(uid, 'graph-1', 0);
      expect(progressiveExpandMultipleFromText).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        expect.anything(),
        expect.objectContaining({
          previousLayerGoal: 'Previous goal',
        })
      );
    });

    it('should handle errors and return 500', async () => {
      mockRequest.body = {
        concept: mockConcept,
        previousLayers: [],
      };

      (progressiveExpandMultipleFromText as jest.Mock).mockRejectedValue(new Error('LLM error'));

      await progressiveExpandMultipleFromTextHandler(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Failed to generate layer from text',
        details: 'LLM error',
      });
    });
  });

  describe('generateLayerPracticeHandler', () => {
    it('should return 401 when user is not authenticated', async () => {
      mockRequest.firebaseUser = undefined;
      mockRequest.body = {
        concepts: [mockConcept],
        layerGoal: 'Learn React',
        layerNumber: 1,
      };

      await generateLayerPracticeHandler(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: 'Unauthorized' });
    });

    it('should return 400 when concepts array is missing', async () => {
      const uid = 'test-uid';
      const decodedToken = createMockDecodedToken({ uid, email: 'test@example.com' });
      mockRequest = createMockRequest({ firebaseUser: decodedToken }, decodedToken);
      mockRequest.body = {
        layerGoal: 'Learn React',
        layerNumber: 1,
      };

      await generateLayerPracticeHandler(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'concepts array is required and must not be empty',
      });
    });

    it('should return 400 when concepts array is empty', async () => {
      const uid = 'test-uid';
      const decodedToken = createMockDecodedToken({ uid, email: 'test@example.com' });
      mockRequest = createMockRequest({ firebaseUser: decodedToken }, decodedToken);
      mockRequest.body = {
        concepts: [],
        layerGoal: 'Learn React',
        layerNumber: 1,
      };

      await generateLayerPracticeHandler(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'concepts array is required and must not be empty',
      });
    });

    it('should return 400 when layerGoal is missing', async () => {
      const uid = 'test-uid';
      const decodedToken = createMockDecodedToken({ uid, email: 'test@example.com' });
      mockRequest = createMockRequest({ firebaseUser: decodedToken }, decodedToken);
      mockRequest.body = {
        concepts: [mockConcept],
        layerNumber: 1,
      };

      await generateLayerPracticeHandler(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'layerGoal is required and must be a string',
      });
    });

    it('should return 400 when layerNumber is invalid', async () => {
      const uid = 'test-uid';
      const decodedToken = createMockDecodedToken({ uid, email: 'test@example.com' });
      mockRequest = createMockRequest({ firebaseUser: decodedToken }, decodedToken);
      mockRequest.body = {
        concepts: [mockConcept],
        layerGoal: 'Learn React',
        layerNumber: -1,
      };

      await generateLayerPracticeHandler(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'layerNumber is required and must be a non-negative number',
      });
    });

    it('should handle streaming response', async () => {
      const uid = 'test-uid';
      const decodedToken = createMockDecodedToken({ uid, email: 'test@example.com' });
      mockRequest = createMockRequest({ firebaseUser: decodedToken }, decodedToken);
      mockRequest.body = {
        concepts: [mockConcept],
        layerGoal: 'Learn React',
        layerNumber: 1,
      };

      const mockStream = (async function* () {
        yield { content: 'Practice review content' };
      })();

      (generateLayerPractice as jest.Mock).mockResolvedValue({
        stream: mockStream,
        model: 'deepseek-chat',
      });

      await generateLayerPracticeHandler(mockRequest as Request, mockResponse as Response);

      expect(generateLayerPractice).toHaveBeenCalled();
      expect(handleStreamResponse).toHaveBeenCalled();
    });

    it('should handle non-streaming response', async () => {
      const uid = 'test-uid';
      const decodedToken = createMockDecodedToken({ uid, email: 'test@example.com' });
      mockRequest = createMockRequest({ firebaseUser: decodedToken }, decodedToken);
      mockRequest.body = {
        concepts: [mockConcept],
        layerGoal: 'Learn React',
        layerNumber: 1,
      };

      const result = {
        items: [
          {
            type: 'project' as const,
            question: 'Build a React component',
            answer: 'Solution here',
          },
        ],
        model: 'deepseek-chat',
      };

      (generateLayerPractice as jest.Mock).mockResolvedValue(result);
      (getLayerByNumber as jest.Mock).mockResolvedValue(null);
      (saveLayer as jest.Mock).mockResolvedValue(undefined);

      await generateLayerPracticeHandler(mockRequest as Request, mockResponse as Response);

      expect(generateLayerPractice).toHaveBeenCalled();
      expect(mockResponse.json).toHaveBeenCalledWith({
        items: result.items,
        model: result.model,
      });
    });

    it('should fetch graph and seed concept when graphId is provided', async () => {
      const uid = 'test-uid';
      const decodedToken = createMockDecodedToken({ uid, email: 'test@example.com' });
      mockRequest = createMockRequest({ firebaseUser: decodedToken }, decodedToken);
      mockRequest.body = {
        concepts: [mockConcept],
        layerGoal: 'Learn React',
        layerNumber: 1,
        graphId: 'graph-1',
      };

      (getUserGraphById as jest.Mock).mockResolvedValue(mockGraph);
      (generateLayerPractice as jest.Mock).mockResolvedValue({
        items: [],
        model: 'deepseek-chat',
      });

      await generateLayerPracticeHandler(mockRequest as Request, mockResponse as Response);

      expect(getUserGraphById).toHaveBeenCalledWith(uid, 'graph-1');
      expect(generateLayerPractice).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        expect.anything(),
        expect.objectContaining({
          seedConcept: mockSeedConcept,
          difficulty: 'intermediate',
          focus: 'web development',
        })
      );
    });

    it('should handle errors and return 500', async () => {
      const uid = 'test-uid';
      const decodedToken = createMockDecodedToken({ uid, email: 'test@example.com' });
      mockRequest = createMockRequest({ firebaseUser: decodedToken }, decodedToken);
      mockRequest.body = {
        concepts: [mockConcept],
        layerGoal: 'Learn React',
        layerNumber: 1,
      };

      (generateLayerPractice as jest.Mock).mockRejectedValue(new Error('LLM error'));

      await generateLayerPracticeHandler(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Failed to generate layer practice',
        details: 'LLM error',
      });
    });
  });

  describe('answerQuestionHandler', () => {
    it('should return 401 when user is not authenticated', async () => {
      mockRequest.firebaseUser = undefined;
      mockRequest.body = {
        conceptGraphId: 'graph-1',
        conceptId: 'concept-1',
        question: 'What is React?',
      };

      await answerQuestionHandler(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: 'Unauthorized' });
    });

    it('should return 400 when conceptGraphId is missing', async () => {
      const uid = 'test-uid';
      const decodedToken = createMockDecodedToken({ uid, email: 'test@example.com' });
      mockRequest = createMockRequest({ firebaseUser: decodedToken }, decodedToken);
      mockRequest.body = {
        conceptId: 'concept-1',
        question: 'What is React?',
      };

      await answerQuestionHandler(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'conceptGraphId is required and must be a string',
      });
    });

    it('should return 400 when conceptId is missing', async () => {
      const uid = 'test-uid';
      const decodedToken = createMockDecodedToken({ uid, email: 'test@example.com' });
      mockRequest = createMockRequest({ firebaseUser: decodedToken }, decodedToken);
      mockRequest.body = {
        conceptGraphId: 'graph-1',
        question: 'What is React?',
      };

      await answerQuestionHandler(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'conceptId is required and must be a string',
      });
    });

    it('should return 400 when question is missing', async () => {
      const uid = 'test-uid';
      const decodedToken = createMockDecodedToken({ uid, email: 'test@example.com' });
      mockRequest = createMockRequest({ firebaseUser: decodedToken }, decodedToken);
      mockRequest.body = {
        conceptGraphId: 'graph-1',
        conceptId: 'concept-1',
      };

      await answerQuestionHandler(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'question is required and must be a non-empty string',
      });
    });

    it('should return 400 when question is empty', async () => {
      const uid = 'test-uid';
      const decodedToken = createMockDecodedToken({ uid, email: 'test@example.com' });
      mockRequest = createMockRequest({ firebaseUser: decodedToken }, decodedToken);
      mockRequest.body = {
        conceptGraphId: 'graph-1',
        conceptId: 'concept-1',
        question: '   ',
      };

      await answerQuestionHandler(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'question is required and must be a non-empty string',
      });
    });

    it('should return 404 when graph is not found', async () => {
      const uid = 'test-uid';
      const decodedToken = createMockDecodedToken({ uid, email: 'test@example.com' });
      mockRequest = createMockRequest({ firebaseUser: decodedToken }, decodedToken);
      mockRequest.body = {
        conceptGraphId: 'non-existent',
        conceptId: 'concept-1',
        question: 'What is React?',
      };

      (getUserGraphById as jest.Mock).mockResolvedValue(null);

      await answerQuestionHandler(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: 'Graph not found' });
    });

    it('should return 404 when concept is not found in graph', async () => {
      const uid = 'test-uid';
      const decodedToken = createMockDecodedToken({ uid, email: 'test@example.com' });
      mockRequest = createMockRequest({ firebaseUser: decodedToken }, decodedToken);
      mockRequest.body = {
        conceptGraphId: 'graph-1',
        conceptId: 'non-existent',
        question: 'What is React?',
      };

      (getUserGraphById as jest.Mock).mockResolvedValue(mockGraph);

      await answerQuestionHandler(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: 'Concept not found' });
    });

    it('should handle streaming response when Accept header includes text/event-stream', async () => {
      const uid = 'test-uid';
      const decodedToken = createMockDecodedToken({ uid, email: 'test@example.com' });
      mockRequest = createMockRequest({ firebaseUser: decodedToken }, decodedToken);
      mockRequest.body = {
        conceptGraphId: 'graph-1',
        conceptId: 'concept-1',
        question: 'What is React?',
      };
      (mockRequest as any).headers = {
        accept: 'text/event-stream',
      };

      (getUserGraphById as jest.Mock).mockResolvedValue(mockGraph);

      const mockStream = (async function* () {
        yield { choices: [{ delta: { content: 'Answer content' } }] };
      })();

      (answerQuestion as jest.Mock).mockResolvedValue({
        stream: mockStream,
        model: 'deepseek-chat',
      });

      await answerQuestionHandler(mockRequest as Request, mockResponse as Response);

      expect(answerQuestion).toHaveBeenCalledWith(
        mockConcept,
        expect.objectContaining({
          stream: true,
        })
      );
      expect(handleStreamResponse).toHaveBeenCalled();
    });

    it('should handle streaming response when stream query param is true', async () => {
      const uid = 'test-uid';
      const decodedToken = createMockDecodedToken({ uid, email: 'test@example.com' });
      mockRequest = createMockRequest({ firebaseUser: decodedToken }, decodedToken);
      mockRequest.body = {
        conceptGraphId: 'graph-1',
        conceptId: 'concept-1',
        question: 'What is React?',
      };
      (mockRequest as any).query = { stream: 'true' };

      (getUserGraphById as jest.Mock).mockResolvedValue(mockGraph);

      const mockStream = (async function* () {
        yield { choices: [{ delta: { content: 'Answer content' } }] };
      })();

      (answerQuestion as jest.Mock).mockResolvedValue({
        stream: mockStream,
        model: 'deepseek-chat',
      });

      await answerQuestionHandler(mockRequest as Request, mockResponse as Response);

      expect(answerQuestion).toHaveBeenCalledWith(
        mockConcept,
        expect.objectContaining({
          stream: true,
        })
      );
    });

    it('should handle non-streaming response', async () => {
      const uid = 'test-uid';
      const decodedToken = createMockDecodedToken({ uid, email: 'test@example.com' });
      mockRequest = createMockRequest({ firebaseUser: decodedToken }, decodedToken);
      mockRequest.body = {
        conceptGraphId: 'graph-1',
        conceptId: 'concept-1',
        question: 'What is React?',
      };
      (mockRequest as any).headers = {};
      (mockRequest as any).query = {};

      (getUserGraphById as jest.Mock).mockResolvedValue(mockGraph);

      const result = {
        answer: 'React is a JavaScript library',
        model: 'deepseek-chat',
      };

      (answerQuestion as jest.Mock).mockResolvedValue(result);

      await answerQuestionHandler(mockRequest as Request, mockResponse as Response);

      expect(answerQuestion).toHaveBeenCalledWith(
        mockConcept,
        expect.objectContaining({
          stream: false,
        })
      );
      expect(mockResponse.json).toHaveBeenCalledWith(result);
    });

    it('should include selectedText in question when provided', async () => {
      const uid = 'test-uid';
      const decodedToken = createMockDecodedToken({ uid, email: 'test@example.com' });
      mockRequest = createMockRequest({ firebaseUser: decodedToken }, decodedToken);
      mockRequest.body = {
        conceptGraphId: 'graph-1',
        conceptId: 'concept-1',
        question: 'What does this mean?',
        selectedText: 'const Component = () => {}',
      };
      (mockRequest as any).headers = {};
      (mockRequest as any).query = {};

      (getUserGraphById as jest.Mock).mockResolvedValue(mockGraph);
      (answerQuestion as jest.Mock).mockResolvedValue({
        answer: 'Answer',
        model: 'deepseek-chat',
      });

      await answerQuestionHandler(mockRequest as Request, mockResponse as Response);

      expect(answerQuestion).toHaveBeenCalledWith(
        mockConcept,
        expect.objectContaining({
          question: 'What does this mean?\n\nSelected text: "const Component = () => {}"',
        })
      );
    });

    it('should use graph difficulty when available', async () => {
      const uid = 'test-uid';
      const decodedToken = createMockDecodedToken({ uid, email: 'test@example.com' });
      mockRequest = createMockRequest({ firebaseUser: decodedToken }, decodedToken);
      mockRequest.body = {
        conceptGraphId: 'graph-1',
        conceptId: 'concept-1',
        question: 'What is React?',
      };
      (mockRequest as any).headers = {};
      (mockRequest as any).query = {};

      (getUserGraphById as jest.Mock).mockResolvedValue(mockGraph);
      (answerQuestion as jest.Mock).mockResolvedValue({
        answer: 'Answer',
        model: 'deepseek-chat',
      });

      await answerQuestionHandler(mockRequest as Request, mockResponse as Response);

      expect(answerQuestion).toHaveBeenCalledWith(
        mockConcept,
        expect.objectContaining({
          difficulty: 'intermediate',
        })
      );
    });

    it('should use default difficulty when graph difficulty is missing', async () => {
      const uid = 'test-uid';
      const decodedToken = createMockDecodedToken({ uid, email: 'test@example.com' });
      mockRequest = createMockRequest({ firebaseUser: decodedToken }, decodedToken);
      mockRequest.body = {
        conceptGraphId: 'graph-1',
        conceptId: 'concept-1',
        question: 'What is React?',
      };
      (mockRequest as any).headers = {};
      (mockRequest as any).query = {};

      const graphWithoutDifficulty = { ...mockGraph, difficulty: undefined };
      (getUserGraphById as jest.Mock).mockResolvedValue(graphWithoutDifficulty);
      (answerQuestion as jest.Mock).mockResolvedValue({
        answer: 'Answer',
        model: 'deepseek-chat',
      });

      await answerQuestionHandler(mockRequest as Request, mockResponse as Response);

      expect(answerQuestion).toHaveBeenCalledWith(
        mockConcept,
        expect.objectContaining({
          difficulty: 'intermediate',
        })
      );
    });

    it('should handle errors and return 500', async () => {
      const uid = 'test-uid';
      const decodedToken = createMockDecodedToken({ uid, email: 'test@example.com' });
      mockRequest = createMockRequest({ firebaseUser: decodedToken }, decodedToken);
      mockRequest.body = {
        conceptGraphId: 'graph-1',
        conceptId: 'concept-1',
        question: 'What is React?',
      };
      (mockRequest as any).headers = {};
      (mockRequest as any).query = {};

      (getUserGraphById as jest.Mock).mockResolvedValue(mockGraph);
      (answerQuestion as jest.Mock).mockRejectedValue(new Error('LLM error'));

      await answerQuestionHandler(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Failed to answer question',
        details: 'LLM error',
      });
    });
  });
});

