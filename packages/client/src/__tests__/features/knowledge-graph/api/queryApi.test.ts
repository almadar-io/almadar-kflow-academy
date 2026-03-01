/**
 * Tests for Query API (queryApi.ts)
 */

import { graphQueryApi } from '../../../../features/knowledge-graph/api/queryApi';
import { apiClient } from '../../../../services/apiClient';
import { auth } from '../../../../config/firebase';
import type {
  LearningPathSummary,
  GraphSummary,
  ConceptDisplay,
  ConceptDetail,
} from '../../../../features/knowledge-graph/api/types';

// Mock dependencies
jest.mock('../../../../services/apiClient', () => ({
  apiClient: {
    fetch: jest.fn(),
  },
}));

jest.mock('../../../../config/firebase', () => ({
  auth: {
    currentUser: null,
  },
}));

describe('graphQueryApi', () => {
  const mockApiClient = apiClient as jest.Mocked<typeof apiClient>;
  const mockAuth = auth as jest.Mocked<typeof auth>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockAuth.currentUser = null;
  });

  describe('getLearningPaths', () => {
    it('should fetch learning paths successfully', async () => {
      const mockResponse: { learningPaths: LearningPathSummary[] } = {
        learningPaths: [
          {
            id: 'graph-1',
            title: 'Learn JavaScript',
            description: 'A comprehensive JavaScript course',
            conceptCount: 10,
            seedConcept: {
              id: 'seed-1',
              name: 'JavaScript Basics',
              description: 'Introduction to JavaScript',
            },
            updatedAt: Date.now(),
            createdAt: Date.now(),
          },
        ],
      };

      mockApiClient.fetch.mockResolvedValue(mockResponse);

      const result = await graphQueryApi.getLearningPaths();

      expect(mockApiClient.fetch).toHaveBeenCalledWith(
        '/api/graph-queries/learning-paths',
        expect.objectContaining({
          method: 'GET',
          headers: expect.any(Object),
        })
      );
      expect(result).toEqual(mockResponse);
    });

    it('should include Authorization header when user is authenticated', async () => {
      const mockUser = {
        getIdToken: jest.fn().mockResolvedValue('mock-token'),
      };
      mockAuth.currentUser = mockUser as any;

      mockApiClient.fetch.mockResolvedValue({ learningPaths: [] });

      await graphQueryApi.getLearningPaths();

      expect(mockApiClient.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer mock-token',
          }),
        })
      );
    });

    it('should handle errors', async () => {
      const error = new Error('Network error');
      mockApiClient.fetch.mockRejectedValue(error);

      await expect(graphQueryApi.getLearningPaths()).rejects.toThrow('Network error');
    });
  });

  describe('getGraphSummary', () => {
    it('should fetch graph summary successfully', async () => {
      const mockSummary: GraphSummary = {
        id: 'graph-1',
        goal: {
          id: 'goal-1',
          title: 'Learn JavaScript',
          description: 'Master JavaScript fundamentals',
          type: 'skill',
          target: 'intermediate',
        },
        milestones: [
          {
            id: 'milestone-1',
            title: 'Complete Basics',
            description: 'Finish basic concepts',
            completed: false,
          },
        ],
        conceptCount: 10,
        layerCount: 3,
        seedConcept: {
          id: 'seed-1',
          name: 'JavaScript Basics',
        },
        updatedAt: Date.now(),
      };

      mockApiClient.fetch.mockResolvedValue(mockSummary);

      const result = await graphQueryApi.getGraphSummary('graph-1');

      expect(mockApiClient.fetch).toHaveBeenCalledWith(
        '/api/graph-queries/graph-1/summary',
        expect.objectContaining({
          method: 'GET',
          headers: expect.any(Object),
        })
      );
      expect(result).toEqual(mockSummary);
    });

    it('should handle graph without goal', async () => {
      const mockSummary: GraphSummary = {
        id: 'graph-1',
        goal: null,
        milestones: [],
        conceptCount: 5,
        layerCount: 2,
        seedConcept: {
          id: 'seed-1',
          name: 'Basics',
        },
        updatedAt: Date.now(),
      };

      mockApiClient.fetch.mockResolvedValue(mockSummary);

      const result = await graphQueryApi.getGraphSummary('graph-1');

      expect(result.goal).toBeNull();
      expect(result.milestones).toEqual([]);
    });
  });

  describe('getConceptsByLayer', () => {
    it('should fetch concepts with default options', async () => {
      const mockResponse = {
        concepts: [
          {
            id: 'concept-1',
            name: 'Variables',
            description: 'Understanding variables',
            layer: 1,
            isSeed: true,
            parents: [],
            children: ['concept-2'],
            prerequisites: [],
            properties: {},
          } as ConceptDisplay,
        ],
        layerInfo: [
          {
            layerNumber: 1,
            conceptCount: 1,
          },
        ],
      };

      mockApiClient.fetch.mockResolvedValue(mockResponse);

      const result = await graphQueryApi.getConceptsByLayer('graph-1');

      expect(mockApiClient.fetch).toHaveBeenCalledWith(
        '/api/graph-queries/graph-1/concepts',
        expect.objectContaining({
          method: 'GET',
          headers: expect.any(Object),
        })
      );
      expect(result).toEqual(mockResponse);
    });

    it('should include query parameters when options provided', async () => {
      mockApiClient.fetch.mockResolvedValue({
        concepts: [],
        layerInfo: [],
      });

      await graphQueryApi.getConceptsByLayer('graph-1', {
        includeRelationships: false,
        groupByLayer: true,
      });

      expect(mockApiClient.fetch).toHaveBeenCalledWith(
        '/api/graph-queries/graph-1/concepts?includeRelationships=false&groupByLayer=true',
        expect.any(Object)
      );
    });

    it('should handle groupedByLayer response', async () => {
      const mockResponse = {
        concepts: [],
        groupedByLayer: {
          1: [
            {
              id: 'concept-1',
              name: 'Concept 1',
              description: 'Description',
              layer: 1,
              isSeed: false,
              parents: [],
              children: [],
              prerequisites: [],
              properties: {},
            } as ConceptDisplay,
          ],
        },
        layerInfo: [],
      };

      mockApiClient.fetch.mockResolvedValue(mockResponse);

      const result = await graphQueryApi.getConceptsByLayer('graph-1', {
        groupByLayer: true,
      });

      expect(result.groupedByLayer).toBeDefined();
      expect(result.groupedByLayer?.[1]).toHaveLength(1);
    });
  });

  describe('getConceptDetail', () => {
    it('should fetch concept detail successfully', async () => {
      const mockDetail: ConceptDetail = {
        concept: {
          id: 'concept-1',
          name: 'Variables',
          description: 'Understanding variables',
          layer: 1,
          isSeed: true,
          parents: [],
          children: ['concept-2'],
          prerequisites: [],
          properties: {},
        },
        lesson: {
          id: 'lesson-1',
          content: 'Variables are...',
          prerequisites: [],
        },
        flashcards: [
          {
            id: 'flashcard-1',
            front: 'What is a variable?',
            back: 'A variable is...',
          },
        ],
        metadata: {
          qa: [
            {
              question: 'What is a variable?',
              answer: 'A variable is a container for data.',
            },
          ],
        },
        relationships: {
          parents: [],
          children: [
            {
              id: 'concept-2',
              name: 'Functions',
            },
          ],
          prerequisites: [],
        },
      };

      mockApiClient.fetch.mockResolvedValue(mockDetail);

      const result = await graphQueryApi.getConceptDetail('graph-1', 'concept-1');

      expect(mockApiClient.fetch).toHaveBeenCalledWith(
        '/api/graph-queries/graph-1/concepts/concept-1',
        expect.objectContaining({
          method: 'GET',
          headers: expect.any(Object),
        })
      );
      expect(result).toEqual(mockDetail);
    });

    it('should handle concept without lesson', async () => {
      const mockDetail: ConceptDetail = {
        concept: {
          id: 'concept-1',
          name: 'Variables',
          description: 'Understanding variables',
          layer: 1,
          isSeed: false,
          parents: [],
          children: [],
          prerequisites: [],
          properties: {},
        },
        lesson: null,
        flashcards: [],
        metadata: null,
        relationships: {
          parents: [],
          children: [],
          prerequisites: [],
        },
      };

      mockApiClient.fetch.mockResolvedValue(mockDetail);

      const result = await graphQueryApi.getConceptDetail('graph-1', 'concept-1');

      expect(result.lesson).toBeNull();
      expect(result.flashcards).toEqual([]);
      expect(result.metadata).toBeNull();
    });
  });
});

