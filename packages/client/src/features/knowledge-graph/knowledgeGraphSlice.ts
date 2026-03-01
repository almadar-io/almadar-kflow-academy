/**
 * Redux Slice for NodeBasedKnowledgeGraph
 * 
 * Manages state for knowledge graphs in the application
 */

import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { NodeBasedKnowledgeGraph, GraphNode, Relationship } from './types';
import type { RootState } from '../../app/store';

export interface KnowledgeGraphState {
  graphs: Record<string, NodeBasedKnowledgeGraph>; // Map of graphId -> graph
  currentGraphId: string | null; // ID of the currently active graph
  isLoading: boolean;
  error: string | null;
  lastUpdated: number | null; // Timestamp of last update
}

const initialState: KnowledgeGraphState = {
  graphs: {},
  currentGraphId: null,
  isLoading: false,
  error: null,
  lastUpdated: null,
};

const knowledgeGraphSlice = createSlice({
  name: 'knowledgeGraphs',
  initialState,
  reducers: {
    // Set a graph (add or replace)
    setGraph: (state, action: PayloadAction<NodeBasedKnowledgeGraph>) => {
      const graph = action.payload;
      state.graphs[graph.id] = graph;
      state.lastUpdated = Date.now();
      if (!state.currentGraphId) {
        state.currentGraphId = graph.id;
      }
    },

    // Set multiple graphs
    setGraphs: (state, action: PayloadAction<NodeBasedKnowledgeGraph[]>) => {
      action.payload.forEach(graph => {
        state.graphs[graph.id] = graph;
      });
      state.lastUpdated = Date.now();
      if (!state.currentGraphId && action.payload.length > 0) {
        state.currentGraphId = action.payload[0].id;
      }
    },

    // Update a graph (merge with existing)
    updateGraph: (
      state,
      action: PayloadAction<{ graphId: string; updates: Partial<NodeBasedKnowledgeGraph> }>
    ) => {
      const { graphId, updates } = action.payload;
      if (state.graphs[graphId]) {
        state.graphs[graphId] = {
          ...state.graphs[graphId],
          ...updates,
          updatedAt: Date.now(),
        };
        state.lastUpdated = Date.now();
      }
    },

    // Add or update a node in a graph
    upsertNode: (
      state,
      action: PayloadAction<{ graphId: string; node: GraphNode }>
    ) => {
      const { graphId, node } = action.payload;
      if (state.graphs[graphId]) {
        state.graphs[graphId].nodes[node.id] = node;
        state.graphs[graphId].updatedAt = Date.now();
        
        // Update nodeTypes index
        const nodeType = node.type;
        const nodeTypes = state.graphs[graphId].nodeTypes[nodeType];
        if (nodeTypes) {
          if (!nodeTypes.includes(node.id)) {
            nodeTypes.push(node.id);
          }
        } else {
          // Initialize array for optional node types
          (state.graphs[graphId].nodeTypes as any)[nodeType] = [node.id];
        }
        
        state.lastUpdated = Date.now();
      }
    },

    // Remove a node from a graph
    removeNode: (
      state,
      action: PayloadAction<{ graphId: string; nodeId: string }>
    ) => {
      const { graphId, nodeId } = action.payload;
      if (state.graphs[graphId]) {
        const node = state.graphs[graphId].nodes[nodeId];
        if (node) {
          // Remove from nodes
          delete state.graphs[graphId].nodes[nodeId];
          
          // Remove from nodeTypes index
          const nodeType = node.type;
          const nodeTypes = state.graphs[graphId].nodeTypes[nodeType];
          if (nodeTypes) {
            const index = nodeTypes.indexOf(nodeId);
            if (index > -1) {
              nodeTypes.splice(index, 1);
            }
          }
          
          // Remove relationships involving this node
          state.graphs[graphId].relationships = state.graphs[graphId].relationships.filter(
            rel => rel.source !== nodeId && rel.target !== nodeId
          );
          
          state.graphs[graphId].updatedAt = Date.now();
          state.lastUpdated = Date.now();
        }
      }
    },

    // Add or update a relationship in a graph
    upsertRelationship: (
      state,
      action: PayloadAction<{ graphId: string; relationship: Relationship }>
    ) => {
      const { graphId, relationship } = action.payload;
      if (state.graphs[graphId]) {
        const index = state.graphs[graphId].relationships.findIndex(
          rel => rel.id === relationship.id
        );
        if (index > -1) {
          state.graphs[graphId].relationships[index] = relationship;
        } else {
          state.graphs[graphId].relationships.push(relationship);
        }
        state.graphs[graphId].updatedAt = Date.now();
        state.lastUpdated = Date.now();
      }
    },

    // Remove a relationship from a graph
    removeRelationship: (
      state,
      action: PayloadAction<{ graphId: string; relId: string }>
    ) => {
      const { graphId, relId } = action.payload;
      if (state.graphs[graphId]) {
        state.graphs[graphId].relationships = state.graphs[graphId].relationships.filter(
          rel => rel.id !== relId
        );
        state.graphs[graphId].updatedAt = Date.now();
        state.lastUpdated = Date.now();
      }
    },

    // Set the current graph ID
    setCurrentGraphId: (state, action: PayloadAction<string | null>) => {
      state.currentGraphId = action.payload;
    },

    // Remove a graph
    removeGraph: (state, action: PayloadAction<string>) => {
      const graphId = action.payload;
      delete state.graphs[graphId];
      if (state.currentGraphId === graphId) {
        // Set current to first available graph or null
        const remainingGraphIds = Object.keys(state.graphs);
        state.currentGraphId = remainingGraphIds.length > 0 ? remainingGraphIds[0] : null;
      }
      state.lastUpdated = Date.now();
    },

    // Clear all graphs
    clearGraphs: (state) => {
      state.graphs = {};
      state.currentGraphId = null;
      state.lastUpdated = Date.now();
    },

    // Set loading state
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },

    // Set error state
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },

    // Clear error
    clearError: (state) => {
      state.error = null;
    },
  },
});

export const {
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
} = knowledgeGraphSlice.actions;

// Selectors (using RootState type - imported from app/store)
export const selectAllGraphs = (state: RootState) =>
  Object.values(state.knowledgeGraphs.graphs);

export const selectGraphById = (state: RootState, graphId: string) =>
  state.knowledgeGraphs.graphs[graphId] || null;

export const selectCurrentGraph = (state: RootState) => {
  const currentId = state.knowledgeGraphs.currentGraphId;
  return currentId ? state.knowledgeGraphs.graphs[currentId] || null : null;
};

export const selectCurrentGraphId = (state: RootState) =>
  state.knowledgeGraphs.currentGraphId;

export const selectGraphsLoading = (state: RootState) =>
  state.knowledgeGraphs.isLoading;

export const selectGraphsError = (state: RootState) =>
  state.knowledgeGraphs.error;

export const selectNodeById = (
  state: RootState,
  graphId: string,
  nodeId: string
) => {
  const graph = state.knowledgeGraphs.graphs[graphId];
  return graph?.nodes[nodeId] || null;
};

export const selectNodesByType = (
  state: RootState,
  graphId: string,
  nodeType: string
) => {
  const graph = state.knowledgeGraphs.graphs[graphId];
  if (!graph) return [];
  const nodeTypeArray = graph.nodeTypes[nodeType as keyof typeof graph.nodeTypes];
  if (!nodeTypeArray) return [];
  return nodeTypeArray
    .map(nodeId => graph.nodes[nodeId])
    .filter(Boolean);
};

export const selectRelationshipsByNode = (
  state: RootState,
  graphId: string,
  nodeId: string
) => {
  const graph = state.knowledgeGraphs.graphs[graphId];
  if (!graph) return [];
  return graph.relationships.filter(
    rel => rel.source === nodeId || rel.target === nodeId
  );
};

export default knowledgeGraphSlice.reducer;

