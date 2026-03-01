/**
 * Strategy 1: Layer Completeness Analysis
 * 
 * Analyzes if a generated layer is complete for achieving a milestone.
 * Uses LLM to identify missing concepts that are essential for the milestone.
 */

import { callLLM } from '../services/llm';
import { UNIFIED_ENRICHMENT_RESPONSE_PROMPT } from '../utils/enrichmentResponse';
import type {
  AnalyzeLayerCompletenessOptions,
  LayerCompletenessAnalysis,
  MissingConcept,
  MissingRelationship,
} from '../types/enrichment';

/**
 * Analyzes if a layer is complete for its target milestone.
 * 
 * @param options - Options including layer concepts, milestone, and learning goal
 * @returns Analysis result with missing concepts and completeness score
 */
export async function analyzeLayerCompleteness(
  options: AnalyzeLayerCompletenessOptions
): Promise<LayerCompletenessAnalysis> {
  const { layerConcepts, milestone, learningGoal, layerNumber, uid } = options;

  // Build concept list for prompt
  const conceptDescriptions = layerConcepts
    .map(c => `- ${c.name}${c.description ? `: ${c.description}` : ''}`)
    .join('\n');

  const systemPrompt = `You are an expert learning path analyzer. Your task is to evaluate if a generated layer of concepts is complete for achieving a specific learning milestone.

Key principles:
- Consider what a learner would actually need to build/achieve the milestone
- Identify missing concepts that are essential (not just nice-to-have)
- Identify missing relationships between concepts
- Provide a completeness score (0-1) based on how sufficient the concepts are
- Suggest concepts that should be added to make the layer complete
- Consider the learning goal context and target level

${UNIFIED_ENRICHMENT_RESPONSE_PROMPT}

Additional fields for this strategy (include in metadata):
- "isComplete": boolean (whether layer is complete)
- "completenessScore": number 0-1 (how complete the layer is)
- "suggestedAdditions": array of nice-to-have concepts (convert these to missingConcepts with lower priority)

Return ONLY the JSON object, no additional text.`;

  const userPrompt = `Analyze if this generated layer is complete for achieving the milestone.

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
1. Evaluate if the generated concepts are sufficient for the milestone
2. Identify missing concepts that are essential (add to missingConcepts array)
3. Identify missing relationships between concepts (add to missingRelationships array)
4. Consider what a learner would actually need to build/achieve this milestone
5. Suggest concepts that should be added to make the layer complete
6. Provide a completeness score (0-1) where 1 means fully complete (in metadata)

IMPORTANT: You MUST return missingConcepts and missingRelationships arrays (even if empty).
Convert any "suggestedAdditions" to missingConcepts entries.

Return the JSON object with your analysis.`;

  const response = await callLLM({
    systemPrompt,
    userPrompt,
    provider: 'deepseek',
    model: 'deepseek-chat',
    uid,
  });

  const content = response.content ?? '';
  if (!content.trim()) {
    throw new Error('Failed to analyze layer completeness: empty response from LLM');
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

  const missingRelationships: MissingRelationship[] = (analysis.missingRelationships || []).map((mr: any) => ({
    source: mr.source || '',
    target: mr.target || '',
    type: (mr.type || 'prerequisite') as 'prerequisite' | 'complementary' | 'sequential' | 'hierarchical',
    reason: mr.reason || '',
    strength: mr.strength,
  }));

  const result: LayerCompletenessAnalysis = {
    missingConcepts,
    missingRelationships,
    metadata: {
      isComplete: analysis.isComplete ?? false,
      completenessScore: Math.max(0, Math.min(1, analysis.completenessScore ?? 0)),
      suggestedAdditions: suggestedAdditions.map((sa: any) => ({
        concept: sa.concept || sa.name || '',
        reason: sa.reason || '',
        priority: (sa.priority || 'medium') as 'high' | 'medium' | 'low',
      })),
    },
  };

  return result;
}

