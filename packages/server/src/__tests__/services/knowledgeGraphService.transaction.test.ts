/**
 * Tests for Transaction-Based Graph Saving
 * 
 * Tests the transaction-based save functionality with version checking and merge logic.
 */

import { saveNodeBasedKnowledgeGraph } from '../../services/knowledgeGraphService';
import { getFirestore } from '../../config/firebaseAdmin';
import type { NodeBasedKnowledgeGraph } from '../../types/nodeBasedKnowledgeGraph';
import { createGraphNode } from '../../types/nodeBasedKnowledgeGraph';

// Mock Firestore
jest.mock('../../config/firebaseAdmin', () => ({
  getFirestore: jest.fn(),
}));

describe('saveNodeBasedKnowledgeGraph with Transactions', () => {
  const uid = 'test-user-1';
  const graphId = 'test-graph-1';

  let mockFirestore: any;
  let mockCollection: any;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Setup Firestore mock structure to handle nested collections
    // db.collection('users').doc(uid).collection('knowledgeGraphs').doc(graphId)
    const kgRef = {
      get: jest.fn(),
      set: jest.fn(),
    };
    
    const kgCollection = {
      doc: jest.fn(() => kgRef),
    };
    
    const userDoc = {
      collection: jest.fn(() => kgCollection),
    };
    
    const usersCollection = {
      doc: jest.fn(() => userDoc),
    };

    mockFirestore = {
      collection: jest.fn((name: string) => {
        if (name === 'users') {
          return usersCollection;
        }
        return mockCollection;
      }),
      runTransaction: jest.fn(),
    };

    (getFirestore as jest.Mock).mockReturnValue(mockFirestore);
  });

  function createTestGraph(version: number = 1): NodeBasedKnowledgeGraph {
    return {
      id: graphId,
      seedConceptId: 'seed-concept-1',
      createdAt: 1000,
      updatedAt: 1000,
      version,
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

  it('should save graph without version check on first save', async () => {
    const graph = createTestGraph(1);

    mockFirestore.runTransaction.mockImplementation(async (callback: any) => {
      const transaction = {
        get: jest.fn().mockImplementation(async (ref: any) => {
          return {
            exists: true,
            data: () => graph,
          };
        }),
        set: jest.fn(),
      };
      return callback(transaction);
    });

    const result = await saveNodeBasedKnowledgeGraph(uid, graph);

    expect(mockFirestore.runTransaction).toHaveBeenCalled();
    expect(result.version).toBe(2); // Incremented
  });

  it('should merge when version conflict is detected', async () => {
    const currentGraph = createTestGraph(2); // Current version in DB
    const incomingGraph = createTestGraph(1); // Incoming graph with old version

    // Add new node to incoming graph
    incomingGraph.nodes['concept-1'] = createGraphNode('concept-1', 'Concept', {
      id: 'concept-1',
      name: 'New Concept',
      description: 'A new concept',
    });
    incomingGraph.nodeTypes.Concept.push('concept-1');

    // Add new node to current graph (simulating concurrent modification)
    currentGraph.nodes['lesson-1'] = createGraphNode('lesson-1', 'Lesson', {
      id: 'lesson-1',
      content: 'Lesson content',
      generatedAt: Date.now(),
    });
    currentGraph.nodeTypes.Lesson.push('lesson-1');

    mockFirestore.runTransaction.mockImplementation(async (callback: any) => {
      const transaction = {
        get: jest.fn().mockImplementation(async (ref: any) => {
          return {
            exists: true,
            data: () => currentGraph,
          };
        }),
        set: jest.fn(),
      };
      return callback(transaction);
    });

    const result = await saveNodeBasedKnowledgeGraph(uid, incomingGraph, 1);

    expect(mockFirestore.runTransaction).toHaveBeenCalled();
    // Should have merged both nodes
    expect(result.nodes['concept-1']).toBeDefined();
    expect(result.nodes['lesson-1']).toBeDefined();
    expect(result.version).toBe(3); // Incremented from current version
  });

  it('should throw error if graph not found when expectedVersion is provided', async () => {
    const graph = createTestGraph(1);

    mockFirestore.runTransaction.mockImplementation(async (callback: any) => {
      const transaction = {
        get: jest.fn().mockImplementation(async (ref: any) => {
          return {
            exists: false,
          };
        }),
        set: jest.fn(),
      };
      return callback(transaction);
    });

    // If expectedVersion is provided but document doesn't exist, should throw error
    await expect(saveNodeBasedKnowledgeGraph(uid, graph, 1)).rejects.toThrow(
      `Graph ${graphId} not found (expected version 1)`
    );
  });

  it('should create graph if document does not exist and expectedVersion is undefined', async () => {
    const graph = createTestGraph(1);

    mockFirestore.runTransaction.mockImplementation(async (callback: any) => {
      const transaction = {
        get: jest.fn().mockImplementation(async (ref: any) => {
          return {
            exists: false,
          };
        }),
        set: jest.fn(),
      };
      return callback(transaction);
    });

    // If expectedVersion is undefined and document doesn't exist, should create it
    const result = await saveNodeBasedKnowledgeGraph(uid, graph);

    expect(mockFirestore.runTransaction).toHaveBeenCalled();
    expect(result.version).toBe(1); // First version
  });

  it('should handle transaction retries on conflict', async () => {
    const graph = createTestGraph(1);
    let attemptCount = 0;

    mockFirestore.runTransaction.mockImplementation(async (callback: any) => {
      attemptCount++;
      const transaction = {
        get: jest.fn().mockImplementation(async (ref: any) => {
          return {
            exists: true,
            data: () => ({
              ...graph,
              version: attemptCount === 1 ? 2 : 1, // First attempt sees updated version
            }),
          };
        }),
        set: jest.fn(),
      };
      return callback(transaction);
    });

    // Firestore automatically retries transactions
    const result = await saveNodeBasedKnowledgeGraph(uid, graph, 1);

    expect(mockFirestore.runTransaction).toHaveBeenCalled();
    expect(result).toBeDefined();
  });

  it('should increment version on each save', async () => {
    const graph = createTestGraph(5);

    mockFirestore.runTransaction.mockImplementation(async (callback: any) => {
      const transaction = {
        get: jest.fn().mockImplementation(async (ref: any) => {
          return {
            exists: true,
            data: () => graph,
          };
        }),
        set: jest.fn(),
      };
      return callback(transaction);
    });

    const result = await saveNodeBasedKnowledgeGraph(uid, graph, 5);

    expect(result.version).toBe(6);
  });

  it('should use updatedAt from incoming graph when no conflict', async () => {
    const graph = createTestGraph(1);
    graph.updatedAt = 2000;

    mockFirestore.runTransaction.mockImplementation(async (callback: any) => {
      const transaction = {
        get: jest.fn().mockImplementation(async (ref: any) => {
          return {
            exists: true,
            data: () => ({ ...graph, updatedAt: 1000 }),
          };
        }),
        set: jest.fn(),
      };
      return callback(transaction);
    });

    const result = await saveNodeBasedKnowledgeGraph(uid, graph);

    expect(result.updatedAt).toBeGreaterThanOrEqual(2000);
  });
});


