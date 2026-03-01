/**
 * Tests for knowledgeGraphSlice
 */

import { configureStore } from '@reduxjs/toolkit';
import knowledgeGraphSlice, {
  setGraph,
  setGraphs,
  updateGraph,
  upsertNode,
  removeNode,
  upsertRelationship,
  removeRelationship,
  setCurrentGraphId,
  removeGraph,
  clearGraphs,
  setLoading,
  setError,
  clearError,
  selectAllGraphs,
  selectGraphById,
  selectCurrentGraph,
  selectCurrentGraphId,
  selectGraphsLoading,
  selectGraphsError,
  selectNodeById,
  selectNodesByType,
  selectRelationshipsByNode,
  type KnowledgeGraphState,
} from '../../../features/knowledge-graph/knowledgeGraphSlice';
import type {
  NodeBasedKnowledgeGraph,
  GraphNode,
  Relationship,
} from '../../../features/knowledge-graph/types';
import type { RootState } from '../../../app/store';

// Helper to create a test graph
const createTestGraph = (id: string, seedConceptId: string = 'seed-1'): NodeBasedKnowledgeGraph => ({
  id,
  seedConceptId,
  createdAt: Date.now(),
  updatedAt: Date.now(),
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

describe('knowledgeGraphSlice', () => {
  let store: ReturnType<typeof configureStore<{ knowledgeGraphs: KnowledgeGraphState }>>;

  beforeEach(() => {
    store = configureStore({
      reducer: {
        knowledgeGraphs: knowledgeGraphSlice,
      },
    });
  });

  describe('initial state', () => {
    it('should have correct initial state', () => {
      const state = store.getState().knowledgeGraphs;
      expect(state).toEqual({
        graphs: {},
        currentGraphId: null,
        isLoading: false,
        error: null,
        lastUpdated: null,
      });
    });
  });

  describe('setGraph', () => {
    it('should add a graph to the state', () => {
      const graph = createTestGraph('graph-1');
      store.dispatch(setGraph(graph));

      const state = store.getState().knowledgeGraphs;
      expect(state.graphs['graph-1']).toEqual(graph);
      expect(state.currentGraphId).toBe('graph-1');
      expect(state.lastUpdated).toBeDefined();
    });

    it('should set currentGraphId if it is null', () => {
      const graph = createTestGraph('graph-1');
      store.dispatch(setGraph(graph));

      const state = store.getState().knowledgeGraphs;
      expect(state.currentGraphId).toBe('graph-1');
    });

    it('should not change currentGraphId if it is already set', () => {
      const graph1 = createTestGraph('graph-1');
      const graph2 = createTestGraph('graph-2');

      store.dispatch(setGraph(graph1));
      store.dispatch(setGraph(graph2));

      const state = store.getState().knowledgeGraphs;
      expect(state.currentGraphId).toBe('graph-1');
    });
  });

  describe('setGraphs', () => {
    it('should add multiple graphs to the state', () => {
      const graph1 = createTestGraph('graph-1');
      const graph2 = createTestGraph('graph-2');
      store.dispatch(setGraphs([graph1, graph2]));

      const state = store.getState().knowledgeGraphs;
      expect(state.graphs['graph-1']).toEqual(graph1);
      expect(state.graphs['graph-2']).toEqual(graph2);
      expect(state.currentGraphId).toBe('graph-1');
    });

    it('should set currentGraphId to first graph if it is null', () => {
      const graph1 = createTestGraph('graph-1');
      const graph2 = createTestGraph('graph-2');
      store.dispatch(setGraphs([graph1, graph2]));

      const state = store.getState().knowledgeGraphs;
      expect(state.currentGraphId).toBe('graph-1');
    });
  });

  describe('updateGraph', () => {
    it('should update an existing graph', () => {
      const graph = createTestGraph('graph-1');
      store.dispatch(setGraph(graph));

      const beforeUpdate = Date.now();
      const updates = { seedConceptId: 'new-seed-id' };
      store.dispatch(updateGraph({ graphId: 'graph-1', updates }));
      const afterUpdate = Date.now();

      const state = store.getState().knowledgeGraphs;
      expect(state.graphs['graph-1'].seedConceptId).toBe('new-seed-id');
      expect(state.graphs['graph-1'].updatedAt).toBeGreaterThanOrEqual(beforeUpdate);
      expect(state.graphs['graph-1'].updatedAt).toBeLessThanOrEqual(afterUpdate);
      expect(state.lastUpdated).toBeDefined();
    });

    it('should not update a non-existent graph', () => {
      const updates = { updatedAt: 1234567890 };
      store.dispatch(updateGraph({ graphId: 'non-existent', updates }));

      const state = store.getState().knowledgeGraphs;
      expect(state.graphs['non-existent']).toBeUndefined();
    });
  });

  describe('upsertNode', () => {
    it('should add a node to a graph', () => {
      const graph = createTestGraph('graph-1');
      store.dispatch(setGraph(graph));

      const node = createTestNode('node-1', 'Concept');
      store.dispatch(upsertNode({ graphId: 'graph-1', node }));

      const state = store.getState().knowledgeGraphs;
      expect(state.graphs['graph-1'].nodes['node-1']).toEqual(node);
      expect(state.graphs['graph-1'].nodeTypes.Concept).toContain('node-1');
      expect(state.graphs['graph-1'].updatedAt).toBeDefined();
    });

    it('should update an existing node', () => {
      const graph = createTestGraph('graph-1');
      store.dispatch(setGraph(graph));

      const node1 = createTestNode('node-1', 'Concept', { name: 'Original' });
      store.dispatch(upsertNode({ graphId: 'graph-1', node: node1 }));

      const node2 = createTestNode('node-1', 'Concept', { name: 'Updated' });
      store.dispatch(upsertNode({ graphId: 'graph-1', node: node2 }));

      const state = store.getState().knowledgeGraphs;
      expect(state.graphs['graph-1'].nodes['node-1'].properties.name).toBe('Updated');
    });
  });

  describe('removeNode', () => {
    it('should remove a node from a graph', () => {
      const graph = createTestGraph('graph-1');
      const node = createTestNode('node-1', 'Concept');
      graph.nodes['node-1'] = node;
      graph.nodeTypes.Concept.push('node-1');
      store.dispatch(setGraph(graph));

      store.dispatch(removeNode({ graphId: 'graph-1', nodeId: 'node-1' }));

      const state = store.getState().knowledgeGraphs;
      expect(state.graphs['graph-1'].nodes['node-1']).toBeUndefined();
      expect(state.graphs['graph-1'].nodeTypes.Concept).not.toContain('node-1');
    });

    it('should remove relationships involving the node', () => {
      const graph = createTestGraph('graph-1');
      const node = createTestNode('node-1', 'Concept');
      graph.nodes['node-1'] = node;
      const rel = createTestRelationship('rel-1', 'node-1', 'node-2');
      graph.relationships.push(rel);
      store.dispatch(setGraph(graph));

      store.dispatch(removeNode({ graphId: 'graph-1', nodeId: 'node-1' }));

      const state = store.getState().knowledgeGraphs;
      expect(state.graphs['graph-1'].relationships).not.toContain(rel);
    });
  });

  describe('upsertRelationship', () => {
    it('should add a relationship to a graph', () => {
      const graph = createTestGraph('graph-1');
      store.dispatch(setGraph(graph));

      const rel = createTestRelationship('rel-1', 'node-1', 'node-2');
      store.dispatch(upsertRelationship({ graphId: 'graph-1', relationship: rel }));

      const state = store.getState().knowledgeGraphs;
      expect(state.graphs['graph-1'].relationships).toContain(rel);
    });

    it('should update an existing relationship', () => {
      const graph = createTestGraph('graph-1');
      const rel1 = createTestRelationship('rel-1', 'node-1', 'node-2');
      graph.relationships.push(rel1);
      store.dispatch(setGraph(graph));

      const rel2 = createTestRelationship('rel-1', 'node-1', 'node-3');
      store.dispatch(upsertRelationship({ graphId: 'graph-1', relationship: rel2 }));

      const state = store.getState().knowledgeGraphs;
      expect(state.graphs['graph-1'].relationships).toHaveLength(1);
      expect(state.graphs['graph-1'].relationships[0].target).toBe('node-3');
    });
  });

  describe('removeRelationship', () => {
    it('should remove a relationship from a graph', () => {
      const graph = createTestGraph('graph-1');
      const rel = createTestRelationship('rel-1', 'node-1', 'node-2');
      graph.relationships.push(rel);
      store.dispatch(setGraph(graph));

      store.dispatch(removeRelationship({ graphId: 'graph-1', relId: 'rel-1' }));

      const state = store.getState().knowledgeGraphs;
      expect(state.graphs['graph-1'].relationships).not.toContain(rel);
      expect(state.graphs['graph-1'].relationships).toHaveLength(0);
    });
  });

  describe('setCurrentGraphId', () => {
    it('should set the current graph ID', () => {
      store.dispatch(setCurrentGraphId('graph-1'));

      const state = store.getState().knowledgeGraphs;
      expect(state.currentGraphId).toBe('graph-1');
    });

    it('should allow setting to null', () => {
      store.dispatch(setCurrentGraphId('graph-1'));
      store.dispatch(setCurrentGraphId(null));

      const state = store.getState().knowledgeGraphs;
      expect(state.currentGraphId).toBeNull();
    });
  });

  describe('removeGraph', () => {
    it('should remove a graph from the state', () => {
      const graph = createTestGraph('graph-1');
      store.dispatch(setGraph(graph));
      store.dispatch(removeGraph('graph-1'));

      const state = store.getState().knowledgeGraphs;
      expect(state.graphs['graph-1']).toBeUndefined();
    });

    it('should reset currentGraphId if it was the removed graph', () => {
      const graph = createTestGraph('graph-1');
      store.dispatch(setGraph(graph));
      store.dispatch(removeGraph('graph-1'));

      const state = store.getState().knowledgeGraphs;
      expect(state.currentGraphId).toBeNull();
    });

    it('should set currentGraphId to first remaining graph if current was removed', () => {
      const graph1 = createTestGraph('graph-1');
      const graph2 = createTestGraph('graph-2');
      store.dispatch(setGraphs([graph1, graph2]));
      store.dispatch(setCurrentGraphId('graph-1'));
      store.dispatch(removeGraph('graph-1'));

      const state = store.getState().knowledgeGraphs;
      expect(state.currentGraphId).toBe('graph-2');
    });
  });

  describe('clearGraphs', () => {
    it('should remove all graphs', () => {
      const graph1 = createTestGraph('graph-1');
      const graph2 = createTestGraph('graph-2');
      store.dispatch(setGraphs([graph1, graph2]));
      store.dispatch(clearGraphs());

      const state = store.getState().knowledgeGraphs;
      expect(Object.keys(state.graphs)).toHaveLength(0);
      expect(state.currentGraphId).toBeNull();
    });
  });

  describe('setLoading', () => {
    it('should set loading state', () => {
      store.dispatch(setLoading(true));

      const state = store.getState().knowledgeGraphs;
      expect(state.isLoading).toBe(true);
    });
  });

  describe('setError', () => {
    it('should set error message', () => {
      store.dispatch(setError('Test error'));

      const state = store.getState().knowledgeGraphs;
      expect(state.error).toBe('Test error');
    });

    it('should allow setting error to null', () => {
      store.dispatch(setError('Test error'));
      store.dispatch(setError(null));

      const state = store.getState().knowledgeGraphs;
      expect(state.error).toBeNull();
    });
  });

  describe('clearError', () => {
    it('should clear error message', () => {
      store.dispatch(setError('Test error'));
      store.dispatch(clearError());

      const state = store.getState().knowledgeGraphs;
      expect(state.error).toBeNull();
    });
  });

  describe('selectors', () => {
    beforeEach(() => {
      const graph1 = createTestGraph('graph-1', 'seed-1');
      const graph2 = createTestGraph('graph-2', 'seed-2');
      const node1 = createTestNode('node-1', 'Concept');
      const node2 = createTestNode('node-2', 'Layer');
      graph1.nodes['node-1'] = node1;
      graph1.nodes['node-2'] = node2;
      graph1.nodeTypes.Concept.push('node-1');
      graph1.nodeTypes.Layer.push('node-2');
      const rel = createTestRelationship('rel-1', 'node-1', 'node-2');
      graph1.relationships.push(rel);

      store.dispatch(setGraphs([graph1, graph2]));
      store.dispatch(setCurrentGraphId('graph-1'));
    });

    it('selectAllGraphs should return all graphs as array', () => {
      const result = selectAllGraphs(store.getState() as RootState);
      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('graph-1');
      expect(result[1].id).toBe('graph-2');
    });

    it('selectGraphById should return the correct graph', () => {
      const result = selectGraphById(store.getState() as RootState, 'graph-1');
      expect(result?.id).toBe('graph-1');
    });

    it('selectGraphById should return null for non-existent graph', () => {
      const result = selectGraphById(store.getState() as RootState, 'non-existent');
      expect(result).toBeNull();
    });

    it('selectCurrentGraph should return the current graph', () => {
      const result = selectCurrentGraph(store.getState() as RootState);
      expect(result?.id).toBe('graph-1');
    });

    it('selectCurrentGraphId should return the current graph ID', () => {
      const result = selectCurrentGraphId(store.getState() as RootState);
      expect(result).toBe('graph-1');
    });

    it('selectGraphsLoading should return loading state', () => {
      const result = selectGraphsLoading(store.getState() as RootState);
      expect(result).toBe(false);
    });

    it('selectGraphsError should return error state', () => {
      const result = selectGraphsError(store.getState() as RootState);
      expect(result).toBeNull();
    });

    it('selectNodeById should return the correct node', () => {
      const result = selectNodeById(store.getState() as RootState, 'graph-1', 'node-1');
      expect(result?.id).toBe('node-1');
    });

    it('selectNodeById should return null for non-existent node', () => {
      const result = selectNodeById(store.getState() as RootState, 'graph-1', 'non-existent');
      expect(result).toBeNull();
    });

    it('selectNodesByType should return nodes of the specified type', () => {
      const result = selectNodesByType(store.getState() as RootState, 'graph-1', 'Concept');
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('node-1');
    });

    it('selectNodesByType should return empty array for non-existent graph', () => {
      const result = selectNodesByType(store.getState() as RootState, 'non-existent', 'Concept');
      expect(result).toHaveLength(0);
    });

    it('selectRelationshipsByNode should return relationships for a node', () => {
      const result = selectRelationshipsByNode(store.getState() as RootState, 'graph-1', 'node-1');
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('rel-1');
    });

    it('selectRelationshipsByNode should return empty array for node with no relationships', () => {
      const result = selectRelationshipsByNode(store.getState() as RootState, 'graph-1', 'node-2');
      expect(result).toHaveLength(1); // node-2 is the target of rel-1
    });
  });
});

