import { Concept, OperationResult } from '../types/concept';
import { synthesizeSystemPrompt } from '../prompts';
import { callLLM, extractJSONArray } from '../services/llm';
import { validateConcept, normalizeConcept, validateConceptArray } from '../utils/validation';

/**
 * Generates hybrid concepts combining multiple parents
 * @param parents - Array of parent concepts to synthesize
 * @param seedConcept - Optional seed concept to anchor the prompt
 * @returns Array of concepts that combine aspects of all parents
 */
export async function synthesize(parents: Concept[], seedConcept?: Concept): Promise<OperationResult> {
  // Validate input
  if (!validateConceptArray(parents) || parents.length === 0) {
    throw new Error('Invalid parent concepts input for synthesize operation');
  }

  // Create parent names string
  const parentNames = parents.map(p => p.name);
  const parentsString = parentNames.join(', ');

  const seedInfo = seedConcept ? `This is part of the broader topic: "${seedConcept.name}". ` : '';

  // Use template strings directly
  const userPrompt = `${seedInfo}Generate hybrid concepts combining these parents: ${parentsString}. For each concept, include only: "name", "description", "parents" (array containing all input parent names), "children" (empty array []). Return as a JSON array only. Merge parents if concept already exists.`;

  // Call LLM
  const response = await callLLM({
    systemPrompt: synthesizeSystemPrompt,
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
    // Ignore LLM's parent suggestions - use ONLY the input parents
    normalized.parents = [...parentNames];
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
      throw new Error(`Invalid concept in synthesize result: ${conceptName}`);
    }
  }

  return normalizedResults;
}

