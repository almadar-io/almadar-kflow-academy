/**
 * Tests for Graph Authorization Service
 * 
 * Tests ownership verification and access control checks.
 */

import { GraphAuthorizationService } from '../../services/graphAuthorizationService';
import type { NodeBasedKnowledgeGraph } from '../../types/nodeBasedKnowledgeGraph';
import { createGraphNode } from '../../types/nodeBasedKnowledgeGraph';

// Mock the knowledge graph service
jest.mock('../../services/knowledgeGraphService', () => {
  const mockGetGraph = jest.fn();
  return {
    getNodeBasedKnowledgeGraph: mockGetGraph,
    __mocks: {
      mockGetGraph,
    },
  };
});

const { mockGetGraph } = require('../../services/knowledgeGraphService').__mocks;

describe('GraphAuthorizationService', () => {
  let authorizationService: GraphAuthorizationService;
  let sampleGraph: NodeBasedKnowledgeGraph;

  beforeEach(() => {
    authorizationService = new GraphAuthorizationService();
    jest.clearAllMocks();

    // Create sample graph
    const graphId = 'test-graph-1';
    sampleGraph = {
      id: graphId,
      seedConceptId: 'concept-1',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      nodes: {
        [graphId]: createGraphNode(graphId, 'Graph', { id: graphId, name: 'Test Graph' }),
        'concept-1': createGraphNode('concept-1', 'Concept', { id: 'concept-1', name: 'React' }),
      },
      nodeTypes: {
        Graph: [graphId],
        Concept: ['concept-1'],
        Layer: [],
        LearningGoal: [],
        Milestone: [],
        PracticeExercise: [],
        Lesson: [],
        ConceptMetadata: [],
        GraphMetadata: [],
        FlashCard: [],
      },
      relationships: [],
    };
  });

  describe('verifyGraphOwnership', () => {
    it('should return true if user owns the graph', async () => {
      const uid = 'user-1';
      const graphId = 'test-graph-1';

      mockGetGraph.mockResolvedValue(sampleGraph);

      const result = await authorizationService.verifyGraphOwnership(uid, graphId);

      expect(result).toBe(true);
      expect(mockGetGraph).toHaveBeenCalledWith(uid, graphId);
    });

    it('should return false if graph does not exist', async () => {
      const uid = 'user-1';
      const graphId = 'non-existent-graph';

      mockGetGraph.mockResolvedValue(null);

      const result = await authorizationService.verifyGraphOwnership(uid, graphId);

      expect(result).toBe(false);
      expect(mockGetGraph).toHaveBeenCalledWith(uid, graphId);
    });

    it('should return false if error occurs', async () => {
      const uid = 'user-1';
      const graphId = 'test-graph-1';

      mockGetGraph.mockRejectedValue(new Error('Database error'));

      const result = await authorizationService.verifyGraphOwnership(uid, graphId);

      expect(result).toBe(false);
    });
  });

  describe('checkGraphAccess', () => {
    it('should return true if user owns the graph (read)', async () => {
      const uid = 'user-1';
      const graphId = 'test-graph-1';

      mockGetGraph.mockResolvedValue(sampleGraph);

      const result = await authorizationService.checkGraphAccess(uid, graphId, 'read');

      expect(result).toBe(true);
    });

    it('should return true if user owns the graph (write)', async () => {
      const uid = 'user-1';
      const graphId = 'test-graph-1';

      mockGetGraph.mockResolvedValue(sampleGraph);

      const result = await authorizationService.checkGraphAccess(uid, graphId, 'write');

      expect(result).toBe(true);
    });

    it('should return true if user owns the graph (delete)', async () => {
      const uid = 'user-1';
      const graphId = 'test-graph-1';

      mockGetGraph.mockResolvedValue(sampleGraph);

      const result = await authorizationService.checkGraphAccess(uid, graphId, 'delete');

      expect(result).toBe(true);
    });

    it('should return false if user does not own the graph', async () => {
      const uid = 'user-1';
      const graphId = 'test-graph-1';

      mockGetGraph.mockResolvedValue(null);

      const result = await authorizationService.checkGraphAccess(uid, graphId, 'read');

      expect(result).toBe(false);
    });
  });

  describe('getGraphPermissions', () => {
    it('should return full permissions for graph owner', async () => {
      const uid = 'user-1';
      const graphId = 'test-graph-1';

      mockGetGraph.mockResolvedValue(sampleGraph);

      const permissions = await authorizationService.getGraphPermissions(uid, graphId);

      expect(permissions).toEqual({
        ownerId: uid,
        canRead: true,
        canWrite: true,
        canDelete: true,
      });
    });

    it('should return no permissions if user does not own the graph', async () => {
      const uid = 'user-1';
      const graphId = 'test-graph-1';

      mockGetGraph.mockResolvedValue(null);

      const permissions = await authorizationService.getGraphPermissions(uid, graphId);

      expect(permissions).toEqual({
        ownerId: '',
        canRead: false,
        canWrite: false,
        canDelete: false,
      });
    });
  });

  describe('verifyGraphAccess', () => {
    it('should not throw if user has access', async () => {
      const uid = 'user-1';
      const graphId = 'test-graph-1';

      mockGetGraph.mockResolvedValue(sampleGraph);

      await expect(
        authorizationService.verifyGraphAccess(uid, graphId, 'read')
      ).resolves.not.toThrow();
    });

    it('should throw NOT_FOUND error if graph does not exist', async () => {
      const uid = 'user-1';
      const graphId = 'non-existent-graph';

      mockGetGraph.mockResolvedValue(null);

      await expect(
        authorizationService.verifyGraphAccess(uid, graphId, 'read')
      ).rejects.toThrow('Graph non-existent-graph not found');

      try {
        await authorizationService.verifyGraphAccess(uid, graphId, 'read');
      } catch (error: any) {
        expect(error.name).toBe('AuthorizationError');
        expect(error.code).toBe('NOT_FOUND');
        expect(error.graphId).toBe(graphId);
        expect(error.userId).toBe(uid);
      }
    });

    it('should throw NOT_FOUND error if graph does not exist', async () => {
      const uid = 'user-1';
      const graphId = 'non-existent-graph';

      // verifyGraphAccess calls checkGraphAccess, which calls verifyGraphOwnership
      // verifyGraphOwnership returns false if graph doesn't exist
      mockGetGraph.mockResolvedValue(null);

      await expect(
        authorizationService.verifyGraphAccess(uid, graphId, 'read')
      ).rejects.toThrow('Graph non-existent-graph not found');

      try {
        await authorizationService.verifyGraphAccess(uid, graphId, 'read');
      } catch (error: any) {
        expect(error.name).toBe('AuthorizationError');
        expect(error.code).toBe('NOT_FOUND');
        expect(error.graphId).toBe(graphId);
      }
    });
  });

  describe('verifyGraphOwnershipOrThrow', () => {
    it('should not throw if user owns the graph', async () => {
      const uid = 'user-1';
      const graphId = 'test-graph-1';

      // Mock will be called once in verifyGraphOwnership
      mockGetGraph.mockResolvedValue(sampleGraph);

      await expect(
        authorizationService.verifyGraphOwnershipOrThrow(uid, graphId)
      ).resolves.not.toThrow();
      
      expect(mockGetGraph).toHaveBeenCalledWith(uid, graphId);
    });

    it('should throw NOT_FOUND error if graph does not exist', async () => {
      const uid = 'user-1';
      const graphId = 'non-existent-graph';

      mockGetGraph.mockResolvedValue(null);

      await expect(
        authorizationService.verifyGraphOwnershipOrThrow(uid, graphId)
      ).rejects.toThrow('Graph non-existent-graph not found');

      try {
        await authorizationService.verifyGraphOwnershipOrThrow(uid, graphId);
      } catch (error: any) {
        expect(error.name).toBe('AuthorizationError');
        expect(error.code).toBe('NOT_FOUND');
      }
    });
  });
});

