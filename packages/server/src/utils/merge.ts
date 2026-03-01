import { Concept } from '../types/concept';

/**
 * Unions two string arrays, removing duplicates
 */
export function unionArrays(arr1: string[], arr2: string[]): string[] {
  const combined = [...arr1, ...arr2];
  return Array.from(new Set(combined));
}

/**
 * Merges two concepts by name
 * - Unions parents arrays (removes duplicates)
 * - Unions children arrays (removes duplicates)
 * - Preserves existing data (non-destructive merge)
 * - Preserves layer field (prefers incoming if provided, otherwise keeps existing)
 */
export function mergeConcepts(existing: Concept, incoming: Concept): Concept {
  if (existing.name !== incoming.name) {
    throw new Error(`Cannot merge concepts with different names: ${existing.name} vs ${incoming.name}`);
  }

  return {
    name: existing.name,
    description: existing.description || incoming.description, // Preserve existing, fallback to incoming
    parents: unionArrays(existing.parents, incoming.parents),
    children: unionArrays(existing.children, incoming.children),
    layer: incoming.layer !== undefined ? incoming.layer : existing.layer, // Prefer incoming layer, fallback to existing
    subLayer: incoming.subLayer !== undefined ? incoming.subLayer : existing.subLayer, // Prefer incoming subLayer, fallback to existing
    lesson: incoming.lesson !== undefined ? incoming.lesson : existing.lesson,
    sequence: incoming.sequence !== undefined ? incoming.sequence : existing.sequence,
  };
}

/**
 * Merges an array of concepts into a graph
 * Returns a map keyed by concept name
 */
export function mergeIntoGraph(
  graph: Map<string, Concept>,
  concepts: Concept[]
): Map<string, Concept> {
  const newGraph = new Map(graph);

  for (const concept of concepts) {
    const existing = newGraph.get(concept.name);
    if (existing) {
      newGraph.set(concept.name, mergeConcepts(existing, concept));
    } else {
      newGraph.set(concept.name, { ...concept });
    }
  }

  return newGraph;
}

