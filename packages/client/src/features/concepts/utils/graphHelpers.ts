import { Concept, ConceptGraph } from '../types';
import { Note } from '../../notes/types';

/**
 * Helper function to get all concepts from a graph as an array
 */
export const getConceptsArray = (graph: ConceptGraph | null): Concept[] => {
  if (!graph) return [];
  const concepts = Array.from(graph.concepts.values());
  const hasSequence = concepts.some(concept => concept.sequence !== undefined);

  if (!hasSequence) {
    return concepts;
  }

  return concepts
    .slice()
    .sort((a, b) => {
      if (a.sequence === undefined && b.sequence === undefined) return 0;
      if (a.sequence === undefined) return 1;
      if (b.sequence === undefined) return -1;
      return a.sequence - b.sequence;
    });
};

/**
 * Helper function to find a concept by ID in a graph
 */
export const findConceptById = (graph: ConceptGraph | null, id: string): Concept | undefined => {
  if (!graph) return undefined;
  return getConceptsArray(graph).find(c => c.id === id);
};

export const findSeedConcept = (graph: ConceptGraph | null): Concept | undefined => {
  if (!graph) return undefined;
  return getConceptsArray(graph).find(c => c.isSeed);
};

/**
 * Helper function to find a concept by name in a graph
 */
export const findConceptByName = (graph: ConceptGraph | null, name: string): Concept | undefined => {
  if (!graph) return undefined;
  return graph.concepts.get(name);
};

// Helper to generate a UUID (client-side)
export const generateUUID = (): string => {
    return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  };

/**
 * Checks if adding a concept as a child of another would create a circular dependency.
 * A circular dependency occurs when the target concept (or any of its descendants) is
 * already an ancestor of the dragged concept.
 * 
 * @param draggedConcept - The concept being dragged
 * @param targetConcept - The concept that would become the parent
 * @param conceptMap - Map of all concepts in the graph
 * @returns true if adding would create a cycle, false otherwise
 */
export const wouldCreateCircularDependency = (
  draggedConcept: Concept,
  targetConcept: Concept,
  conceptMap: Map<string, Concept>
): boolean => {
  // If dragging to itself, that's a cycle
  if (draggedConcept.name === targetConcept.name) {
    return true;
  }

  // Get all ancestors of the dragged concept (recursively)
  const getAncestors = (concept: Concept, visited: Set<string> = new Set()): Set<string> => {
    if (visited.has(concept.name)) {
      return visited; // Prevent infinite loops in case of existing cycles
    }
    visited.add(concept.name);

    // Add all parents and their ancestors
    concept.parents.forEach(parentName => {
      const parent = conceptMap.get(parentName);
      if (parent) {
        getAncestors(parent, visited);
      }
    });

    return visited;
  };

  // Get all ancestors of the dragged concept
  const draggedAncestors = getAncestors(draggedConcept);

  // Check if target concept is an ancestor of dragged concept
  if (draggedAncestors.has(targetConcept.name)) {
    return true;
  }

  // Get all descendants of the target concept (recursively)
  const getDescendants = (concept: Concept, visited: Set<string> = new Set()): Set<string> => {
    if (visited.has(concept.name)) {
      return visited; // Prevent infinite loops
    }
    visited.add(concept.name);

    // Add all children and their descendants
    concept.children.forEach(childName => {
      const child = conceptMap.get(childName);
      if (child) {
        getDescendants(child, visited);
      }
    });

    return visited;
  };

  // Get all descendants of the target concept
  const targetDescendants = getDescendants(targetConcept);

  // Check if any descendant of target is an ancestor of dragged concept
  const descendantArray = Array.from(targetDescendants);
  for (let i = 0; i < descendantArray.length; i++) {
    if (draggedAncestors.has(descendantArray[i])) {
      return true;
    }
  }

  return false;
};

export const convertConceptToNote = (concept: Concept, conceptMap?: Map<string, Concept>): Note => {
  const parentId = concept.parents.length > 0
    ? conceptMap?.get(concept.parents[0])?.id || concept.parents[0]
    : undefined;

  const childIds = concept.children.map(childName => {
    const childConcept = conceptMap?.get(childName);
    return childConcept?.id || childName;
  });

  return {
    id: concept.id || concept.name,
    title: concept.name,
    content: concept.description,
    createdAt: new Date(),
    updatedAt: new Date(),
    tags: concept.parents,
    parentId,
    children: childIds,
    level: concept.layer || 0,
    isExpanded: concept.isExpanded ?? false,
  };
};

export const buildGraphRecord = (concepts: Concept[]): Record<string, Concept> => {
  return concepts.reduce<Record<string, Concept>>((acc, concept) => {
    acc[concept.name] = concept;
    return acc;
  }, {});
};

const assignSequenceToLayer = (
  concepts: Concept[],
  conceptMap: Map<string, Concept>,
  visited: Set<string>,
  startSequence: number
) => {
  const orderedQueue: Concept[] = [];
  const parentLookup = new Map<string, string[]>();

  concepts.forEach(concept => {
    const parents = concept.parents ?? [];
    parentLookup.set(concept.name, parents);
  });

  concepts.forEach(concept => {
    const parents = parentLookup.get(concept.name) ?? [];
    const allParentsOutsideLayer = parents.every(parentName => {
      const parent = conceptMap.get(parentName);
      return !parent || parent.layer !== concept.layer;
    });

    if (allParentsOutsideLayer) {
      orderedQueue.push(concept);
    }
  });

  const queue = [...orderedQueue];
  const result: Concept[] = [];
  const layerConcepts = new Set(concepts.map(concept => concept.name));

  while (queue.length > 0) {
    const current = queue.shift()!;
    if (visited.has(current.name)) {
      continue;
    }
    visited.add(current.name);
    result.push(current);

    concepts
      .filter(concept => !visited.has(concept.name))
      .filter(concept =>
        (concept.parents ?? []).some(parentName => {
          const parent = conceptMap.get(parentName);
          return parent?.name === current.name && parent.layer === concept.layer;
        })
      )
      .forEach(child => queue.push(child));
  }

  concepts
    .filter(concept => !visited.has(concept.name))
    .forEach(concept => {
      result.push(concept);
      visited.add(concept.name);
    });

  let sequence = startSequence;
  result.forEach(concept => {
    const existing = conceptMap.get(concept.name);
    if (existing) {
      const updatedConcept: Concept = {
        ...existing,
        sequence,
      };
      conceptMap.set(concept.name, updatedConcept);
      sequence += 1;
    }
  });

  return sequence;
};

export const ensureSequenceForGraph = (graph: ConceptGraph): ConceptGraph => {
  const existingConcepts = Array.from(graph.concepts.values());
  const hasSequence = existingConcepts.some(concept => concept.sequence !== undefined);

  if (hasSequence) {
    return graph;
  }

  const conceptMap = new Map<string, Concept>();
  graph.concepts.forEach((concept, name) => {
    conceptMap.set(name, { ...concept });
  });

  const conceptsByLayer = new Map<number, Concept[]>();

  conceptMap.forEach(concept => {
    const layer = concept.layer ?? 0;
    if (!conceptsByLayer.has(layer)) {
      conceptsByLayer.set(layer, []);
    }
    conceptsByLayer.get(layer)!.push(concept);
  });

  const sortedLayers = Array.from(conceptsByLayer.keys()).sort((a, b) => a - b);
  let sequence = 0;
  const visited = new Set<string>();

  sortedLayers.forEach(layer => {
    const layerConcepts = conceptsByLayer.get(layer)!;
    sequence = assignSequenceToLayer(layerConcepts, conceptMap, visited, sequence);
  });

  return {
    ...graph,
    concepts: conceptMap,
  };
};

export const buildRelatedConcepts = (seed: Concept | null, allConcepts: Concept[]): Concept[] => {
  if (!seed) return [];
  const related: Concept[] = [seed];
  const visited = new Set<string>([seed.name]);

  const findChildren = (parentName: string) => {
    allConcepts.forEach(child => {
      if (child.parents.includes(parentName) && !visited.has(child.name)) {
        visited.add(child.name);
        related.push(child);
        findChildren(child.name);
      }
    });
  };

  findChildren(seed.name);
  return related;
};

export const getConceptRouteId = (concept: Concept): string => {
  const rawId = concept.id ?? concept.name;
  return encodeURIComponent(rawId);
};

/**
 * Creates a new concept graph structure from a seed concept payload
 * @param payload - The seed concept data (without id)
 * @param goalFocused - Whether the graph is goal-focused
 * @returns A new ConceptGraph with the seed concept
 */
export const createNewGraph = (
  payload: Omit<Concept, 'id'>,
  goalFocused?: boolean
): ConceptGraph => {
  // Create the seed concept
  const seedConcept: Concept = {
    ...payload,
    id: generateUUID(),
    isSeed: true,
    layer: 0,
  };

  // Create the concepts map
  const conceptsMap = new Map<string, Concept>();
  conceptsMap.set(seedConcept.name, seedConcept);

  // Create the graph structure
  const newGraph: ConceptGraph = {
    id: generateUUID(),
    seedConceptId: seedConcept.id,
    concepts: conceptsMap,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    goalFocused: goalFocused ?? false,
    difficulty: payload.difficulty,
    focus: payload.focus,
    name: seedConcept.name,
  };

  // Ensure sequence before returning
  return ensureSequenceForGraph(newGraph);
};