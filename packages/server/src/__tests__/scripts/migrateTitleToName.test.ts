/**
 * Tests for migrateTitleToName migration script
 * 
 * Verifies that the migration script correctly migrates:
 * - LearningGoal nodes: title → name
 * - Milestone nodes: title → name
 * - Layer nodes: levelName → name (or goal → name, or generate from layerNumber)
 */

import { migrateGraph, migrateTitleToName } from '../../scripts/migrateTitleToName';
import { getNodeBasedKnowledgeGraph, saveNodeBasedKnowledgeGraph } from '../../services/knowledgeGraphService';
import { createGraphNode } from '../../types/nodeBasedKnowledgeGraph';
import type { NodeBasedKnowledgeGraph } from '../../types/nodeBasedKnowledgeGraph';

// Mock the services
jest.mock('../../services/knowledgeGraphService', () => ({
  getNodeBasedKnowledgeGraph: jest.fn(),
  saveNodeBasedKnowledgeGraph: jest.fn(),
}));

jest.mock('../../config/firebaseAdmin', () => ({
  getFirestore: jest.fn(),
}));

const mockGetNodeBasedKnowledgeGraph = getNodeBasedKnowledgeGraph as jest.MockedFunction<typeof getNodeBasedKnowledgeGraph>;
const mockSaveNodeBasedKnowledgeGraph = saveNodeBasedKnowledgeGraph as jest.MockedFunction<typeof saveNodeBasedKnowledgeGraph>;

describe('migrateTitleToName', () => {
  const uid = 'test-user-1';
  const graphId = 'test-graph-1';

  beforeEach(() => {
    jest.clearAllMocks();
    // Mock saveNodeBasedKnowledgeGraph to return the graph that was passed to it
    mockSaveNodeBasedKnowledgeGraph.mockImplementation(async (uid: string, graph: NodeBasedKnowledgeGraph) => {
      return graph;
    });
  });

  describe('migrateGraph', () => {
    it('should migrate LearningGoal node from title to name', async () => {
      const graph: NodeBasedKnowledgeGraph = {
        id: graphId,
        seedConceptId: 'seed-1',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        nodes: {
          [graphId]: createGraphNode(graphId, 'Graph', { id: graphId }),
          'goal-1': createGraphNode('goal-1', 'LearningGoal', {
            id: 'goal-1',
            title: 'Learn React',  // Old property
            description: 'Master React',
            type: 'skill',
            createdAt: Date.now(),
            updatedAt: Date.now(),
          }),
        },
        nodeTypes: {
          Graph: [graphId],
          Concept: [],
          Layer: [],
          LearningGoal: ['goal-1'],
          Milestone: [],
          PracticeExercise: [],
          Lesson: [],
          ConceptMetadata: [],
          GraphMetadata: [],
          FlashCard: [],
        },
        relationships: [],
      };

      mockGetNodeBasedKnowledgeGraph.mockResolvedValue(graph);

      const result = await migrateGraph(uid, graphId);

      expect(result.success).toBe(true);
      expect(result.goalsMigrated).toBe(1);
      expect(result.milestonesMigrated).toBe(0);
      expect(result.layersMigrated).toBe(0);

      // Verify graph was saved
      expect(mockSaveNodeBasedKnowledgeGraph).toHaveBeenCalledTimes(1);
      const savedGraph = mockSaveNodeBasedKnowledgeGraph.mock.calls[0][1];
      
      // Verify title was copied to name
      expect(savedGraph.nodes['goal-1'].properties.name).toBe('Learn React');
      // Verify title still exists (for backward compatibility)
      expect(savedGraph.nodes['goal-1'].properties.title).toBe('Learn React');
    });

    it('should migrate Milestone node from title to name', async () => {
      const graph: NodeBasedKnowledgeGraph = {
        id: graphId,
        seedConceptId: 'seed-1',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        nodes: {
          [graphId]: createGraphNode(graphId, 'Graph', { id: graphId }),
          'milestone-1': createGraphNode('milestone-1', 'Milestone', {
            id: 'milestone-1',
            title: 'Complete Basics',  // Old property
            description: 'Finish basics',
            completed: false,
          }),
        },
        nodeTypes: {
          Graph: [graphId],
          Concept: [],
          Layer: [],
          LearningGoal: [],
          Milestone: ['milestone-1'],
          PracticeExercise: [],
          Lesson: [],
          ConceptMetadata: [],
          GraphMetadata: [],
          FlashCard: [],
        },
        relationships: [],
      };

      mockGetNodeBasedKnowledgeGraph.mockResolvedValue(graph);

      const result = await migrateGraph(uid, graphId);

      expect(result.success).toBe(true);
      expect(result.goalsMigrated).toBe(0);
      expect(result.milestonesMigrated).toBe(1);
      expect(result.layersMigrated).toBe(0);

      const savedGraph = mockSaveNodeBasedKnowledgeGraph.mock.calls[0][1];
      expect(savedGraph.nodes['milestone-1'].properties.name).toBe('Complete Basics');
      expect(savedGraph.nodes['milestone-1'].properties.title).toBe('Complete Basics');
    });

    it('should migrate Layer node from levelName to name', async () => {
      const graph: NodeBasedKnowledgeGraph = {
        id: graphId,
        seedConceptId: 'seed-1',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        nodes: {
          [graphId]: createGraphNode(graphId, 'Graph', { id: graphId }),
          'layer-1': createGraphNode('layer-1', 'Layer', {
            id: 'layer-1',
            levelName: 'Introduction Layer',  // Old property
            layerNumber: 1,
            goal: 'Learn basics',
            prompt: 'Generate concepts',
            response: 'Generated',
            createdAt: Date.now(),
          }),
        },
        nodeTypes: {
          Graph: [graphId],
          Concept: [],
          Layer: ['layer-1'],
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

      mockGetNodeBasedKnowledgeGraph.mockResolvedValue(graph);

      const result = await migrateGraph(uid, graphId);

      expect(result.success).toBe(true);
      expect(result.goalsMigrated).toBe(0);
      expect(result.milestonesMigrated).toBe(0);
      expect(result.layersMigrated).toBe(1);

      const savedGraph = mockSaveNodeBasedKnowledgeGraph.mock.calls[0][1];
      expect(savedGraph.nodes['layer-1'].properties.name).toBe('Introduction Layer');
      // levelName should still exist (for backward compatibility)
      expect(savedGraph.nodes['layer-1'].properties.levelName).toBe('Introduction Layer');
    });

    it('should migrate Layer node from goal to name if levelName not present', async () => {
      const graph: NodeBasedKnowledgeGraph = {
        id: graphId,
        seedConceptId: 'seed-1',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        nodes: {
          [graphId]: createGraphNode(graphId, 'Graph', { id: graphId }),
          'layer-1': createGraphNode('layer-1', 'Layer', {
            id: 'layer-1',
            layerNumber: 1,
            goal: 'Learn the fundamentals',  // Use goal as name
            prompt: 'Generate',
            response: 'Generated',
            createdAt: Date.now(),
          }),
        },
        nodeTypes: {
          Graph: [graphId],
          Concept: [],
          Layer: ['layer-1'],
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

      mockGetNodeBasedKnowledgeGraph.mockResolvedValue(graph);

      const result = await migrateGraph(uid, graphId);

      expect(result.success).toBe(true);
      expect(result.layersMigrated).toBe(1);

      const savedGraph = mockSaveNodeBasedKnowledgeGraph.mock.calls[0][1];
      expect(savedGraph.nodes['layer-1'].properties.name).toBe('Learn the fundamentals');
    });

    it('should generate name from layerNumber if neither levelName nor goal present', async () => {
      const graph: NodeBasedKnowledgeGraph = {
        id: graphId,
        seedConceptId: 'seed-1',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        nodes: {
          [graphId]: createGraphNode(graphId, 'Graph', { id: graphId }),
          'layer-1': createGraphNode('layer-1', 'Layer', {
            id: 'layer-1',
            layerNumber: 2,
            prompt: 'Generate',
            response: 'Generated',
            createdAt: Date.now(),
          }),
        },
        nodeTypes: {
          Graph: [graphId],
          Concept: [],
          Layer: ['layer-1'],
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

      mockGetNodeBasedKnowledgeGraph.mockResolvedValue(graph);

      const result = await migrateGraph(uid, graphId);

      expect(result.success).toBe(true);
      expect(result.layersMigrated).toBe(1);

      const savedGraph = mockSaveNodeBasedKnowledgeGraph.mock.calls[0][1];
      expect(savedGraph.nodes['layer-1'].properties.name).toBe('Layer 2');
    });

    it('should not migrate nodes that already have name property', async () => {
      const graph: NodeBasedKnowledgeGraph = {
        id: graphId,
        seedConceptId: 'seed-1',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        nodes: {
          [graphId]: createGraphNode(graphId, 'Graph', { id: graphId }),
          'goal-1': createGraphNode('goal-1', 'LearningGoal', {
            id: 'goal-1',
            name: 'Learn React',  // Already has name
            title: 'Learn React',  // Also has title (same value)
            description: 'Master React',
            type: 'skill',
            createdAt: Date.now(),
            updatedAt: Date.now(),
          }),
        },
        nodeTypes: {
          Graph: [graphId],
          Concept: [],
          Layer: [],
          LearningGoal: ['goal-1'],
          Milestone: [],
          PracticeExercise: [],
          Lesson: [],
          ConceptMetadata: [],
          GraphMetadata: [],
          FlashCard: [],
        },
        relationships: [],
      };

      mockGetNodeBasedKnowledgeGraph.mockResolvedValue(graph);

      const result = await migrateGraph(uid, graphId);

      expect(result.success).toBe(true);
      expect(result.goalsMigrated).toBe(0);  // No migration needed

      // Graph should not be saved if no changes
      expect(mockSaveNodeBasedKnowledgeGraph).not.toHaveBeenCalled();
    });

    it('should handle nodes with both title and name (different values)', async () => {
      const graph: NodeBasedKnowledgeGraph = {
        id: graphId,
        seedConceptId: 'seed-1',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        nodes: {
          [graphId]: createGraphNode(graphId, 'Graph', { id: graphId }),
          'goal-1': createGraphNode('goal-1', 'LearningGoal', {
            id: 'goal-1',
            name: 'Correct Name',  // Already has name
            title: 'Old Title',    // Different title
            description: 'Description',
            type: 'skill',
            createdAt: Date.now(),
            updatedAt: Date.now(),
          }),
        },
        nodeTypes: {
          Graph: [graphId],
          Concept: [],
          Layer: [],
          LearningGoal: ['goal-1'],
          Milestone: [],
          PracticeExercise: [],
          Lesson: [],
          ConceptMetadata: [],
          GraphMetadata: [],
          FlashCard: [],
        },
        relationships: [],
      };

      mockGetNodeBasedKnowledgeGraph.mockResolvedValue(graph);

      const result = await migrateGraph(uid, graphId);

      expect(result.success).toBe(true);
      expect(result.goalsMigrated).toBe(0);  // Name already exists, no migration

      // Should not save (no changes made)
      expect(mockSaveNodeBasedKnowledgeGraph).not.toHaveBeenCalled();
    });

    it('should migrate multiple nodes of different types', async () => {
      const graph: NodeBasedKnowledgeGraph = {
        id: graphId,
        seedConceptId: 'seed-1',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        nodes: {
          [graphId]: createGraphNode(graphId, 'Graph', { id: graphId }),
          'goal-1': createGraphNode('goal-1', 'LearningGoal', {
            id: 'goal-1',
            title: 'Learn React',
            description: 'Master React',
            type: 'skill',
            createdAt: Date.now(),
            updatedAt: Date.now(),
          }),
          'milestone-1': createGraphNode('milestone-1', 'Milestone', {
            id: 'milestone-1',
            title: 'Complete Basics',
            completed: false,
          }),
          'milestone-2': createGraphNode('milestone-2', 'Milestone', {
            id: 'milestone-2',
            title: 'Build Project',
            completed: false,
          }),
          'layer-1': createGraphNode('layer-1', 'Layer', {
            id: 'layer-1',
            levelName: 'Introduction',
            layerNumber: 1,
            goal: 'Learn basics',
            prompt: 'Generate',
            response: 'Generated',
            createdAt: Date.now(),
          }),
        },
        nodeTypes: {
          Graph: [graphId],
          Concept: [],
          Layer: ['layer-1'],
          LearningGoal: ['goal-1'],
          Milestone: ['milestone-1', 'milestone-2'],
          PracticeExercise: [],
          Lesson: [],
          ConceptMetadata: [],
          GraphMetadata: [],
          FlashCard: [],
        },
        relationships: [],
      };

      mockGetNodeBasedKnowledgeGraph.mockResolvedValue(graph);

      const result = await migrateGraph(uid, graphId);

      expect(result.success).toBe(true);
      expect(result.goalsMigrated).toBe(1);
      expect(result.milestonesMigrated).toBe(2);
      expect(result.layersMigrated).toBe(1);

      const savedGraph = mockSaveNodeBasedKnowledgeGraph.mock.calls[0][1];
      expect(savedGraph.nodes['goal-1'].properties.name).toBe('Learn React');
      expect(savedGraph.nodes['milestone-1'].properties.name).toBe('Complete Basics');
      expect(savedGraph.nodes['milestone-2'].properties.name).toBe('Build Project');
      expect(savedGraph.nodes['layer-1'].properties.name).toBe('Introduction');
    });

    it('should return error if graph not found', async () => {
      mockGetNodeBasedKnowledgeGraph.mockResolvedValue(null);

      const result = await migrateGraph(uid, graphId);

      expect(result.success).toBe(false);
      expect(result.error).toContain('not found');
      expect(mockSaveNodeBasedKnowledgeGraph).not.toHaveBeenCalled();
    });

    it('should handle errors gracefully', async () => {
      mockGetNodeBasedKnowledgeGraph.mockRejectedValue(new Error('Database error'));

      const result = await migrateGraph(uid, graphId);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Database error');
    });
  });

  describe('migrateTitleToName', () => {
    it('should migrate all graphs for a user', async () => {
      const { getFirestore } = require('../../config/firebaseAdmin');
      
      // Mock Firestore
      const mockSnapshot = {
        docs: [
          { id: 'graph-1' },
          { id: 'graph-2' },
        ],
      };
      const mockSelect = jest.fn(() => ({
        get: jest.fn().mockResolvedValue(mockSnapshot),
      }));
      const mockCollection = jest.fn(() => ({
        select: mockSelect,
      }));
      const mockDoc = jest.fn(() => ({
        collection: mockCollection,
      }));
      getFirestore.mockReturnValue({
        collection: jest.fn(() => ({
          doc: mockDoc,
        })),
      });

      // Mock graphs
      const graph1: NodeBasedKnowledgeGraph = {
        id: 'graph-1',
        seedConceptId: 'seed-1',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        nodes: {
          'graph-1': createGraphNode('graph-1', 'Graph', { id: 'graph-1' }),
          'goal-1': createGraphNode('goal-1', 'LearningGoal', {
            id: 'goal-1',
            title: 'Goal 1',
            description: 'Desc',
            type: 'skill',
            createdAt: Date.now(),
            updatedAt: Date.now(),
          }),
        },
        nodeTypes: {
          Graph: ['graph-1'],
          Concept: [],
          Layer: [],
          LearningGoal: ['goal-1'],
          Milestone: [],
          PracticeExercise: [],
          Lesson: [],
          ConceptMetadata: [],
          GraphMetadata: [],
          FlashCard: [],
        },
        relationships: [],
      };

      const graph2: NodeBasedKnowledgeGraph = {
        id: 'graph-2',
        seedConceptId: 'seed-1',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        nodes: {
          'graph-2': createGraphNode('graph-2', 'Graph', { id: 'graph-2' }),
          'milestone-1': createGraphNode('milestone-1', 'Milestone', {
            id: 'milestone-1',
            title: 'Milestone 1',
            completed: false,
          }),
        },
        nodeTypes: {
          Graph: ['graph-2'],
          Concept: [],
          Layer: [],
          LearningGoal: [],
          Milestone: ['milestone-1'],
          PracticeExercise: [],
          Lesson: [],
          ConceptMetadata: [],
          GraphMetadata: [],
          FlashCard: [],
        },
        relationships: [],
      };

      mockGetNodeBasedKnowledgeGraph
        .mockResolvedValueOnce(graph1)
        .mockResolvedValueOnce(graph2);

      const stats = await migrateTitleToName(uid);

      expect(stats.graphsProcessed).toBe(2);
      expect(stats.goalsMigrated).toBe(1);
      expect(stats.milestonesMigrated).toBe(1);
      expect(stats.layersMigrated).toBe(0);
      expect(stats.errors).toHaveLength(0);
    });

    it('should migrate specific graph when graphId provided', async () => {
      const graph: NodeBasedKnowledgeGraph = {
        id: graphId,
        seedConceptId: 'seed-1',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        nodes: {
          [graphId]: createGraphNode(graphId, 'Graph', { id: graphId }),
          'goal-1': createGraphNode('goal-1', 'LearningGoal', {
            id: 'goal-1',
            title: 'Test Goal',
            description: 'Test',
            type: 'skill',
            createdAt: Date.now(),
            updatedAt: Date.now(),
          }),
        },
        nodeTypes: {
          Graph: [graphId],
          Concept: [],
          Layer: [],
          LearningGoal: ['goal-1'],
          Milestone: [],
          PracticeExercise: [],
          Lesson: [],
          ConceptMetadata: [],
          GraphMetadata: [],
          FlashCard: [],
        },
        relationships: [],
      };

      mockGetNodeBasedKnowledgeGraph.mockResolvedValue(graph);

      const stats = await migrateTitleToName(uid, graphId);

      expect(stats.graphsProcessed).toBe(1);
      expect(stats.goalsMigrated).toBe(1);
      expect(stats.errors).toHaveLength(0);
    });

    it('should collect errors for failed migrations', async () => {
      const { getFirestore } = require('../../config/firebaseAdmin');
      
      const mockSnapshot = {
        docs: [
          { id: 'graph-1' },
          { id: 'graph-2' },
        ],
      };
      const mockSelect = jest.fn(() => ({
        get: jest.fn().mockResolvedValue(mockSnapshot),
      }));
      const mockCollection = jest.fn(() => ({
        select: mockSelect,
      }));
      const mockDoc = jest.fn(() => ({
        collection: mockCollection,
      }));
      getFirestore.mockReturnValue({
        collection: jest.fn(() => ({
          doc: mockDoc,
        })),
      });

      const graph1: NodeBasedKnowledgeGraph = {
        id: 'graph-1',
        seedConceptId: 'seed-1',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        nodes: {
          'graph-1': createGraphNode('graph-1', 'Graph', { id: 'graph-1' }),
        },
        nodeTypes: {
          Graph: ['graph-1'],
          Concept: [],
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

      mockGetNodeBasedKnowledgeGraph
        .mockResolvedValueOnce(graph1)
        .mockResolvedValueOnce(null);  // Second graph not found

      const stats = await migrateTitleToName(uid);

      expect(stats.graphsProcessed).toBe(2);
      expect(stats.errors).toHaveLength(1);
      expect(stats.errors[0].graphId).toBe('graph-2');
      expect(stats.errors[0].error).toContain('not found');
    });
  });
});

