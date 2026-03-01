/**
 * Tests for Graph Operations API (graphOperationsApi.ts)
 */

import { graphOperationsApi } from '../../../../features/knowledge-graph/api/graphOperationsApi';
import { apiClient } from '../../../../services/apiClient';
import { auth } from '../../../../config/firebase';
import type {
  ProgressiveExpandRequest,
  ExplainConceptRequest,
  AnswerQuestionRequest,
  GenerateGoalsRequest,
  ApplyMutationsRequest,
} from '../../../../features/knowledge-graph/api/types';

// Mock dependencies
jest.mock('../../../../services/apiClient', () => ({
  apiClient: {
    fetch: jest.fn(),
    baseURL: 'http://localhost:3001',
  },
}));

jest.mock('../../../../config/firebase', () => ({
  auth: {
    currentUser: null,
  },
}));

describe('graphOperationsApi', () => {
  const mockApiClient = apiClient as jest.Mocked<typeof apiClient>;
  const mockAuth = auth as any;

  beforeEach(() => {
    jest.clearAllMocks();
    mockAuth.currentUser = null;
  });

  describe('progressiveExpand', () => {
    it('should call the correct endpoint with request body', async () => {
      const mockResponse = {
        mutations: { mutations: [] },
        content: { narrative: 'Test', concepts: [] },
        graph: { id: 'graph-1', nodes: {}, relationships: [], nodeTypes: {} as any },
      };

      mockApiClient.fetch.mockResolvedValue(mockResponse);

      const request: ProgressiveExpandRequest = { numConcepts: 5 };
      const result = await graphOperationsApi.progressiveExpand('graph-1', request);

      expect(mockApiClient.fetch).toHaveBeenCalledWith(
        '/api/graph-operations/graph-1/expand',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(request),
        })
      );
      expect(result).toEqual(mockResponse);
    });

    it('should include auth token when user is authenticated', async () => {
      const mockUser = {
        getIdToken: jest.fn().mockResolvedValue('mock-token'),
      };
      mockAuth.currentUser = mockUser as any;

      mockApiClient.fetch.mockResolvedValue({});

      await graphOperationsApi.progressiveExpand('graph-1', {});

      expect(mockApiClient.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer mock-token',
          }),
        })
      );
    });
  });

  describe('explainConcept', () => {
    it('should call the correct endpoint with request body', async () => {
      const mockResponse = {
        mutations: { mutations: [] },
        content: { lesson: 'Test lesson' },
        graph: { id: 'graph-1', nodes: {}, relationships: [], nodeTypes: {} as any },
      };

      mockApiClient.fetch.mockResolvedValue(mockResponse);

      const request: ExplainConceptRequest = { targetNodeId: 'node-1' };
      const result = await graphOperationsApi.explainConcept('graph-1', request);

      expect(mockApiClient.fetch).toHaveBeenCalledWith(
        '/api/graph-operations/graph-1/explain',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(request),
        })
      );
      expect(result).toEqual(mockResponse);
    });
  });

  describe('answerQuestion', () => {
    it('should call the correct endpoint with request body', async () => {
      const mockResponse = {
        mutations: { mutations: [] },
        content: { answer: 'Test answer' },
        graph: { id: 'graph-1', nodes: {}, relationships: [], nodeTypes: {} as any },
      };

      mockApiClient.fetch.mockResolvedValue(mockResponse);

      const request: AnswerQuestionRequest = {
        targetNodeId: 'node-1',
        question: 'What is this?',
      };
      const result = await graphOperationsApi.answerQuestion('graph-1', request);

      expect(mockApiClient.fetch).toHaveBeenCalledWith(
        '/api/graph-operations/graph-1/answer-question',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(request),
        })
      );
      expect(result).toEqual(mockResponse);
    });
  });

  describe('generateGoals', () => {
    it('should call the correct endpoint with request body', async () => {
      const mockResponse = {
        mutations: { mutations: [] },
        content: {
          goal: {
            id: 'goal-1',
            graphId: 'graph-1',
            title: 'Test Goal',
            description: 'Test',
            type: 'test',
            target: 'test',
            createdAt: Date.now(),
            updatedAt: Date.now(),
          },
        },
        graph: { id: 'graph-1', nodes: {}, relationships: [], nodeTypes: {} as any },
      };

      mockApiClient.fetch.mockResolvedValue(mockResponse);

      const request: GenerateGoalsRequest = {
        anchorAnswer: 'I want to learn',
        questionAnswers: [{ questionId: 'q1', answer: 'test' }],
      };
      const result = await graphOperationsApi.generateGoals('graph-1', request);

      expect(mockApiClient.fetch).toHaveBeenCalledWith(
        '/api/graph-operations/graph-1/generate-goals',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(request),
        })
      );
      expect(result).toEqual(mockResponse);
    });
  });

  describe('applyMutations', () => {
    it('should call the correct endpoint with mutations', async () => {
      const mockResponse = {
        graph: { id: 'graph-1', nodes: {}, relationships: [], nodeTypes: {} as any },
      };

      mockApiClient.fetch.mockResolvedValue(mockResponse);

      const request: ApplyMutationsRequest = {
        mutations: [
          {
            type: 'create_node',
            node: {
              id: 'node-1',
              type: 'Concept',
              properties: {},
              createdAt: Date.now(),
              updatedAt: Date.now(),
            },
          },
        ],
      };
      const result = await graphOperationsApi.applyMutations('graph-1', request);

      expect(mockApiClient.fetch).toHaveBeenCalledWith(
        '/api/knowledge-graphs-access/graph-1/mutations',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(request),
        })
      );
      expect(result).toEqual(mockResponse);
    });
  });

  describe('validateMutations', () => {
    it('should call the correct endpoint with mutations', async () => {
      const mockResponse = {
        valid: true,
        errors: [],
      };

      mockApiClient.fetch.mockResolvedValue(mockResponse);

      const request: ApplyMutationsRequest = {
        mutations: [
          {
            type: 'create_node',
            node: {
              id: 'node-1',
              type: 'Concept',
              properties: {},
              createdAt: Date.now(),
              updatedAt: Date.now(),
            },
          },
        ],
      };
      const result = await graphOperationsApi.validateMutations('graph-1', request);

      expect(mockApiClient.fetch).toHaveBeenCalledWith(
        '/api/knowledge-graphs-access/graph-1/mutations/validate',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(request),
        })
      );
      expect(result).toEqual(mockResponse);
    });
  });

  describe('error handling', () => {
    it('should propagate API errors', async () => {
      const error = new Error('API Error');
      mockApiClient.fetch.mockRejectedValue(error);

      await expect(
        graphOperationsApi.progressiveExpand('graph-1', {})
      ).rejects.toThrow('API Error');
    });
  });
});

