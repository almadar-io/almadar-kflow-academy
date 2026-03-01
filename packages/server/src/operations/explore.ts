import { Concept, OperationResult } from '../types/concept';
import { exploreSystemPrompt } from '../prompts';
import { callLLM, extractJSONArray } from '../services/llm';
import { validateConcept, normalizeConcept } from '../utils/validation';

/**
 * Generates related concepts (lateral exploration)
 * @param concept - Concept to explore around
 * @param diversity - Optional diversity parameter (default: "high")
 * @param seedConcept - Optional seed concept to anchor the prompt
 * @returns Array of related concepts (may not have direct parent-child relationship)
 */
export async function explore(
  concept: Concept,
  diversity: 'low' | 'medium' | 'high' = 'high',
  seedConcept?: Concept
): Promise<OperationResult> {
  // Validate input
  if (!validateConcept(concept)) {
    throw new Error('Invalid concept input for explore operation');
  }

  const seedInfo = seedConcept ? `This is part of the broader topic: "${seedConcept.name}". ` : '';

  // Use template strings directly with diversity hint
  const userPrompt = `${seedInfo}Generate 5–10 concepts related to "${concept.name}", including diverse ideas. Focus on ${diversity} diversity: include varied and creative related concepts. Include only: "name", "description". "parents" and "children" should be empty arrays []. Return JSON array only. Merge related if concept already exists.`;

  // Call LLM
  const response = await callLLM({
    systemPrompt: exploreSystemPrompt,
    userPrompt: userPrompt,
    temperature: diversity === 'high' ? 0.8 : diversity === 'medium' ? 0.7 : 0.6, // Higher temp for more diversity
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
    // For explore, set parents to the same as the explored concept (making them siblings)
    // If the explored concept has parents, siblings share the same parents
    normalized.parents = [...concept.parents];
    if (!Array.isArray(normalized.children)) {
      normalized.children = [];
    }
    return normalized;
  });

  // Validate all results
  for (const result of normalizedResults) {
    const conceptName = result.name || 'unknown';
    if (!validateConcept(result)) {
      throw new Error(`Invalid concept in explore result: ${conceptName}`);
    }
  }

  // Update parent concepts to include these as siblings in their children list
  const updatedConcepts: Concept[] = [];
  const siblingNames = normalizedResults.map(r => r.name);
  
  if (concept.parents.length > 0) {
    // If concept has parents, update each parent to include new siblings
    for (const parentName of concept.parents) {
      // Create updated parent with new siblings added to children
      // Include both the original concept and all new siblings
      // The merge logic will preserve existing children and union with new ones
      updatedConcepts.push({
        name: parentName,
        description: '', // Will be preserved by merge
        parents: [], // Will be preserved by merge
        children: [concept.name, ...siblingNames], // Add original concept and new siblings
      });
    }
  }
  // Note: If concept has no parents (root level), explored concepts are also root concepts
  // No need to update anything - they're naturally siblings at the root level

  // Return new sibling concepts and updated parent concepts (if any)
  return updatedConcepts.length > 0 ? [...normalizedResults, ...updatedConcepts] : normalizedResults;
}

