/**
 * Find Missing Concepts for Layer
 * 
 * Analyzes a layer and identifies missing concepts needed to achieve a milestone.
 * Focuses only on finding missing concepts, not relationships.
 */

import { callLLM } from '../services/llm';
import { UNIFIED_ENRICHMENT_RESPONSE_PROMPT } from '../utils/enrichmentResponse';
import type {
  AnalyzeLayerCompletenessOptions,
  MissingConcept,
} from '../types/enrichment';

/**
 * Finds missing concepts needed for a layer to achieve its milestone.
 * 
 * @param options - Options including layer concepts, milestone, and learning goal
 * @returns Missing concepts array
 */
export async function findMissingConceptsForLayer(
  options: AnalyzeLayerCompletenessOptions
): Promise<{ missingConcepts: MissingConcept[]; prompt?: string }> {
  const { layerConcepts, milestone, learningGoal, layerNumber, uid } = options;

  // Build concept list for prompt
  const conceptDescriptions = layerConcepts
    .map(c => `- ${c.name}${c.description ? `: ${c.description}` : ''}`)
    .join('\n');

  const systemPrompt = `You are an expert learning path analyzer. Your task is to identify missing concepts that are essential for achieving a specific learning milestone.

Key principles:
- Consider what a learner would actually need to build/achieve the milestone
- Identify missing concepts that are essential (not just nice-to-have)
- Focus ONLY on missing concepts, NOT on relationships
- Consider the learning goal context and target level

${UNIFIED_ENRICHMENT_RESPONSE_PROMPT}

IMPORTANT: 
- Return ONLY missingConcepts array (relationships should be empty)
- All missing concepts should be assigned to the same layer as the milestone
- Provide clear reasons why each concept is needed

Return ONLY the JSON object, no additional text.`;

  const userPrompt = `Identify missing concepts needed for this layer to achieve the milestone.

Milestone: "${milestone.title}"
${milestone.description ? `Milestone Description: "${milestone.description}"` : ''}
Learning Goal: "${learningGoal.title}"
${learningGoal.description ? `Goal Description: "${learningGoal.description}"` : ''}
Goal Type: ${learningGoal.type}
${learningGoal.target ? `Target: ${learningGoal.target}` : ''}
${learningGoal.assessedLevel ? `Assessed Level: ${learningGoal.assessedLevel}` : ''}

Generated Concepts in Layer:
${conceptDescriptions}

Task:
1. Evaluate what concepts are needed to achieve this milestone
2. Identify missing concepts that are essential (add to missingConcepts array)
3. Consider what a learner would actually need to build/achieve this milestone
4. For each missing concept, explain why it's needed

IMPORTANT: You MUST return missingConcepts array (even if empty). Do NOT return missingRelationships.

Return the JSON object with your analysis.`;

  // Build full prompt for return
  const fullPrompt = `${systemPrompt}\n\n${userPrompt}`;

  const response = await callLLM({
    systemPrompt,
    userPrompt,
    provider: 'deepseek',
    model: 'deepseek-chat',
    uid,
  });

  const content = response.content ?? '';
  if (!content.trim()) {
    throw new Error('Failed to find missing concepts: empty response from LLM');
  }

  // Parse JSON response (LLM returns raw JSON, not typed)
  let analysis: any;

  try {
    // Try to extract JSON object
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      analysis = JSON.parse(jsonMatch[0]);
    } else {
      analysis = JSON.parse(content);
    }
  } catch (error) {
    throw new Error(`Failed to parse LLM response: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }

  // Validate and normalize to unified format
  // IMPORTANT: All suggestions should be added to the layer that corresponds to this milestone
  // Milestone and layer map one-to-one, so all missing concepts go to this layer
  const suggestedAdditions = analysis.suggestedAdditions || [];
  const missingConcepts: MissingConcept[] = [
    // Convert missingConcepts - ensure they're assigned to the correct layer
    ...(analysis.missingConcepts || []).map((mc: any) => ({
      name: mc.name || '',
      description: mc.description,
      reason: mc.reason || '',
      suggestedLayer: layerNumber, // Always use the layer number for this milestone
      prerequisites: mc.prerequisites || [],
      relationshipType: mc.relationshipType || 'prerequisite',
      priority: (mc.priority || 'medium') as 'high' | 'medium' | 'low',
      suggestedPlacement: 'same_layer' as const, // Always same layer since milestone maps to layer
    })),
    // Convert suggestedAdditions to missingConcepts (lower priority) - also assign to this layer
    ...suggestedAdditions.map((sa: any) => ({
      name: sa.concept || sa.name || '',
      description: sa.description,
      reason: sa.reason || '',
      suggestedLayer: layerNumber, // Always use the layer number for this milestone
      prerequisites: [],
      relationshipType: 'complementary' as const,
      priority: (sa.priority || 'medium') as 'high' | 'medium' | 'low',
      suggestedPlacement: 'same_layer' as const, // Always same layer since milestone maps to layer
    })),
  ];

  return {
    missingConcepts,
    prompt: fullPrompt,
  };
}


