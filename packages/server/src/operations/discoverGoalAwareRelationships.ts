/**
 * Strategy 4: Goal-Aware Relationship Discovery
 * 
 * Uses LearningGoal context to discover relationships that aren't explicitly defined
 * but are relevant to the goal.
 */

import { callLLM } from '../services/llm';
import { UNIFIED_ENRICHMENT_RESPONSE_PROMPT } from '../utils/enrichmentResponse';
import type {
  DiscoverGoalAwareRelationshipsOptions,
  GoalAwareRelationships,
  MissingConcept,
  MissingRelationship,
} from '../types/enrichment';

/**
 * Discovers relationships relevant to the learning goal.
 * 
 * @param options - Options including graph and learning goal
 * @returns Discovered relationships (complementary, sequential, hierarchical)
 */
export async function discoverGoalAwareRelationships(
  options: DiscoverGoalAwareRelationshipsOptions
): Promise<GoalAwareRelationships> {
  const { graph, learningGoal, uid } = options;

  // Build concept list
  const conceptNames = Object.keys(graph.concepts);
  const conceptList = conceptNames
    .map(name => {
      const concept = graph.concepts[name];
      return `- ${name}${concept.description ? `: ${concept.description}` : ''}`;
    })
    .join('\n');

  // Build existing relationships context
  const existingRelationships = graph.relationships
    ? Object.entries(graph.relationships)
        .flatMap(([source, rels]) =>
          rels.map(rel => `${source} → ${rel.target} (${rel.type})`)
        )
        .join('\n')
    : 'None';

  const systemPrompt = `You are an expert learning path analyzer. Your task is to analyze relationships between concepts in the context of a learning goal.

Key principles:
- Identify relationships between concepts that are relevant to the goal
- Consider how concepts work together in real-world scenarios
- Identify complementary concepts (used together)
- Identify sequential relationships (one leads to another)
- Identify hierarchical relationships (one contains/is part of another)
- Provide strength scores (0-1) for each relationship
- Focus on relationships that help achieve the learning goal
- Identify any missing concepts that should connect existing concepts

${UNIFIED_ENRICHMENT_RESPONSE_PROMPT}

Additional fields for this strategy (include in metadata):
- "complementaryRelationships": array of complementary relationships
- "sequentialRelationships": array of sequential relationships
- "hierarchicalRelationships": array of hierarchical relationships

IMPORTANT: 
- All relationships should be in missingRelationships array
- If you identify missing concepts that bridge relationships, add them to missingConcepts
- Always include missingConcepts and missingRelationships arrays (even if empty)

Return ONLY the JSON object, no additional text.`;

  const userPrompt = `Analyze relationships between concepts in the context of a learning goal.

Learning Goal: "${learningGoal.title}"
${learningGoal.description ? `Goal Description: "${learningGoal.description}"` : ''}
Goal Type: ${learningGoal.type}
${learningGoal.target ? `Target: ${learningGoal.target}` : ''}
${learningGoal.assessedLevel ? `Assessed Level: ${learningGoal.assessedLevel}` : ''}

Current Concepts:
${conceptList || 'None'}

Existing Relationships:
${existingRelationships}

Task:
1. Identify relationships between concepts that are relevant to the goal
2. Consider how concepts work together in real-world scenarios
3. Identify complementary concepts (used together)
4. Identify sequential relationships (one leads to another)
5. Identify hierarchical relationships (one contains/is part of another)
6. Provide strength scores (0-1) for each relationship
7. Focus on relationships that help achieve the learning goal

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
    throw new Error('Failed to discover goal-aware relationships: empty response from LLM');
  }

  // Parse JSON response (LLM returns raw JSON, not typed)
  let relationships: any;

  try {
    // Try to extract JSON object
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      relationships = JSON.parse(jsonMatch[0]);
    } else {
      relationships = JSON.parse(content);
    }
  } catch (error) {
    throw new Error(`Failed to parse LLM response: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }

  // Validate and normalize to unified format
  const allRelationships = [
    ...(relationships.complementaryRelationships || []),
    ...(relationships.sequentialRelationships || []),
    ...(relationships.hierarchicalRelationships || []),
  ];

  const missingRelationships: MissingRelationship[] = allRelationships.map((rel: any) => ({
    source: rel.source || '',
    target: rel.target || '',
    type: (rel.type || 'complementary') as 'prerequisite' | 'complementary' | 'sequential' | 'hierarchical',
    reason: rel.reason || '',
    strength: Math.max(0, Math.min(1, rel.strength ?? 0.5)),
  }));

  const missingConcepts: MissingConcept[] = (relationships.missingConcepts || []).map((mc: any) => ({
    name: mc.name || '',
    description: mc.description,
    reason: mc.reason || '',
    suggestedLayer: mc.suggestedLayer,
    prerequisites: mc.prerequisites || [],
    relationshipType: (mc.relationshipType || 'complementary') as 'prerequisite' | 'complementary' | 'sequential' | 'hierarchical',
    priority: (mc.priority || 'medium') as 'high' | 'medium' | 'low',
    suggestedPlacement: (mc.suggestedPlacement || 'same_layer') as 'same_layer' | 'next_layer' | 'previous_layer',
  }));

  const result: GoalAwareRelationships = {
    missingConcepts,
    missingRelationships,
    metadata: {
      complementaryRelationships: (relationships.complementaryRelationships || []).map((rel: any) => ({
        source: rel.source || '',
        target: rel.target || '',
        type: 'complementary' as const,
        reason: rel.reason || '',
        strength: Math.max(0, Math.min(1, rel.strength ?? 0.5)),
      })),
      sequentialRelationships: (relationships.sequentialRelationships || []).map((rel: any) => ({
        source: rel.source || '',
        target: rel.target || '',
        type: 'sequential' as const,
        reason: rel.reason || '',
        strength: Math.max(0, Math.min(1, rel.strength ?? 0.5)),
      })),
      hierarchicalRelationships: (relationships.hierarchicalRelationships || []).map((rel: any) => ({
        source: rel.source || '',
        target: rel.target || '',
        type: 'hierarchical' as const,
        reason: rel.reason || '',
        strength: Math.max(0, Math.min(1, rel.strength ?? 0.5)),
      })),
    },
  };

  return {
    ...result,
    prompt: fullPrompt,
  };
}

