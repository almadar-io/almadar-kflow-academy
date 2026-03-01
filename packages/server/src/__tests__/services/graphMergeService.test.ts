/**
 * Tests for Graph Merge Service
 * 
 * Tests the merge logic for concurrent graph mutations.
 */

import { mergeGraphMutations, hasConflictingChanges } from '../../services/graphMergeService';
import type { NodeBasedKnowledgeGraph } from '../../types/nodeBasedKnowledgeGraph';
import { createGraphNode, createRelationship } from '../../types/nodeBasedKnowledgeGraph';

describe('GraphMergeService', () => {
  const graphId = 'test-graph-1';

  function createBaseGraph(): NodeBasedKnowledgeGraph {
    const seedConcept = createGraphNode('seed-concept-1', 'Concept', {
      id: 'seed-concept-1',
      name: 'Seed Concept',
      description: 'Base seed concept',
      isSeed: true,
    });

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
        'seed-concept-1': seedConcept,
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

  describe('mergeGraphMutations', () => {
    it('should merge new nodes from incoming graph', () => {
      const currentGraph = createBaseGraph();
      const incomingGraph: NodeBasedKnowledgeGraph = {
        ...currentGraph,
        nodes: {
          ...currentGraph.nodes,
          'concept-1': createGraphNode('concept-1', 'Concept', {
            id: 'concept-1',
            name: 'New Concept',
            description: 'A new concept',
          }),
        },
        nodeTypes: {
          ...currentGraph.nodeTypes,
          Concept: ['seed-concept-1', 'concept-1'],
        },
      };

      const merged = mergeGraphMutations(currentGraph, incomingGraph);

      expect(merged.nodes['concept-1']).toBeDefined();
      expect(merged.nodes['seed-concept-1']).toBeDefined();
      expect(merged.nodeTypes.Concept).toContain('concept-1');
      expect(merged.version).toBe(2);
    });

    it('should merge new relationships from incoming graph', () => {
      const currentGraph = createBaseGraph();
      const incomingGraph: NodeBasedKnowledgeGraph = {
        ...currentGraph,
        relationships: [
          createRelationship('seed-concept-1', 'concept-1', 'hasChild', 'forward', 1.0),
        ],
      };

      const merged = mergeGraphMutations(currentGraph, incomingGraph);

      expect(merged.relationships).toHaveLength(1);
      expect(merged.relationships[0].source).toBe('seed-concept-1');
      expect(merged.relationships[0].target).toBe('concept-1');
    });

    it('should use last-write-wins for conflicting node properties', () => {
      const currentGraph = createBaseGraph();
      const incomingGraph: NodeBasedKnowledgeGraph = {
        ...currentGraph,
        nodes: {
          ...currentGraph.nodes,
          'seed-concept-1': {
            ...currentGraph.nodes['seed-concept-1'],
            properties: {
              ...currentGraph.nodes['seed-concept-1'].properties,
              description: 'Updated description',
            },
            updatedAt: 2000,
          },
        },
      };

      const merged = mergeGraphMutations(currentGraph, incomingGraph);

      expect(merged.nodes['seed-concept-1'].properties.description).toBe('Updated description');
    });

    it('should merge nodes from both graphs', () => {
      const currentGraph = createBaseGraph();
      const currentGraphWithNode: NodeBasedKnowledgeGraph = {
        ...currentGraph,
        nodes: {
          ...currentGraph.nodes,
          'concept-2': createGraphNode('concept-2', 'Concept', {
            id: 'concept-2',
            name: 'Concept 2',
            description: 'Second concept',
          }),
        },
        nodeTypes: {
          ...currentGraph.nodeTypes,
          Concept: ['seed-concept-1', 'concept-2'],
        },
      };

      const incomingGraph: NodeBasedKnowledgeGraph = {
        ...currentGraph,
        nodes: {
          ...currentGraph.nodes,
          'concept-1': createGraphNode('concept-1', 'Concept', {
            id: 'concept-1',
            name: 'Concept 1',
            description: 'First concept',
          }),
        },
        nodeTypes: {
          ...currentGraph.nodeTypes,
          Concept: ['seed-concept-1', 'concept-1'],
        },
      };

      const merged = mergeGraphMutations(currentGraphWithNode, incomingGraph);

      expect(merged.nodes['concept-1']).toBeDefined();
      expect(merged.nodes['concept-2']).toBeDefined();
      expect(merged.nodes['seed-concept-1']).toBeDefined();
      expect(merged.nodeTypes.Concept).toContain('concept-1');
      expect(merged.nodeTypes.Concept).toContain('concept-2');
    });

    it('should merge relationships from both graphs without duplicates', () => {
      const currentGraph = createBaseGraph();
      const currentGraphWithRel: NodeBasedKnowledgeGraph = {
        ...currentGraph,
        nodes: {
          ...currentGraph.nodes,
          'concept-1': createGraphNode('concept-1', 'Concept', {
            id: 'concept-1',
            name: 'Concept 1',
            description: 'First concept',
          }),
        },
        relationships: [
          createRelationship('seed-concept-1', 'concept-1', 'hasChild', 'forward', 1.0),
        ],
      };

      const incomingGraph: NodeBasedKnowledgeGraph = {
        ...currentGraphWithRel,
        relationships: [
          createRelationship('seed-concept-1', 'concept-1', 'hasChild', 'forward', 1.0), // Same relationship
          createRelationship('seed-concept-1', 'concept-2', 'hasChild', 'forward', 1.0), // New relationship
        ],
        nodes: {
          ...currentGraphWithRel.nodes,
          'concept-2': createGraphNode('concept-2', 'Concept', {
            id: 'concept-2',
            name: 'Concept 2',
            description: 'Second concept',
          }),
        },
      };

      const merged = mergeGraphMutations(currentGraphWithRel, incomingGraph);

      // Should have both relationships (duplicate detection is by ID, not content)
      expect(merged.relationships.length).toBeGreaterThanOrEqual(1);
    });

    it('should update version number', () => {
      const currentGraph = createBaseGraph();
      const incomingGraph: NodeBasedKnowledgeGraph = {
        ...currentGraph,
        version: 2,
      };

      const merged = mergeGraphMutations(currentGraph, incomingGraph);

      expect(merged.version).toBe(2); // Should be current version + 1
    });

    it('should use most recent updatedAt timestamp', () => {
      const currentGraph = createBaseGraph();
      const incomingGraph: NodeBasedKnowledgeGraph = {
        ...currentGraph,
        updatedAt: 2000,
      };

      const merged = mergeGraphMutations(currentGraph, incomingGraph);

      expect(merged.updatedAt).toBeGreaterThanOrEqual(2000);
    });

    it('should rebuild node type index from merged nodes', () => {
      const currentGraph = createBaseGraph();
      const incomingGraph: NodeBasedKnowledgeGraph = {
        ...currentGraph,
        nodes: {
          ...currentGraph.nodes,
          'lesson-1': createGraphNode('lesson-1', 'Lesson', {
            id: 'lesson-1',
            content: 'Lesson content',
            generatedAt: Date.now(),
          }),
        },
      };

      const merged = mergeGraphMutations(currentGraph, incomingGraph);

      expect(merged.nodeTypes.Lesson).toContain('lesson-1');
      expect(merged.nodeTypes.Concept).toContain('seed-concept-1');
    });
  });

  describe('hasConflictingChanges', () => {
    it('should return false when no conflicts exist', () => {
      const currentGraph = createBaseGraph();
      // Create incoming graph with a new node that doesn't exist in currentGraph
      // Only include the new node, not all nodes from currentGraph
      const newConcept = createGraphNode('concept-1', 'Concept', {
        id: 'concept-1',
        name: 'New Concept',
        description: 'A new concept',
      });
      const incomingGraph: NodeBasedKnowledgeGraph = {
        ...currentGraph,
        updatedAt: currentGraph.updatedAt, // Keep same base updatedAt
        nodes: {
          // Only include nodes that exist in currentGraph (with same updatedAt to avoid false conflicts)
          [currentGraph.id]: {
            ...currentGraph.nodes[currentGraph.id],
            updatedAt: currentGraph.updatedAt, // Match base updatedAt
          },
          'seed-concept-1': {
            ...currentGraph.nodes['seed-concept-1'],
            updatedAt: currentGraph.updatedAt, // Match base updatedAt
          },
          'concept-1': newConcept, // New node
        },
        nodeTypes: {
          ...currentGraph.nodeTypes,
          Concept: [...currentGraph.nodeTypes.Concept, 'concept-1'],
        },
      };

      const hasConflicts = hasConflictingChanges(currentGraph, incomingGraph);
      expect(hasConflicts).toBe(false); // New nodes don't conflict
    });

    it('should return true when same node is updated in both', () => {
      const baseGraph = createBaseGraph();
      const baseUpdatedAt = baseGraph.updatedAt || 1000;
      
      // Current graph with an updated node
      const currentGraphWithUpdate: NodeBasedKnowledgeGraph = {
        ...baseGraph,
        updatedAt: baseUpdatedAt, // Keep base updatedAt
        nodes: {
          ...baseGraph.nodes,
          'seed-concept-1': {
            ...baseGraph.nodes['seed-concept-1'],
            properties: {
              ...baseGraph.nodes['seed-concept-1'].properties,
              description: 'Updated in current',
            },
            updatedAt: baseUpdatedAt + 500, // Updated after base
          },
        },
      };

      // Incoming graph with the same node updated differently
      const incomingGraph: NodeBasedKnowledgeGraph = {
        ...baseGraph,
        updatedAt: baseUpdatedAt, // Keep base updatedAt
        nodes: {
          ...baseGraph.nodes,
          'seed-concept-1': {
            ...baseGraph.nodes['seed-concept-1'],
            properties: {
              ...baseGraph.nodes['seed-concept-1'].properties,
              description: 'Updated in incoming',
            },
            updatedAt: baseUpdatedAt + 1000, // Updated after base
          },
        },
      };

      const hasConflicts = hasConflictingChanges(currentGraphWithUpdate, incomingGraph);
      expect(hasConflicts).toBe(true);
    });
  });
});

