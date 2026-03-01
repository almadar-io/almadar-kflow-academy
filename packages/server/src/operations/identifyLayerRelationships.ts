/**
 * Identify Layer Relationships
 * 
 * Analyzes a layer and identifies missing relationships between concepts.
 * Focuses only on relationships, not missing concepts.
 */

import { callLLM } from '../services/llm';
import { UNIFIED_ENRICHMENT_RESPONSE_PROMPT } from '../utils/enrichmentResponse';
import type {
  AnalyzeLayerCompletenessOptions,
  MissingRelationship,
} from '../types/enrichment';

/**
 * Identifies missing relationships between concepts in a layer.
 * 
 * @param options - Options including layer concepts, milestone, and learning goal
 * @returns Missing relationships array
 */
export async function identifyLayerRelationships(
  options: AnalyzeLayerCompletenessOptions
): Promise<{ missingRelationships: MissingRelationship[]; prompt?: string }> {
  const { layerConcepts, milestone, learningGoal, uid } = options;

  // Build concept list for prompt
  const conceptDescriptions = layerConcepts
    .map(c => `- ${c.name}${c.description ? `: ${c.description}` : ''}`)
    .join('\n');

  // Build existing relationships context
  const existingRelationships = layerConcepts
    .flatMap(concept => {
      const rels: string[] = [];
      // Parent relationships
      concept.parents.forEach(parent => {
        rels.push(`${parent} → ${concept.name} (hierarchical)`);
      });
      // Child relationships
      concept.children.forEach(child => {
        rels.push(`${concept.name} → ${child} (hierarchical)`);
      });
      // Prerequisite relationships
      (concept.prerequisites || []).forEach(prereq => {
        rels.push(`${prereq} → ${concept.name} (prerequisite)`);
      });
      return rels;
    })
    .join('\n') || 'None';

  const systemPrompt = `You are an expert learning path analyzer. Your task is to identify missing relationships between concepts in a layer that would help achieve a learning milestone.

Key principles:
- Focus ONLY on missing relationships, NOT on missing concepts
- Identify relationships that would improve learning flow
- Consider prerequisite, complementary, sequential, and hierarchical relationships
- Consider the learning goal context and target level

${UNIFIED_ENRICHMENT_RESPONSE_PROMPT}

IMPORTANT: 
- Return ONLY missingRelationships array (missingConcepts should be empty)
- Identify relationships that would help learners achieve the milestone
- Consider both relationships between existing concepts and relationships involving concepts that might be added later

Return ONLY the JSON object, no additional text.`;

  const userPrompt = `Identify missing relationships between concepts in this layer that would help achieve the milestone.

Milestone: "${milestone.title}"
${milestone.description ? `Milestone Description: "${milestone.description}"` : ''}
Learning Goal: "${learningGoal.title}"
${learningGoal.description ? `Goal Description: "${learningGoal.description}"` : ''}
Goal Type: ${learningGoal.type}
${learningGoal.target ? `Target: ${learningGoal.target}` : ''}
${learningGoal.assessedLevel ? `Assessed Level: ${learningGoal.assessedLevel}` : ''}

Generated Concepts in Layer:
${conceptDescriptions}

Existing Relationships:
${existingRelationships}

Task:
1. Analyze the relationships between concepts in this layer
2. Identify missing relationships that would improve learning flow
3. Consider prerequisite, complementary, sequential, and hierarchical relationships
4. Identify relationships that would help learners achieve this milestone
5. For each missing relationship, explain why it's needed

IMPORTANT: You MUST return missingRelationships array (even if empty). Do NOT return missingConcepts.

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
    throw new Error('Failed to identify relationships: empty response from LLM');
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
  const missingRelationships: MissingRelationship[] = (analysis.missingRelationships || []).map((mr: any) => ({
    source: mr.source || '',
    target: mr.target || '',
    type: (mr.type || 'prerequisite') as 'prerequisite' | 'complementary' | 'sequential' | 'hierarchical',
    reason: mr.reason || '',
    strength: mr.strength,
  }));

  return {
    missingRelationships,
    prompt: fullPrompt,
  };
}


