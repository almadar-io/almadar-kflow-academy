import { Concept, ConceptGraph, ConceptGraphJSON } from '../types';

export interface ConceptState {
  graphs: ConceptGraph[];
  currentGraphId: string | null;
  selectedConcept: Concept | null;
  isLoading: boolean;
  error: string | null;
}

const CONCEPTS_STORAGE_KEY = 'kflow_concepts';

/**
 * Convert ConceptGraph to JSON-serializable format
 */
export const graphToJSON = (graph: ConceptGraph): ConceptGraphJSON => {
  const conceptsRecord: Record<string, Concept> = {};
  graph.concepts.forEach((concept, name) => {
    conceptsRecord[name] = concept;
  });
  
  // Convert layers Map to Record
  const layersRecord: Record<number, import('../types').LayerData> | undefined = graph.layers
    ? Object.fromEntries(graph.layers.entries())
    : undefined;
  
  const result: ConceptGraphJSON = {
    id: graph.id,
    seedConceptId: graph.seedConceptId,
    concepts: conceptsRecord,
    layers: layersRecord,
    createdAt: graph.createdAt,
    updatedAt: graph.updatedAt,
  };

  // Only include optional fields if they are defined
  if (graph.model !== undefined) {
    result.model = graph.model;
  }
  if (graph.goalFocused !== undefined) {
    result.goalFocused = graph.goalFocused;
  }
  if (graph.difficulty !== undefined) {
    result.difficulty = graph.difficulty;
  }
  if (graph.focus !== undefined) {
    result.focus = graph.focus;
  }

  return result;
};

/**
 * Convert JSON format back to ConceptGraph
 */
export const jsonToGraph = (json: ConceptGraphJSON): ConceptGraph => {
  const conceptsMap = new Map<string, Concept>();
  Object.entries(json.concepts).forEach(([name, concept]) => {
    conceptsMap.set(name, concept);
  });
  
  // Convert layers Record to Map
  const layersMap: Map<number, import('../types').LayerData> | undefined = json.layers
    ? new Map(Object.entries(json.layers).map(([key, value]) => [Number(key), value]))
    : undefined;
  
  return {
    id: json.id,
    seedConceptId: json.seedConceptId,
    concepts: conceptsMap,
    layers: layersMap,
    createdAt: json.createdAt,
    updatedAt: json.updatedAt,
    model: json.model,  // Include model when converting from JSON
    goalFocused: json.goalFocused,  // Include goalFocused when converting from JSON
    difficulty: json.difficulty,  // Include difficulty when converting from JSON
    focus: json.focus,  // Include focus when converting from JSON
  };
};

/**
 * Save concepts state to localStorage
 */
export const saveConceptsToLocalStorage = (state: ConceptState): void => {
  try {
    // Convert graphs to JSON format (Map -> Record)
    const graphsJSON = state.graphs.map(graphToJSON);
    
    const conceptsToSave = {
      graphs: graphsJSON,
      currentGraphId: state.currentGraphId,
      selectedConcept: state.selectedConcept,
    };
    localStorage.setItem(CONCEPTS_STORAGE_KEY, JSON.stringify(conceptsToSave));
  } catch (error) {
    console.error('Failed to save concepts to localStorage:', error);
  }
};

/**
 * Load concepts state from localStorage
 */
export const loadConceptsFromLocalStorage = (): Partial<ConceptState> | null => {
  try {
    const stored = localStorage.getItem(CONCEPTS_STORAGE_KEY);
    if (!stored) return null;
    
    const parsed = JSON.parse(stored);
    // Convert JSON graphs back to ConceptGraph format (Record -> Map)
    const graphs = (parsed.graphs || []).map(jsonToGraph);
    
    return {
      graphs,
      currentGraphId: parsed.currentGraphId || null,
      selectedConcept: parsed.selectedConcept || null,
    };
  } catch (error) {
    console.error('Failed to load concepts from localStorage:', error);
    return null;
  }
};

/**
 * Clear concepts from localStorage
 */
export const clearConceptsFromLocalStorage = (): void => {
  try {
    localStorage.removeItem(CONCEPTS_STORAGE_KEY);
  } catch (error) {
    console.error('Failed to clear concepts from localStorage:', error);
  }
};
