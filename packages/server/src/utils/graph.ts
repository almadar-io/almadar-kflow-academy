import { Concept, ConceptGraph } from '../types/concept';
import { mergeIntoGraph } from './merge';

/**
 * Creates an empty concept graph
 */
export function createGraph(): ConceptGraph {
  return {
    concepts: new Map<string, Concept>(),
  };
}

/**
 * Adds concepts to a graph (with merge logic)
 */
export function addConceptsToGraph(
  graph: ConceptGraph,
  concepts: Concept[]
): ConceptGraph {
  return {
    concepts: mergeIntoGraph(graph.concepts, concepts),
  };
}

/**
 * Retrieves a concept by name
 */
export function getConcept(graph: ConceptGraph, name: string): Concept | undefined {
  return graph.concepts.get(name);
}

/**
 * Gets all concepts in the graph
 */
export function getAllConcepts(graph: ConceptGraph): Concept[] {
  return Array.from(graph.concepts.values());
}

/**
 * Builds hierarchical structure from graph
 * Returns concepts in a hierarchical order (parents before children)
 */
export function buildHierarchy(graph: ConceptGraph): Concept[] {
  const concepts = getAllConcepts(graph);
  const visited = new Set<string>();
  const result: Concept[] = [];

  // Topological sort: process concepts with no parents first
  function processConcept(concept: Concept) {
    if (visited.has(concept.name)) {
      return;
    }

    // Process parents first if they exist in the graph
    for (const parentName of concept.parents) {
      const parent = getConcept(graph, parentName);
      if (parent && !visited.has(parentName)) {
        processConcept(parent);
      }
    }

    visited.add(concept.name);
    result.push(concept);
  }

  // Process all concepts
  for (const concept of concepts) {
    processConcept(concept);
  }

  return result;
}

export const topologicalSequence = (
  concepts: Concept[],
  dependencies: Map<string, Set<string>>,
  baseSequence: number
): Map<string, number> => {
  const generatedNames = new Set(concepts.map(concept => concept.name));
  const assignedSequence = new Map<string, number>();
  let sequenceCounter = baseSequence;
  const nextSequence = () => sequenceCounter++;

  const assignSequenceDFS = (conceptName: string, visitedLocal: Set<string>) => {
    if (!generatedNames.has(conceptName) || assignedSequence.has(conceptName)) {
      return;
    }
    if (visitedLocal.has(conceptName)) {
      return;
    }
    visitedLocal.add(conceptName);

    const parentSet = dependencies.get(conceptName) ?? new Set<string>();
    parentSet.forEach(parentName => {
      if (generatedNames.has(parentName)) {
        assignSequenceDFS(parentName, visitedLocal);
      }
    });

    assignedSequence.set(conceptName, nextSequence());
    visitedLocal.delete(conceptName);
  };

  concepts.forEach(concept => {
    const visitedLocal = new Set<string>();
    assignSequenceDFS(concept.name, visitedLocal);
  });

  return assignedSequence;
};

export const applySequenceToConcepts = (
  concepts: Concept[],
  assignedSequence: Map<string, number>
) => {
  concepts.forEach(concept => {
    const sequenceValue = assignedSequence.get(concept.name);
    if (sequenceValue !== undefined) {
      concept.sequence = sequenceValue;
    }
  });
};

/**
 * Builds a dependencies map for concepts, optionally validating parents against all concepts
 * @param concepts - Concepts to build dependencies for
 * @param allConcepts - Optional array of all concepts for parent validation
 * @returns Map of concept name to set of parent names
 */
function buildDependenciesMap(
  concepts: Concept[],
  allConcepts?: Concept[]
): Map<string, Set<string>> {
  const dependencies = new Map<string, Set<string>>();
  
  concepts.forEach(concept => {
    if (allConcepts) {
      // Only include parents that exist in allConcepts
      const validParents = new Set<string>(
        (concept.parents || []).filter(parentName => 
          allConcepts.some(c => c.name === parentName)
        )
      );
      dependencies.set(concept.name, validParents);
    } else {
      // Include all parents (no validation)
      const parentsSet = new Set<string>(concept.parents || []);
      dependencies.set(concept.name, parentsSet);
    }
  });
  
  return dependencies;
}

/**
 * Sorts concepts by their sequence property
 * @param concepts - Concepts to sort (mutated in place)
 */
function sortConceptsBySequence(concepts: Concept[]): void {
  concepts.sort((a, b) => {
    if (a.sequence === undefined && b.sequence === undefined) return 0;
    if (a.sequence === undefined) return 1;
    if (b.sequence === undefined) return -1;
    return a.sequence - b.sequence;
  });
}

/**
 * Applies topological sequence to concepts, optionally grouped by layer
 * @param concepts - Concepts to sequence
 * @param allConcepts - Optional array of all concepts for parent validation (if provided, validates parents)
 * @param baseSequence - Optional base sequence number (defaults to Date.now())
 * @param groupByLayer - Whether to group concepts by layer and sequence per layer (default: false)
 * @returns Map of layer number to concepts in that layer (if groupByLayer is true)
 */
export function applyTopologicalSequence(
  concepts: Concept[],
  allConcepts?: Concept[],
  baseSequence?: number,
  groupByLayer: boolean = false
): Map<number, Concept[]> | null {
  if (concepts.length === 0) {
    return null;
  }

  const sequenceBase = baseSequence ?? Date.now();

  if (groupByLayer && allConcepts) {
    // Group concepts by layer
    const conceptsByLayer = new Map<number, Concept[]>();
    concepts.forEach(concept => {
      const layer = concept.layer ?? 0;
      if (!conceptsByLayer.has(layer)) {
        conceptsByLayer.set(layer, []);
      }
      conceptsByLayer.get(layer)!.push(concept);
    });

    // Apply topological sequence per layer
    const sortedLayers = Array.from(conceptsByLayer.keys()).sort((a, b) => a - b);
    let currentBaseSequence = sequenceBase;

    sortedLayers.forEach(layer => {
      const layerConcepts = conceptsByLayer.get(layer)!;
      if (!layerConcepts || layerConcepts.length === 0) return;

      // Build dependencies for this layer (include cross-layer parents if they exist in allConcepts)
      const layerDependencies = buildDependenciesMap(layerConcepts, allConcepts);

      // Apply topological sequence to this layer
      const assignedSequence = topologicalSequence(layerConcepts, layerDependencies, currentBaseSequence);
      applySequenceToConcepts(layerConcepts, assignedSequence);

      // Update baseSequence for next layer (increment by layer size * 1000 to leave room)
      const maxSequenceInLayer = Math.max(
        ...Array.from(assignedSequence.values()),
        currentBaseSequence
      );
      currentBaseSequence = maxSequenceInLayer + 1000;
    });

    // Sort all concepts by sequence (topological order)
    sortConceptsBySequence(concepts);

    return conceptsByLayer;
  } else {
    // Apply topological sequence to all concepts at once (no layer grouping)
    const dependencies = buildDependenciesMap(concepts, allConcepts);
    const assignedSequence = topologicalSequence(concepts, dependencies, sequenceBase);
    applySequenceToConcepts(concepts, assignedSequence);
    sortConceptsBySequence(concepts);

    return null;
  }
}

/**
 * Second pass: Groups concepts with similar parents together while maintaining topological order
 * @param allConcepts - All concepts in the graph (already topologically sorted)
 * @param conceptsByLayer - Map of layer number to concepts in that layer
 * @param sortedLayers - Sorted array of layer numbers
 */
export function groupConceptsByParents(
  allConcepts: Concept[],
  conceptsByLayer: Map<number, Concept[]>,
  sortedLayers: number[]
): void {
  // Create a function to generate a parent key for grouping
  const getParentKey = (concept: Concept): string => {
    const validParents = (concept.parents || []).filter(parentName => 
      allConcepts.some(c => c.name === parentName)
    );
    // Sort parent names to ensure consistent grouping
    return validParents.sort().join('|') || 'no-parents';
  };
  
  // Group concepts by their parent sets within each layer
  sortedLayers.forEach(layer => {
    const layerConcepts = conceptsByLayer.get(layer)!;
    if (!layerConcepts || layerConcepts.length === 0) return;
    
    // Get concepts in this layer that are already sorted by topological order
    const sortedLayerConcepts = layerConcepts
      .filter(c => c.sequence !== undefined)
      .sort((a, b) => (a.sequence || 0) - (b.sequence || 0));
    
    // Group by parent key while maintaining topological order
    const parentGroups = new Map<string, Concept[]>();
    sortedLayerConcepts.forEach(concept => {
      const parentKey = getParentKey(concept);
      if (!parentGroups.has(parentKey)) {
        parentGroups.set(parentKey, []);
      }
      parentGroups.get(parentKey)!.push(concept);
    });
    
    // Re-assign sequences to group concepts with same parents together
    // Find the minimum sequence in this layer to use as base
    const minSequenceInLayer = Math.min(
      ...sortedLayerConcepts.map(c => c.sequence || 0)
    );
    
    let currentSequence = minSequenceInLayer;
    // Process groups in the order they first appear (maintain topological order)
    const processedConcepts = new Set<string>();
    sortedLayerConcepts.forEach(concept => {
      if (processedConcepts.has(concept.name)) return;
      
      const parentKey = getParentKey(concept);
      const group = parentGroups.get(parentKey)!;
      
      // Assign consecutive sequences to all concepts in this group
      group.forEach(groupConcept => {
        if (!processedConcepts.has(groupConcept.name)) {
          groupConcept.sequence = currentSequence++;
          processedConcepts.add(groupConcept.name);
        }
      });
    });
  });
  allConcepts.sort((a, b) => {
    if (a.sequence === undefined && b.sequence === undefined) return 0;
    if (a.sequence === undefined) return 1;
    if (b.sequence === undefined) return -1;
    return a.sequence - b.sequence;
  });
}

