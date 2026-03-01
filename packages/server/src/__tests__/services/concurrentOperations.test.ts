/**
 * Integration Tests for Concurrent Graph Operations
 * 
 * Tests that concurrent operations correctly merge their changes.
 */

import { KnowledgeGraphAccessLayer } from '../../services/knowledgeGraphAccess/KnowledgeGraphAccessLayer';
import { GraphMutationService } from '../../services/graphMutationService';
import type { NodeBasedKnowledgeGraph } from '../../types/nodeBasedKnowledgeGraph';
import { createGraphNode, createRelationship } from '../../types/nodeBasedKnowledgeGraph';

// Mock the knowledge graph service
jest.mock('../../services/knowledgeGraphService', () => ({
  getNodeBasedKnowledgeGraph: jest.fn(),
  saveNodeBasedKnowledgeGraph: jest.fn(),
}));

jest.mock('../../config/firebaseAdmin', () => ({
  getFirestore: jest.fn(),
}));

describe('Concurrent Graph Operations', () => {
  const uid = 'test-user-1';
  const graphId = 'test-graph-1';
  let accessLayer: KnowledgeGraphAccessLayer;
  let mutationService: GraphMutationService;

  function createBaseGraph(): NodeBasedKnowledgeGraph {
    return {
      id: graphId,
      seedConceptId: 'seed-concept-1',
      createdAt: 1000,
      updatedAt: 1000,
      version: 1,
      nodes: {
        [graphId]: createGraphNode(graphId, 'Graph', {
          id: graphId,
          name: 'Test Graph',
          seedConceptId: 'seed-concept-1',
        }),
        'seed-concept-1': createGraphNode('seed-concept-1', 'Concept', {
          id: 'seed-concept-1',
          name: 'Seed Concept',
          description: 'Base seed concept',
          isSeed: true,
        }),
      },
      nodeTypes: {
        Graph: [graphId],
        Concept: ['seed-concept-1'],
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
  }

  beforeEach(() => {
    accessLayer = new KnowledgeGraphAccessLayer();
    mutationService = new GraphMutationService();
    jest.clearAllMocks();
  });

  it('should simulate concurrent expand and explain operations', async () => {
    const baseGraph = createBaseGraph();

    // Mock getGraph to return base graph initially
    const { getNodeBasedKnowledgeGraph } = require('../../services/knowledgeGraphService');
    getNodeBasedKnowledgeGraph.mockResolvedValue(baseGraph);

    // Mock saveGraph to simulate version conflicts and merging
    const { saveNodeBasedKnowledgeGraph } = require('../../services/knowledgeGraphService');
    let saveCallCount = 0;

    saveNodeBasedKnowledgeGraph.mockImplementation(
      async (
        uid: string,
        graph: NodeBasedKnowledgeGraph,
        expectedVersion?: number
      ) => {
        saveCallCount++;

        // Simulate first operation (expand) saving successfully
        if (saveCallCount === 1) {
          const savedGraph = {
            ...graph,
            version: 2,
            updatedAt: Date.now(),
          };
          // Update the mock to return this graph on next get
          getNodeBasedKnowledgeGraph.mockResolvedValue(savedGraph);
          return savedGraph;
        }

        // Simulate second operation (explain) detecting conflict and merging
        if (saveCallCount === 2 && expectedVersion === 1) {
          // Get current graph (with expand's changes)
          const currentGraph = await getNodeBasedKnowledgeGraph(uid, graphId);
          // Merge incoming changes with current
          const { mergeGraphMutations } = require('../../services/graphMergeService');
          const merged = mergeGraphMutations(currentGraph!, graph);
          return merged;
        }

        return graph;
      }
    );

    // Operation A: Expand - adds new concepts
    const graphA = await accessLayer.getGraph(uid, graphId);
    const concept1 = createGraphNode('concept-1', 'Concept', {
      id: 'concept-1',
      name: 'Concept 1',
      description: 'First concept',
    });
    const concept2 = createGraphNode('concept-2', 'Concept', {
      id: 'concept-2',
      name: 'Concept 2',
      description: 'Second concept',
    });

    const mutationsA = {
      mutations: [
        {
          type: 'create_node' as const,
          node: concept1,
          updateIndex: true,
        },
        {
          type: 'create_node' as const,
          node: concept2,
          updateIndex: true,
        },
      ],
      metadata: {
        operation: 'expand',
        timestamp: Date.now(),
      },
    };

    const { graph: updatedGraphA } = mutationService.applyMutationBatchSafe(
      graphA,
      mutationsA
    );

    // Operation B: Explain - adds lesson (starts before A completes)
    const graphB = await accessLayer.getGraph(uid, graphId); // Gets same base graph
    const lesson1 = createGraphNode('lesson-1', 'Lesson', {
      id: 'lesson-1',
      content: 'Lesson content',
      generatedAt: Date.now(),
    });

    const mutationsB = {
      mutations: [
        {
          type: 'create_node' as const,
          node: lesson1,
          updateIndex: true,
        },
        {
          type: 'create_relationship' as const,
          relationship: createRelationship(
            'seed-concept-1',
            'lesson-1',
            'hasLesson',
            'forward',
            1.0
          ),
        },
      ],
      metadata: {
        operation: 'explain',
        timestamp: Date.now(),
      },
    };

    const { graph: updatedGraphB } = mutationService.applyMutationBatchSafe(
      graphB,
      mutationsB
    );

    // Operation A saves first
    await accessLayer.saveGraph(
      uid,
      updatedGraphA,
      graphA.version
    );

    // Operation B saves second (should detect conflict and merge)
    const savedGraphB = await accessLayer.saveGraph(
      uid,
      updatedGraphB,
      graphB.version
    );

    // Verify both operations' changes are preserved
    expect(savedGraphB.nodes['concept-1']).toBeDefined();
    expect(savedGraphB.nodes['concept-2']).toBeDefined();
    expect(savedGraphB.nodes['lesson-1']).toBeDefined();
    expect(savedGraphB.nodes['seed-concept-1']).toBeDefined();

    // Verify relationships are preserved
    const hasLessonRel = savedGraphB.relationships.find(
      (r) => r.type === 'hasLesson' && r.target === 'lesson-1'
    );
    expect(hasLessonRel).toBeDefined();
  });

  it('should handle three concurrent operations', async () => {
    const baseGraph = createBaseGraph();
    const { getNodeBasedKnowledgeGraph, saveNodeBasedKnowledgeGraph } =
      require('../../services/knowledgeGraphService');

    let currentGraph = baseGraph;
    getNodeBasedKnowledgeGraph.mockImplementation(async () => currentGraph);

    saveNodeBasedKnowledgeGraph.mockImplementation(
      async (
        uid: string,
        graph: NodeBasedKnowledgeGraph,
        expectedVersion?: number
      ) => {
        if (expectedVersion !== undefined && currentGraph.version! > expectedVersion) {
          // Conflict detected - merge
          const { mergeGraphMutations } = require('../../services/graphMergeService');
          currentGraph = mergeGraphMutations(currentGraph, graph);
        } else {
          // No conflict
          currentGraph = {
            ...graph,
            version: (currentGraph.version || 0) + 1,
            updatedAt: Date.now(),
          };
        }
        return currentGraph;
      }
    );

    // All three operations start with same graph
    const graph1 = await accessLayer.getGraph(uid, graphId);
    const graph2 = await accessLayer.getGraph(uid, graphId);
    const graph3 = await accessLayer.getGraph(uid, graphId);

    // Operation 1: Add concept
    const concept1 = createGraphNode('concept-1', 'Concept', {
      id: 'concept-1',
      name: 'Concept 1',
    });
    const mutations1 = {
      mutations: [{ type: 'create_node' as const, node: concept1, updateIndex: true }],
      metadata: { operation: 'op1', timestamp: Date.now() },
    };
    const { graph: updated1 } = mutationService.applyMutationBatchSafe(
      graph1,
      mutations1
    );

    // Operation 2: Add lesson
    const lesson1 = createGraphNode('lesson-1', 'Lesson', {
      id: 'lesson-1',
      content: 'Lesson',
      generatedAt: Date.now(),
    });
    const mutations2 = {
      mutations: [{ type: 'create_node' as const, node: lesson1, updateIndex: true }],
      metadata: { operation: 'op2', timestamp: Date.now() },
    };
    const { graph: updated2 } = mutationService.applyMutationBatchSafe(
      graph2,
      mutations2
    );

    // Operation 3: Add practice
    const practice1 = createGraphNode('practice-1', 'PracticeExercise', {
      id: 'practice-1',
      type: 'question',
      question: 'Q?',
      answer: 'A',
    });
    const mutations3 = {
      mutations: [
        { type: 'create_node' as const, node: practice1, updateIndex: true },
      ],
      metadata: { operation: 'op3', timestamp: Date.now() },
    };
    const { graph: updated3 } = mutationService.applyMutationBatchSafe(
      graph3,
      mutations3
    );

    // All save (order matters for testing)
    const saved1 = await accessLayer.saveGraph(uid, updated1, graph1.version);
    const saved2 = await accessLayer.saveGraph(uid, updated2, graph2.version);
    const saved3 = await accessLayer.saveGraph(uid, updated3, graph3.version);
    
    // Verify all saves succeeded
    expect(saved1).toBeDefined();
    expect(saved2).toBeDefined();
    expect(saved3).toBeDefined();

    // Get final graph
    const finalGraph = await accessLayer.getGraph(uid, graphId);

    // All changes should be preserved
    expect(finalGraph.nodes['concept-1']).toBeDefined();
    expect(finalGraph.nodes['lesson-1']).toBeDefined();
    expect(finalGraph.nodes['practice-1']).toBeDefined();
  });
});

