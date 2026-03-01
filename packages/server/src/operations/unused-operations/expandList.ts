import { Concept, OperationResult } from '../../types/concept';
import { expandListSystemPrompt } from '../../prompts';
import { callLLM, extractJSONArray } from '../../services/llm';
import { validateConcept, normalizeConcept, validateConceptArray } from '../../utils/validation';

/**
 * Generates new concepts based on multiple parent concepts
 * @param parents - Array of parent concepts
 * @param seedConcept - Optional seed concept to anchor the prompt
 * @returns Array of concepts with one or more parents from the input list
 */
export async function expandList(parents: Concept[], seedConcept?: Concept): Promise<OperationResult> {
  // Validate input
  if (!validateConceptArray(parents) || parents.length === 0) {
    throw new Error('Invalid parent concepts input for expandList operation');
  }

  // Create parent list string
  const parentNames = parents.map(p => p.name);
  const parentList = parentNames.join(', ');

  const seedInfo = seedConcept ? `This is part of the broader topic: "${seedConcept.name}". ` : '';

  // Use template strings directly
  const userPrompt = `${seedInfo}Generate new concepts based on the following parent list: ${parentList}. For each concept, include only these exact fields: "name", "description", "parents" (array with one or more parent names from the parent list), "children" (empty array []). Return JSON array only, no extra fields or prose.`;

  // Call LLM
  const response = await callLLM({
    systemPrompt: expandListSystemPrompt,
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
    // Ensure at least one parent from input list is present
    const hasValidParent = normalized.parents.some(p => parentNames.includes(p));
    if (!hasValidParent && normalized.parents.length === 0 && parentNames.length > 0) {
      // Add first parent if none exist
      normalized.parents.push(parentNames[0]);
    }
    // Ensure children is an array (empty for new concepts)
    if (!Array.isArray(normalized.children)) {
      normalized.children = [];
    }
    return normalized;
  });

  // Validate all results
  for (const result of normalizedResults) {
    const conceptName = result.name || 'unknown';
    if (!validateConcept(result)) {
      throw new Error(`Invalid concept in expandList result: ${conceptName}`);
    }
  }

  return normalizedResults;
}

