/**
 * Tests for Mutation Utilities (mutationUtils.ts)
 */

import { applyMutationsToGraph } from '../../../../features/knowledge-graph/redux/mutationUtils';
import type {
  NodeBasedKnowledgeGraph,
  GraphNode,
  Relationship,
  GraphMutation,
} from '../../../../features/knowledge-graph/types';

// Helper to create a test graph
const createTestGraph = (id: string, seedConceptId: string = 'seed-1'): NodeBasedKnowledgeGraph => ({
  id,
  seedConceptId,
  createdAt: Date.now(),
  updatedAt: Date.now() - 1000, // Set to 1 second ago to ensure mutations always have newer timestamps
  nodes: {},
  relationships: [],
  nodeTypes: {
    Graph: [],
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
});

// Helper to create a test node
const createTestNode = (
  id: string,
  type: string = 'Concept',
  properties: Record<string, any> = {}
): GraphNode => ({
  id,
  type: type as any,
  properties: { name: `Node ${id}`, ...properties },
  createdAt: Date.now(),
  updatedAt: Date.now(),
});

// Helper to create a test relationship
const createTestRelationship = (
  id: string,
  source: string,
  target: string,
  type: string = 'hasChild'
): Relationship => ({
  id,
  source,
  target,
  type: type as any,
  direction: 'forward',
  createdAt: Date.now(),
});

describe('applyMutationsToGraph', () => {
  describe('create_node mutation', () => {
    it('should create a new node', () => {
      const graph = createTestGraph('graph-1');
      const newNode = createTestNode('node-1', 'Concept');

      const mutation: GraphMutation = {
        type: 'create_node',
        node: newNode,
      };

      const result = applyMutationsToGraph(graph, [mutation]);

      expect(result.nodes['node-1']).toEqual(newNode);
      expect(result.nodeTypes.Concept).toContain('node-1');
      expect(result.updatedAt).toBeGreaterThan(graph.updatedAt);
    });

    it('should update node type index when creating a node', () => {
      const graph = createTestGraph('graph-1');
      const newNode = createTestNode('node-1', 'Layer');

      const mutation: GraphMutation = {
        type: 'create_node',
        node: newNode,
      };

      const result = applyMutationsToGraph(graph, [mutation]);

      expect(result.nodeTypes.Layer).toContain('node-1');
    });

    it('should not update node type index when updateIndex is false', () => {
      const graph = createTestGraph('graph-1');
      const newNode = createTestNode('node-1', 'Concept');

      const mutation: GraphMutation = {
        type: 'create_node',
        node: newNode,
        updateIndex: false,
      };

      const result = applyMutationsToGraph(graph, [mutation]);

      expect(result.nodes['node-1']).toEqual(newNode);
      expect(result.nodeTypes.Concept).not.toContain('node-1');
    });

    it('should handle creating multiple nodes', () => {
      const graph = createTestGraph('graph-1');
      const node1 = createTestNode('node-1', 'Concept');
      const node2 = createTestNode('node-2', 'Layer');

      const mutations: GraphMutation[] = [
        { type: 'create_node', node: node1 },
        { type: 'create_node', node: node2 },
      ];

      const result = applyMutationsToGraph(graph, mutations);

      expect(result.nodes['node-1']).toEqual(node1);
      expect(result.nodes['node-2']).toEqual(node2);
      expect(result.nodeTypes.Concept).toContain('node-1');
      expect(result.nodeTypes.Layer).toContain('node-2');
    });
  });

  describe('update_node mutation', () => {
    it('should update node properties', () => {
      const graph = createTestGraph('graph-1');
      const node = createTestNode('node-1', 'Concept', { name: 'Original' });
      node.updatedAt = Date.now() - 1000; // Set to 1 second ago to ensure updates have newer timestamps
      graph.nodes['node-1'] = node;

      const mutation: GraphMutation = {
        type: 'update_node',
        nodeId: 'node-1',
        properties: { name: 'Updated', description: 'New description' },
      };

      const result = applyMutationsToGraph(graph, [mutation]);

      expect(result.nodes['node-1'].properties.name).toBe('Updated');
      expect(result.nodes['node-1'].properties.description).toBe('New description');
      expect(result.nodes['node-1'].updatedAt).toBeGreaterThan(node.updatedAt);
      expect(result.updatedAt).toBeGreaterThan(graph.updatedAt);
    });

    it('should not update timestamp when updateTimestamp is false', () => {
      const graph = createTestGraph('graph-1');
      const node = createTestNode('node-1', 'Concept');
      const originalUpdatedAt = node.updatedAt;
      graph.nodes['node-1'] = node;

      const mutation: GraphMutation = {
        type: 'update_node',
        nodeId: 'node-1',
        properties: { name: 'Updated' },
        updateTimestamp: false,
      };

      const result = applyMutationsToGraph(graph, [mutation]);

      expect(result.nodes['node-1'].properties.name).toBe('Updated');
      expect(result.nodes['node-1'].updatedAt).toBe(originalUpdatedAt);
    });

    it('should return unchanged graph if node does not exist', () => {
      const graph = createTestGraph('graph-1');

      const mutation: GraphMutation = {
        type: 'update_node',
        nodeId: 'non-existent',
        properties: { name: 'Updated' },
      };

      const result = applyMutationsToGraph(graph, [mutation]);

      expect(result).toEqual(graph);
    });
  });

  describe('delete_node mutation', () => {
    it('should delete a node', () => {
      const graph = createTestGraph('graph-1');
      const node = createTestNode('node-1', 'Concept');
      graph.nodes['node-1'] = node;
      graph.nodeTypes.Concept.push('node-1');

      const mutation: GraphMutation = {
        type: 'delete_node',
        nodeId: 'node-1',
      };

      const result = applyMutationsToGraph(graph, [mutation]);

      expect(result.nodes['node-1']).toBeUndefined();
      expect(result.nodeTypes.Concept).not.toContain('node-1');
      expect(result.updatedAt).toBeGreaterThan(graph.updatedAt);
    });

    it('should delete relationships when deleting a node (cascade)', () => {
      const graph = createTestGraph('graph-1');
      const node1 = createTestNode('node-1', 'Concept');
      const node2 = createTestNode('node-2', 'Concept');
      graph.nodes['node-1'] = node1;
      graph.nodes['node-2'] = node2;

      const rel = createTestRelationship('rel-1', 'node-1', 'node-2');
      graph.relationships.push(rel);

      const mutation: GraphMutation = {
        type: 'delete_node',
        nodeId: 'node-1',
        cascade: true,
      };

      const result = applyMutationsToGraph(graph, [mutation]);

      expect(result.nodes['node-1']).toBeUndefined();
      expect(result.relationships).toHaveLength(0);
    });

    it('should not delete relationships when cascade is false', () => {
      const graph = createTestGraph('graph-1');
      const node1 = createTestNode('node-1', 'Concept');
      graph.nodes['node-1'] = node1;

      const rel = createTestRelationship('rel-1', 'node-1', 'node-2');
      graph.relationships.push(rel);

      const mutation: GraphMutation = {
        type: 'delete_node',
        nodeId: 'node-1',
        cascade: false,
      };

      const result = applyMutationsToGraph(graph, [mutation]);

      expect(result.nodes['node-1']).toBeUndefined();
      expect(result.relationships).toHaveLength(1);
    });

    it('should return unchanged graph if node does not exist', () => {
      const graph = createTestGraph('graph-1');

      const mutation: GraphMutation = {
        type: 'delete_node',
        nodeId: 'non-existent',
      };

      const result = applyMutationsToGraph(graph, [mutation]);

      expect(result).toEqual(graph);
    });
  });

  describe('create_relationship mutation', () => {
    it('should create a new relationship', () => {
      const graph = createTestGraph('graph-1');
      const rel = createTestRelationship('rel-1', 'node-1', 'node-2');

      const mutation: GraphMutation = {
        type: 'create_relationship',
        relationship: rel,
      };

      const result = applyMutationsToGraph(graph, [mutation]);

      expect(result.relationships).toHaveLength(1);
      expect(result.relationships[0]).toEqual(rel);
      expect(result.updatedAt).toBeGreaterThan(graph.updatedAt);
    });

    it('should not create duplicate relationships', () => {
      const graph = createTestGraph('graph-1');
      const rel = createTestRelationship('rel-1', 'node-1', 'node-2');
      graph.relationships.push(rel);

      const mutation: GraphMutation = {
        type: 'create_relationship',
        relationship: rel,
      };

      const result = applyMutationsToGraph(graph, [mutation]);

      expect(result.relationships).toHaveLength(1);
    });
  });

  describe('delete_relationship mutation', () => {
    it('should delete a relationship', () => {
      const graph = createTestGraph('graph-1');
      const rel = createTestRelationship('rel-1', 'node-1', 'node-2');
      graph.relationships.push(rel);

      const mutation: GraphMutation = {
        type: 'delete_relationship',
        relationshipId: 'rel-1',
      };

      const result = applyMutationsToGraph(graph, [mutation]);

      expect(result.relationships).toHaveLength(0);
      expect(result.updatedAt).toBeGreaterThan(graph.updatedAt);
    });
  });

  describe('update_node_type_index mutation', () => {
    it('should add a node to the type index', () => {
      const graph = createTestGraph('graph-1');

      const mutation: GraphMutation = {
        type: 'update_node_type_index',
        nodeType: 'Concept',
        nodeId: 'node-1',
        operation: 'add',
      };

      const result = applyMutationsToGraph(graph, [mutation]);

      expect(result.nodeTypes.Concept).toContain('node-1');
      expect(result.updatedAt).toBeGreaterThan(graph.updatedAt);
    });

    it('should remove a node from the type index', () => {
      const graph = createTestGraph('graph-1');
      graph.nodeTypes.Concept.push('node-1');

      const mutation: GraphMutation = {
        type: 'update_node_type_index',
        nodeType: 'Concept',
        nodeId: 'node-1',
        operation: 'remove',
      };

      const result = applyMutationsToGraph(graph, [mutation]);

      expect(result.nodeTypes.Concept).not.toContain('node-1');
    });
  });

  describe('multiple mutations', () => {
    it('should apply multiple mutations in order', () => {
      const graph = createTestGraph('graph-1');
      const node1 = createTestNode('node-1', 'Concept');
      const node2 = createTestNode('node-2', 'Concept');
      const rel = createTestRelationship('rel-1', 'node-1', 'node-2');

      const mutations: GraphMutation[] = [
        { type: 'create_node', node: node1 },
        { type: 'create_node', node: node2 },
        { type: 'create_relationship', relationship: rel },
        {
          type: 'update_node',
          nodeId: 'node-1',
          properties: { name: 'Updated' },
        },
      ];

      const result = applyMutationsToGraph(graph, mutations);

      expect(result.nodes['node-1']).toBeDefined();
      expect(result.nodes['node-2']).toBeDefined();
      expect(result.nodes['node-1'].properties.name).toBe('Updated');
      expect(result.relationships).toHaveLength(1);
      expect(result.nodeTypes.Concept).toContain('node-1');
      expect(result.nodeTypes.Concept).toContain('node-2');
    });

    it('should handle complex mutation sequences', () => {
      const graph = createTestGraph('graph-1');
      const node1 = createTestNode('node-1', 'Concept');
      const node2 = createTestNode('node-2', 'Layer');
      const rel = createTestRelationship('rel-1', 'node-1', 'node-2');

      // Create nodes and relationship
      graph.nodes['node-1'] = node1;
      graph.nodes['node-2'] = node2;
      graph.nodeTypes.Concept.push('node-1');
      graph.nodeTypes.Layer.push('node-2');
      graph.relationships.push(rel);

      const mutations: GraphMutation[] = [
        {
          type: 'update_node',
          nodeId: 'node-1',
          properties: { name: 'Updated Node 1' },
        },
        { type: 'delete_relationship', relationshipId: 'rel-1' },
        { type: 'delete_node', nodeId: 'node-2' },
      ];

      const result = applyMutationsToGraph(graph, mutations);

      expect(result.nodes['node-1'].properties.name).toBe('Updated Node 1');
      expect(result.nodes['node-2']).toBeUndefined();
      expect(result.relationships).toHaveLength(0);
      expect(result.nodeTypes.Layer).not.toContain('node-2');
    });
  });

  describe('immutability', () => {
    it('should not mutate the original graph', () => {
      const graph = createTestGraph('graph-1');
      const node = createTestNode('node-1', 'Concept');
      const originalUpdatedAt = graph.updatedAt;

      const mutation: GraphMutation = {
        type: 'create_node',
        node,
      };

      const result = applyMutationsToGraph(graph, [mutation]);

      expect(result).not.toBe(graph);
      expect(graph.nodes['node-1']).toBeUndefined();
      expect(graph.updatedAt).toBe(originalUpdatedAt);
    });

    it('should not mutate nested objects', () => {
      const graph = createTestGraph('graph-1');
      const node = createTestNode('node-1', 'Concept');
      graph.nodes['node-1'] = node;

      const mutation: GraphMutation = {
        type: 'update_node',
        nodeId: 'node-1',
        properties: { name: 'Updated' },
      };

      const result = applyMutationsToGraph(graph, [mutation]);

      expect(result.nodes['node-1']).not.toBe(graph.nodes['node-1']);
      expect(graph.nodes['node-1'].properties.name).toBe('Node node-1');
      expect(result.nodes['node-1'].properties.name).toBe('Updated');
    });
  });
});

