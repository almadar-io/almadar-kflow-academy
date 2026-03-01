import { Concept, OperationResult } from '../types/concept';
import { deriveSummarySystemPrompt } from '../prompts';
import { callLLM, extractJSONArray } from '../services/llm';
import { validateConcept, normalizeConcept, validateConceptArray } from '../utils/validation';

/**
 * Generates summary concepts for a layer of concepts
 * @param concepts - Array of concepts in a layer
 * @param seedConcept - Optional seed concept to anchor the prompt
 * @returns Array of 1-2 summary concepts
 */
export async function deriveSummary(concepts: Concept[], seedConcept?: Concept): Promise<OperationResult> {
  // Validate input
  if (!validateConceptArray(concepts) || concepts.length === 0) {
    throw new Error('Invalid concepts input for deriveSummary operation');
  }

  // Create layer concepts string with names and descriptions
  const layerConcepts = concepts.map(c => `${c.name}: ${c.description}`).join('; ');

  const seedInfo = seedConcept ? `This is part of the broader topic: "${seedConcept.name}". ` : '';

  // Use template strings directly
  const userPrompt = `${seedInfo}Given these layer concepts: ${layerConcepts}, generate 1–2 summary nodes. Include only: "name", "description", "parents" (array of representative concepts from the layer), "children" (empty array []). Return JSON array only. Merge with existing summary nodes if name matches.`;

  // Call LLM
  const response = await callLLM({
    systemPrompt: deriveSummarySystemPrompt,
    userPrompt: userPrompt,
  });

  // Extract and parse JSON array
  let results: any[];
  try {
    results = extractJSONArray(response.content);
  } catch (error) {
    throw new Error(`Failed to parse LLM response: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }

  // Limit to 2 summary concepts as specified
  const limitedResults = results.slice(0, 2);

  // Get concept names for parent references
  const conceptNames = concepts.map(c => c.name);

  // Determine the layer number from the input concepts
  // All concepts should have the same layer number (they're from the same layer)
  // If concepts have different layers, use the first one found
  // If no concepts have a layer, leave it undefined
  const layerNumber = concepts.find(c => c.layer !== undefined)?.layer;

  // Normalize and validate results
  const normalizedResults: Concept[] = limitedResults.map((item: any) => {
    const normalized = normalizeConcept(item);
    // Ensure summary concepts have representative layer concepts as parents
    // If LLM didn't specify parents, use all layer concepts
    if (normalized.parents.length === 0) {
      normalized.parents = [...conceptNames];
    } else {
      // Ensure all specified parents exist in the layer
      normalized.parents = normalized.parents.filter((p: string) => conceptNames.includes(p));
      // If filtering removed all parents, add all layer concepts
      if (normalized.parents.length === 0) {
        normalized.parents = [...conceptNames];
      }
    }
    // Ensure children is an array (empty for summary concepts)
    if (!Array.isArray(normalized.children)) {
      normalized.children = [];
    }
    // Set the layer number to match the summarized concepts' layer
    if (layerNumber !== undefined) {
      normalized.layer = layerNumber;
    }
    return normalized;
  });

  // Validate all results
  for (const result of normalizedResults) {
    const conceptName = result.name || 'unknown';
    if (!validateConcept(result)) {
      throw new Error(`Invalid concept in deriveSummary result: ${conceptName}`);
    }
  }

  return normalizedResults;
}

