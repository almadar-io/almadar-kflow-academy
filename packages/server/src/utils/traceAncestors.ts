import { Concept, ConceptGraph } from '../types/concept';
import { getConcept } from './graph';

/**
 * Traces the parent chain from a concept all the way to the root/seed concept
 * @param graph - The concept graph
 * @param concept - Starting concept
 * @returns Array of ancestor concepts from the concept up to the root (seed), including the concept itself
 */
export function traceAncestorsToRoot(graph: ConceptGraph, concept: Concept): Concept[] {
  const ancestors: Concept[] = [concept];
  const visited = new Set<string>([concept.name]);
  
  let current: Concept | undefined = concept;
  
  // Traverse up the parent chain until we reach a root concept (no parents)
  while (current && current.parents.length > 0) {
    // Get the first parent (assuming a single root, but we'll take the first parent)
    const parentName = current.parents[0];
    
    // Avoid cycles
    if (visited.has(parentName)) {
      break;
    }
    
    const parent = getConcept(graph, parentName);
    if (parent) {
      ancestors.push(parent);
      visited.add(parentName);
      current = parent;
    } else {
      // Parent not found in graph, stop traversal
      break;
    }
  }
  
  return ancestors;
}

/**
 * Finds the root/seed concept (concept with no parents) in a concept's ancestor chain
 * @param graph - The concept graph
 * @param concept - Starting concept
 * @returns The root/seed concept, or undefined if not found
 */
export function findRootConcept(graph: ConceptGraph, concept: Concept): Concept | undefined {
  const ancestors = traceAncestorsToRoot(graph, concept);
  // The last ancestor should be the root (no parents)
  for (let i = ancestors.length - 1; i >= 0; i--) {
    if (ancestors[i].parents.length === 0) {
      return ancestors[i];
    }
  }
  // If no root found, return the concept itself if it has no parents
  return concept.parents.length === 0 ? concept : undefined;
}

