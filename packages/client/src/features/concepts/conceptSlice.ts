/**
 * @deprecated This Redux slice is deprecated. Use features/knowledge-graph/knowledgeGraphSlice instead.
 * This file contains the old concept state management and will be removed in a future version.
 * 
 * Migration guide:
 * - Use knowledgeGraphSlice instead of conceptSlice
 * - Use setCurrentGraphId from knowledgeGraphSlice instead of setCurrentGraph
 * - Use selectGraphById from knowledgeGraphSlice instead of selectCurrentGraph
 */

import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { Concept, ConceptGraph } from './types';
import { loadConceptsFromLocalStorage } from './utils/localStorage';
import { generateUUID, findConceptById } from './utils/graphHelpers';

export interface ConceptDiff {
  added: Concept[];
  updated: Concept[];
  deleted: Concept[];
}

interface ConceptState {
  graphs: ConceptGraph[];           // All concept graphs
  currentGraphId: string | null;    // ID of the currently active graph
  selectedConcept: Concept | null;  // Currently selected concept (for UI)
  isLoading: boolean;
  error: string | null;
  lastDiff: ConceptDiff | null;     // Last diff from addConcepts/removeConcept operations
}

// Load initial state from localStorage if available
const loadInitialState = (): ConceptState => {
  const stored = loadConceptsFromLocalStorage();
  if (stored) {
    return {
      graphs: stored.graphs || [],
      currentGraphId: stored.currentGraphId || null,
      selectedConcept: stored.selectedConcept || null,
      isLoading: false,
      error: null,
      lastDiff: null,
    };
  }
  return {
    graphs: [],
    currentGraphId: null,
    selectedConcept: null,
    isLoading: false,
    error: null,
    lastDiff: null,
  };
};

const initialState: ConceptState = loadInitialState();

const conceptSlice = createSlice({
  name: 'concepts',
  initialState,
  reducers: {
    // Create a new concept graph with a seed concept
    createConceptGraph: (state, action: PayloadAction<{ concept: Omit<Concept, 'id'>; goalFocused?: boolean }>) => {
      // Extract difficulty and focus from concept, but don't store them in the seed concept
      const { difficulty, focus, ...conceptWithoutDifficultyAndFocus } = action.payload.concept;
      
      const seedConcept: Concept = {
        ...conceptWithoutDifficultyAndFocus,
        id: generateUUID(),
        isSeed: true,
        layer: 0,
      };

      const conceptsMap = new Map<string, Concept>();
      conceptsMap.set(seedConcept.name, seedConcept);

      const newGraph: ConceptGraph = {
        id: generateUUID(),
        seedConceptId: seedConcept.id,
        concepts: conceptsMap,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        goalFocused: action.payload.goalFocused ?? false, // Default to false (not project-based)
        difficulty: difficulty, // Store in graph instead of seed concept
        focus: focus, // Store in graph instead of seed concept
        name: seedConcept.name,
      };

      state.graphs.push(newGraph);
      state.currentGraphId = newGraph.id;
      state.selectedConcept = seedConcept;
    },

    replaceGraphs: (
      state,
      action: PayloadAction<{
        graphs: ConceptGraph[];
        currentGraphId?: string | null;
        selectedConcept?: Concept | null;
      }>
    ) => {
      state.graphs = action.payload.graphs;
      const desiredGraphId = action.payload.currentGraphId ?? state.currentGraphId ?? null;

      state.currentGraphId = desiredGraphId;

      if (action.payload.selectedConcept !== undefined) {
        if (action.payload.selectedConcept && desiredGraphId) {
          const graph = state.graphs.find(g => g.id === desiredGraphId);
          const matchedConcept =
            graph?.concepts.get(action.payload.selectedConcept.name) ?? action.payload.selectedConcept;
          state.selectedConcept = matchedConcept;
        } else {
          state.selectedConcept = action.payload.selectedConcept || null;
        }
      } else if (desiredGraphId) {
        const graph = state.graphs.find(g => g.id === desiredGraphId);
        state.selectedConcept = graph ? findConceptById(graph, graph.seedConceptId) || null : null;
      } else {
        state.selectedConcept = null;
      }
    },

    // Add concepts to the current graph
    addConcepts: (state, action: PayloadAction<{ concepts: Concept[]; model?: string }>) => {
      if (!state.currentGraphId) return;

      const currentGraph = state.graphs.find(g => g.id === state.currentGraphId);
      if (!currentGraph) return;

      // Calculate diff: track added, updated concepts
      // Merge with existing diff to preserve deletions (important for operations like customOperation that do both)
      const existingDiff = state.lastDiff || { added: [], updated: [], deleted: [] };
      const diff: ConceptDiff = {
        added: [],
        updated: [],
        deleted: existingDiff.deleted, // Preserve existing deletions
      };

      action.payload.concepts.forEach(concept => {
        const existing = currentGraph.concepts.get(concept.name);
        if (existing) {
          // Union parents arrays (merge without duplicates)
          const mergedParents = Array.from(new Set([
            ...(existing.parents || []),
            ...(concept.parents || [])
          ]));
          
          // Union children arrays (merge without duplicates) - this is critical for preserving children
          const mergedChildren = Array.from(new Set([
            ...(existing.children || []),
            ...(concept.children || [])
          ]));
          
          const merged: Concept = {
            ...existing,
            ...concept,
            parents: mergedParents.length > 0 ? mergedParents : (concept.parents?.length ? concept.parents : existing.parents),
            children: mergedChildren.length > 0 ? mergedChildren : (concept.children?.length ? concept.children : existing.children),
            layer: concept.layer !== undefined ? concept.layer : existing.layer,
            subLayer: concept.subLayer !== undefined ? concept.subLayer : existing.subLayer,
            lesson: concept.lesson !== undefined ? concept.lesson : existing.lesson,
            flash: concept.flash !== undefined ? concept.flash : existing.flash,
            prerequisites: concept.prerequisites !== undefined ? concept.prerequisites : existing.prerequisites,
            isAutoGenerated: concept.isAutoGenerated !== undefined ? concept.isAutoGenerated : existing.isAutoGenerated,
            isPrerequisite: concept.isPrerequisite !== undefined ? concept.isPrerequisite : existing.isPrerequisite,
            sequence: concept.sequence !== undefined ? concept.sequence : existing.sequence, // Preserve sequence from new concept
          };
          
          // Check if concept was actually updated (not just a re-add with same values)
          const hasChanges = JSON.stringify(existing) !== JSON.stringify(merged);
          if (hasChanges) {
            diff.updated.push(merged);
          }
          
          currentGraph.concepts.set(concept.name, merged);
          if (state.selectedConcept && state.selectedConcept.name === concept.name) {
            state.selectedConcept = merged;
          }
        } else {
          // New concept
          diff.added.push(concept);
          currentGraph.concepts.set(concept.name, concept);
        }
      });

      // Update model if provided
      if (action.payload.model) {
        currentGraph.model = action.payload.model;
      }

      currentGraph.updatedAt = Date.now();
      
      // Store diff in state
      state.lastDiff = diff;
    },

    // Select a concept
    selectConcept: (state, action: PayloadAction<Concept | null>) => {
      state.selectedConcept = action.payload;
    },

    // Update a concept in the current graph
    updateConcept: (state, action: PayloadAction<Concept>) => {
      if (!state.currentGraphId) return;

      const currentGraph = state.graphs.find(g => g.id === state.currentGraphId);
      if (!currentGraph) return;

      currentGraph.concepts.set(action.payload.name, action.payload);
      currentGraph.updatedAt = Date.now();

      // Update selectedConcept if it matches the updated concept
      if (state.selectedConcept && state.selectedConcept.name === action.payload.name) {
        state.selectedConcept = action.payload;
      }
    },

    // Set current graph
    setCurrentGraph: (state, action: PayloadAction<string>) => {
      const graph = state.graphs.find(g => g.id === action.payload);
      if (graph) {
        state.currentGraphId = action.payload;
        const seedConcept = findConceptById(graph, graph.seedConceptId);
        state.selectedConcept = seedConcept || null;
      }
    },

    // Update layer data (e.g., practice exercises)
    updateLayerData: (state, action: PayloadAction<{ layerNumber: number; layerData: Partial<import('./types').LayerData> }>) => {
      if (!state.currentGraphId) return;

      const currentGraph = state.graphs.find(g => g.id === state.currentGraphId);
      if (!currentGraph) return;

      if (!currentGraph.layers) {
        currentGraph.layers = new Map();
      }

      const existingLayer = currentGraph.layers.get(action.payload.layerNumber);
      currentGraph.layers.set(action.payload.layerNumber, {
        layerNumber: action.payload.layerNumber,
        prompt: existingLayer?.prompt || '',
        response: existingLayer?.response || '',
        goal: existingLayer?.goal,
        conceptIds: existingLayer?.conceptIds || [],
        practiceExercises: existingLayer?.practiceExercises,
        ...action.payload.layerData, // Merge new layer data
      });

      currentGraph.updatedAt = Date.now();
    },

    // Remove a concept from the current graph
    removeConcept: (state, action: PayloadAction<{ conceptId: string }>) => {
      if (!state.currentGraphId) return;

      const currentGraph = state.graphs.find(g => g.id === state.currentGraphId);
      if (!currentGraph) return;

      // Find concept by id or name
      let conceptToRemove: Concept | undefined;
      const conceptsArray = Array.from(currentGraph.concepts.values());
      for (const concept of conceptsArray) {
        if (concept.id === action.payload.conceptId || concept.name === action.payload.conceptId) {
          conceptToRemove = concept;
          break;
        }
      }

      if (conceptToRemove) {
        // Merge deletion with existing diff (important for operations like customOperation that do both)
        const existingDiff = state.lastDiff || { added: [], updated: [], deleted: [] };
        const diff: ConceptDiff = {
          added: existingDiff.added,
          updated: existingDiff.updated,
          deleted: [...existingDiff.deleted, conceptToRemove],
        };
        state.lastDiff = diff;

        // Remove the concept
        currentGraph.concepts.delete(conceptToRemove.name);
        
        // Remove from selectedConcept if it matches
        if (state.selectedConcept && (state.selectedConcept.id === action.payload.conceptId || state.selectedConcept.name === action.payload.conceptId)) {
          state.selectedConcept = null;
        }

        // Remove from parent's children arrays
        conceptToRemove.parents.forEach(parentName => {
          const parent = currentGraph.concepts.get(parentName);
          if (parent) {
            parent.children = parent.children.filter(childName => childName !== conceptToRemove!.name);
          }
        });

        // Remove from children's parents arrays
        conceptToRemove.children.forEach(childName => {
          const child = currentGraph.concepts.get(childName);
          if (child) {
            child.parents = child.parents.filter(parentName => parentName !== conceptToRemove!.name);
          }
        });

        currentGraph.updatedAt = Date.now();
      }
    },

    // Delete a graph
    deleteGraph: (state, action: PayloadAction<string>) => {
      state.graphs = state.graphs.filter(g => g.id !== action.payload);
      if (state.currentGraphId === action.payload) {
        state.currentGraphId = state.graphs.length > 0 ? state.graphs[0].id : null;
        if (state.currentGraphId) {
          const currentGraph = state.graphs.find(g => g.id === state.currentGraphId);
          const seedConcept = currentGraph 
            ? findConceptById(currentGraph, currentGraph.seedConceptId) || null
            : null;
          state.selectedConcept = seedConcept;
        } else {
          state.selectedConcept = null;
        }
      }
    },

    // Set loading state
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },

    // Set error state
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },

    // Load concepts from storage (used on app initialization)
    loadConceptsFromStorage: (state) => {
      const stored = loadConceptsFromLocalStorage();
      if (stored) {
        state.graphs = stored.graphs || [];
        state.currentGraphId = stored.currentGraphId || null;
        state.selectedConcept = stored.selectedConcept || null;
      }
    },
  },
});

export const {
  createConceptGraph,
  addConcepts,
  selectConcept,
  updateConcept,
  removeConcept,
  setCurrentGraph,
  deleteGraph,
  setLoading,
  setError,
  loadConceptsFromStorage,
  replaceGraphs,
  updateLayerData,
} = conceptSlice.actions;

export default conceptSlice.reducer;

// Selectors
export const selectLastDiff = (state: { concepts: ConceptState }): ConceptDiff | null => {
  return state.concepts.lastDiff;
};
