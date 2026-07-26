import { Concept, ExtendedConcept } from '../../types/concept';
import { refocusSystemPrompt } from '../../prompts';
import { callLLMJson } from '../../services/llm';
import type { JsonValue } from '@almadar/core';
import { validateExtendedConcept, normalizeConcept, validateConceptArray } from '../../utils/validation';

/**
 * Updates attention scores for concepts based on a goal
 * @param concepts - Array of concepts to refocus
 * @param goal - Learning goal or focus area
 * @param seedConcept - Optional seed concept to anchor the prompt
 * @returns Array of concepts with updated attention_score and importance
 */
export async function refocus(
  concepts: Concept[],
  goal: string,
  seedConcept?: Concept
): Promise<ExtendedConcept[]> {
  // Validate input
  if (!validateConceptArray(concepts) || concepts.length === 0) {
    throw new Error('Invalid concepts input for refocus operation');
  }

  if (!goal || typeof goal !== 'string' || goal.trim().length === 0) {
    throw new Error('Goal is required for refocus operation');
  }

  // Create concept list string with names and descriptions
  const conceptList = concepts.map(c => `${c.name}: ${c.description}`).join('; ');

  const seedInfo = seedConcept ? `This is part of the broader topic: "${seedConcept.name}". ` : '';

  // Use template strings directly
  const userPrompt = `${seedInfo}Given concepts: ${conceptList} and goal: "${goal.trim()}", update attention. Include only: "name", "attention_score" (number 0-1), "importance" ("low", "medium", or "high"), "description" (preserve existing), "parents" (preserve existing), "children" (preserve existing). Return JSON array only. Merge with existing nodes in your system.`;

  // Call LLM and parse JSON array
  let results: Array<Record<string, JsonValue>>;
  try {
    results = await callLLMJson<Array<Record<string, JsonValue>>>({
      systemPrompt: refocusSystemPrompt,
      userPrompt: userPrompt,
    });
  } catch (error) {
    throw new Error(`Failed to parse LLM response: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }

  // Create a map of existing concepts for merging
  const conceptMap = new Map<string, Concept>();
  concepts.forEach(c => conceptMap.set(c.name, c));

  // Normalize and merge results with existing concepts
  const normalizedResults: ExtendedConcept[] = results.map((item) => {
    const existing = typeof item.name === 'string' ? conceptMap.get(item.name) : undefined;
    const baseConcept = existing || normalizeConcept(item);

    const extended: ExtendedConcept = {
      ...baseConcept,
      attention_score: typeof item.attention_score === 'number'
        ? Math.max(0, Math.min(1, item.attention_score))
        : undefined,
      validation_score: typeof item.validation_score === 'number'
        ? Math.max(0, Math.min(1, item.validation_score))
        : undefined,
      importance: typeof item.importance === 'string' && ['low', 'medium', 'high'].includes(item.importance)
        ? item.importance as 'low' | 'medium' | 'high'
        : undefined,
    };

    // Preserve existing fields if not provided in response
    if (existing) {
      const description = typeof item.description === 'string' ? item.description : undefined;
      const parents = Array.isArray(item.parents) ? item.parents.filter((p): p is string => typeof p === 'string') : undefined;
      const children = Array.isArray(item.children) ? item.children.filter((c): c is string => typeof c === 'string') : undefined;
      extended.description = description || existing.description;
      extended.parents = parents || existing.parents;
      extended.children = children || existing.children;
    }

    return extended;
  });

  // Validate all results
  for (const result of normalizedResults) {
    const conceptName = result.name || 'unknown';
    if (!validateExtendedConcept(result)) {
      throw new Error(`Invalid extended concept in refocus result: ${conceptName}`);
    }
  }

  return normalizedResults;
}

