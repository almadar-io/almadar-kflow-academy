import { Concept, OperationResult, ConceptGraph } from '../types/concept';
import { expandSystemPrompt } from '../prompts';
import { callLLM, extractJSONArray } from '../services/llm';
import { validateConcept, normalizeConcept } from '../utils/validation';
import { traceAncestorsToRoot, findRootConcept } from '../utils/traceAncestors';

/**
 * Generates 3-7 sub-concepts of the input concept
 * @param concept - Concept to expand
 * @param graph - Optional graph to trace parent chain and find seed concept
 * @returns Array of child concepts with parent relationship established
 */
export async function expand(concept: Concept, graph?: ConceptGraph): Promise<OperationResult> {
  // Validate input
  if (!validateConcept(concept)) {
    throw new Error('Invalid concept input for expand operation');
  }

  // Find seed concept (root) if graph is provided
  let seedConcept: Concept | undefined;
  let parentChainInfo = '';
  
  if (graph) {
    seedConcept = findRootConcept(graph, concept);
    if (seedConcept && seedConcept.name !== concept.name) {
      // Trace parent chain from concept to seed
      const ancestors = traceAncestorsToRoot(graph, concept);
      // Reverse to get path from seed to concept
      const chain = ancestors.reverse();
      const chainNames = chain.map(c => c.name);
      parentChainInfo = `Context: This concept is part of the topic "${seedConcept.name}". Parent chain: ${chainNames.join(' → ')}. `;
    }
  }

  // Build context information for the prompt
  const parentsInfo = concept.parents.length > 0 
    ? `Direct parent concepts: ${concept.parents.join(', ')}. `
    : '';
  const childrenInfo = concept.children.length > 0
    ? `Existing child concepts (do NOT generate these again): ${concept.children.join(', ')}. `
    : '';
  
  const seedInfo = seedConcept && seedConcept.name !== concept.name
    ? `This is part of the broader topic: "${seedConcept.name}". `
    : '';
  
  const isSeedConcept = seedConcept
    ? seedConcept.name === concept.name
    : concept.parents.length === 0;
  
  // Use template strings directly with full context
  const userPrompt = `Generate 3–7 foundational NEW sub-concepts of "${concept.name}" (Description: ${concept.description}). ${seedInfo}${parentChainInfo}${parentsInfo}${childrenInfo}For each NEW sub-concept, include only these exact fields: "name" (concept name), "description" (short explanation), "parents" (array containing "${concept.name}"), "children" (empty array []). Do NOT generate concepts that already exist in the children list. Return JSON array only, no text, no extra fields.`;

  // Call LLM
  const response = await callLLM({
    systemPrompt: expandSystemPrompt,
    userPrompt: userPrompt,
  });

  // Extract and parse JSON array
  let results: any[];
  try {
    results = extractJSONArray(response.content);
  } catch (error) {
    throw new Error(`Failed to parse LLM response: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }

  // Normalize and validate results
  const normalizedResults: Concept[] = results.map((item: any) => {
    const normalized = normalizeConcept(item);
    // Ensure parent relationship is established
    if (!normalized.parents.includes(concept.name)) {
      normalized.parents.push(concept.name);
    }
    // Ensure children is an array (empty for new concepts)
    if (!Array.isArray(normalized.children)) {
      normalized.children = [];
    }

    const matchingLayer = isSeedConcept ? 0 : concept.layer;
    if (matchingLayer !== undefined) {
      normalized.layer = matchingLayer;
    }

    return normalized;
  });

  // Validate all results
  for (const result of normalizedResults) {
    const conceptName = result.name || 'unknown';
    if (!validateConcept(result)) {
      throw new Error(`Invalid concept in expand result: ${conceptName}`);
    }
  }

  // Add new children to the parent's children array
  const updatedConcept: Concept = {
    ...concept,
    children: [...concept.children, ...normalizedResults.map(c => c.name)],
  };

  // Return both the new children and the updated parent concept
  // The caller should merge the updated parent into the graph
  return [...normalizedResults, updatedConcept];
}

