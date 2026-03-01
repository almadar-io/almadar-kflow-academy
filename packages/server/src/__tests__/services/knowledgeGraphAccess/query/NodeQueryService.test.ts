/**
 * Tests for NodeQueryService
 */

import { NodeQueryService } from '../../../../services/knowledgeGraphAccess/query/NodeQueryService';
import type { GraphLoader } from '../../../../services/knowledgeGraphAccess/core/GraphLoader';
import type { NodeBasedKnowledgeGraph, GraphNode } from '../../../../types/nodeBasedKnowledgeGraph';
import { createGraphNode } from '../../../../types/nodeBasedKnowledgeGraph';

describe('NodeQueryService', () => {
  let nodeQueryService: NodeQueryService;
  let mockLoader: jest.Mocked<GraphLoader>;
  const uid = 'test-user';
  const graphId = 'test-graph';

  const createNode = (id: string, type: GraphNode['type'], props: Record<string, any> = {}): GraphNode => {
    return createGraphNode(id, type, { id, ...props });
  };

  const sampleGraph: NodeBasedKnowledgeGraph = {
    id: graphId,
    seedConceptId: 'concept-1',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    version: 1,
    nodes: {
      'concept-1': createNode('concept-1', 'Concept', { name: 'Seed', isSeed: true }),
      'concept-2': createNode('concept-2', 'Concept', { name: 'Child 1' }),
      'concept-3': createNode('concept-3', 'Concept', { name: 'Child 2' }),
      'layer-1': createNode('layer-1', 'Layer', { layerNumber: 1 }),
      'lesson-1': createNode('lesson-1', 'Lesson', { content: 'Test content' }),
    },
    relationships: [],
    nodeTypes: {
      Graph: [],
      Concept: ['concept-1', 'concept-2', 'concept-3'],
      Layer: ['layer-1'],
      LearningGoal: [],
      Milestone: [],
      PracticeExercise: [],
      Lesson: ['lesson-1'],
      ConceptMetadata: [],
      GraphMetadata: [],
      FlashCard: [],
    },
  };

  beforeEach(() => {
    mockLoader = {
      getGraph: jest.fn().mockResolvedValue(sampleGraph),
      getGraphologyGraph: jest.fn(),
      saveGraph: jest.fn(),
      deleteGraph: jest.fn(),
      graphExists: jest.fn(),
    } as unknown as jest.Mocked<GraphLoader>;

    nodeQueryService = new NodeQueryService(mockLoader);
  });

  describe('getNode', () => {
    it('should return node if exists', async () => {
      const result = await nodeQueryService.getNode(uid, graphId, 'concept-1');
      expect(result).not.toBeNull();
      expect(result?.id).toBe('concept-1');
      expect(result?.properties?.name).toBe('Seed');
    });

    it('should return null for non-existent node', async () => {
      const result = await nodeQueryService.getNode(uid, graphId, 'non-existent');
      expect(result).toBeNull();
    });
  });

  describe('getNodes', () => {
    it('should return multiple nodes', async () => {
      const result = await nodeQueryService.getNodes(uid, graphId, ['concept-1', 'concept-2']);
      expect(result).toHaveLength(2);
      expect(result.map(n => n.id)).toContain('concept-1');
      expect(result.map(n => n.id)).toContain('concept-2');
    });

    it('should filter out non-existent nodes', async () => {
      const result = await nodeQueryService.getNodes(uid, graphId, ['concept-1', 'non-existent']);
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('concept-1');
    });
  });

  describe('getNodesByType', () => {
    it('should return all nodes of specified type', async () => {
      const result = await nodeQueryService.getNodesByType(uid, graphId, 'Concept');
      expect(result).toHaveLength(3);
    });

    it('should return empty array for type with no nodes', async () => {
      const result = await nodeQueryService.getNodesByType(uid, graphId, 'FlashCard');
      expect(result).toHaveLength(0);
    });
  });

  describe('findNodes', () => {
    it('should find nodes matching predicate', async () => {
      const result = await nodeQueryService.findNodes(
        uid,
        graphId,
        (node) => node.properties?.isSeed === true
      );
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('concept-1');
    });

    it('should return empty array when no matches', async () => {
      const result = await nodeQueryService.findNodes(
        uid,
        graphId,
        (node) => node.properties?.name === 'Non-existent'
      );
      expect(result).toHaveLength(0);
    });
  });

  describe('getNodeCountByType', () => {
    it('should return correct count', async () => {
      const result = await nodeQueryService.getNodeCountByType(uid, graphId, 'Concept');
      expect(result).toBe(3);
    });
  });

  describe('nodeExists', () => {
    it('should return true for existing node', async () => {
      const result = await nodeQueryService.nodeExists(uid, graphId, 'concept-1');
      expect(result).toBe(true);
    });

    it('should return false for non-existent node', async () => {
      const result = await nodeQueryService.nodeExists(uid, graphId, 'non-existent');
      expect(result).toBe(false);
    });
  });

  describe('getSeedConcept', () => {
    it('should return seed concept', async () => {
      const result = await nodeQueryService.getSeedConcept(uid, graphId);
      expect(result).not.toBeNull();
      expect(result?.id).toBe('concept-1');
      expect(result?.properties?.isSeed).toBe(true);
    });
  });
});
