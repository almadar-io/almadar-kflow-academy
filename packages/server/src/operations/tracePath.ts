import { Concept, OperationResult } from '../types/concept';
import { tracePathSystemPrompt } from '../prompts';
import { callLLM, extractJSONArray } from '../services/llm';
import { validateConcept, normalizeConcept } from '../utils/validation';

/**
 * Generates an ordered learning path between two concepts
 * @param start - Starting concept
 * @param end - Ending concept
 * @param seedConcept - Optional seed concept to anchor the prompt
 * @returns Ordered array of concepts representing a learning path
 */
export async function tracePath(start: Concept, end: Concept, seedConcept?: Concept): Promise<OperationResult> {
  // Validate inputs
  if (!validateConcept(start) || !validateConcept(end)) {
    throw new Error('Invalid concepts input for tracePath operation');
  }

  if (start.name === end.name) {
    return [start]; // Path from a concept to itself
  }

  const seedInfo = seedConcept ? `This is part of the broader topic: "${seedConcept.name}". ` : '';

  // Use template strings directly
  const userPrompt = `${seedInfo}Generate an ordered learning path from "${start.name}" to "${end.name}". Include only: "name" for each concept in the path. Include "description", "parents", and "children" as empty/appropriate arrays. Return JSON array only. Keep nodes in path order.`;

  // Call LLM
  const response = await callLLM({
    systemPrompt: tracePathSystemPrompt,
    userPrompt: userPrompt,
  });

  // Extract and parse JSON array
  let results: any[];
  try {
    results = extractJSONArray(response.content);
  } catch (error) {
    throw new Error(`Failed to parse LLM response: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }

  // Normalize results first (without referencing normalizedResults in the map)
  const normalizedResults: Concept[] = results.map((item: any) => normalizeConcept(item));

  // Now establish sequential relationships in a second pass
  for (let i = 0; i < normalizedResults.length; i++) {
    const normalized = normalizedResults[i];
    if (i > 0) {
      // Add previous concept as parent
      const prevName = normalizedResults[i - 1]?.name || start.name;
      if (!normalized.parents.includes(prevName)) {
        normalized.parents.push(prevName);
      }
    } else {
      // First concept should link to start
      if (!normalized.parents.includes(start.name)) {
        normalized.parents.push(start.name);
      }
    }
  }

  // Ensure end concept is in the path or add it
  const lastConcept = normalizedResults[normalizedResults.length - 1];
  if (!lastConcept || lastConcept.name !== end.name) {
    const endConcept = normalizeConcept({ ...end });
    if (lastConcept && !endConcept.parents.includes(lastConcept.name)) {
      endConcept.parents.push(lastConcept.name);
    }
    normalizedResults.push(endConcept);
  }

  // Validate all results
  for (const result of normalizedResults) {
    const conceptName = result.name || 'unknown';
    if (!validateConcept(result)) {
      throw new Error(`Invalid concept in tracePath result: ${conceptName}`);
    }
  }

  return normalizedResults;
}

