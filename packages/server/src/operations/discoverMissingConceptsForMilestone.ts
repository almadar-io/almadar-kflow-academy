/**
 * Strategy 2: Milestone-Driven Concept Discovery
 * 
 * Analyzes a milestone and identifies all concepts needed to achieve it,
 * then checks if they exist in the graph.
 */

import { callLLM } from '../services/llm';
import { UNIFIED_ENRICHMENT_RESPONSE_PROMPT } from '../utils/enrichmentResponse';
import type {
  DiscoverMissingConceptsOptions,
  MilestoneConceptDiscovery,
  MissingConcept,
  MissingRelationship,
} from '../types/enrichment';

/**
 * Discovers missing concepts needed for a milestone.
 * 
 * @param options - Options including milestone, current graph, and learning goal
 * @returns Missing concepts and relationships
 */
export async function discoverMissingConceptsForMilestone(
  options: DiscoverMissingConceptsOptions
): Promise<MilestoneConceptDiscovery & { prompt?: string }> {
  const { milestone, currentGraph, learningGoal, layerNumber, uid } = options;

  // Build current concepts list
  const conceptNames = Object.keys(currentGraph.concepts);
  const conceptList = conceptNames
    .map(name => {
      const concept = currentGraph.concepts[name];
      return `- ${name}${concept.description ? `: ${concept.description}` : ''}`;
    })
    .join('\n');

  // Build existing relationships context
  const existingRelationships = currentGraph.relationships
    ? Object.entries(currentGraph.relationships)
        .flatMap(([source, rels]) =>
          rels.map(rel => `${source} → ${rel.target} (${rel.type})`)
        )
        .join('\n')
    : 'None';

  const systemPrompt = `You are an expert learning advisor that analyzes learning milestones to identify all concepts needed to achieve them.

Key principles:
- Identify ALL concepts needed to achieve the milestone (not just some)
- Compare with existing concepts in the graph
- List missing concepts that are essential (not optional)
- For each missing concept, explain why it's needed
- Suggest where in the graph it should be placed (prerequisites, layer, etc.)
- Identify missing relationships between concepts

${UNIFIED_ENRICHMENT_RESPONSE_PROMPT}

Return ONLY the JSON object, no additional text.`;

  const userPrompt = `You are analyzing a learning milestone to identify all concepts needed to achieve it.

Milestone: "${milestone.title}"
${milestone.description ? `Milestone Description: "${milestone.description}"` : ''}
${milestone.targetDate ? `Target Date: ${new Date(milestone.targetDate).toLocaleDateString()}` : ''}

Learning Goal: "${learningGoal.title}"
${learningGoal.description ? `Goal Description: "${learningGoal.description}"` : ''}
Goal Type: ${learningGoal.type}
${learningGoal.target ? `Target: ${learningGoal.target}` : ''}
${learningGoal.assessedLevel ? `Assessed Level: ${learningGoal.assessedLevel}` : ''}

Current Concepts in Graph:
${conceptList || 'None'}

Existing Relationships:
${existingRelationships}

Task:
1. Identify ALL concepts needed to achieve this milestone
2. Compare with existing concepts in the graph
3. List missing concepts that are essential
4. For each missing concept, explain why it's needed
5. Suggest where in the graph it should be placed (prerequisites, layer, etc.)
6. Identify missing relationships between concepts that would help achieve the milestone

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
    throw new Error('Failed to discover missing concepts: empty response from LLM');
  }

  // Parse JSON response
  let discovery: MilestoneConceptDiscovery;

  try {
    // Try to extract JSON object
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      discovery = JSON.parse(jsonMatch[0]);
    } else {
      discovery = JSON.parse(content);
    }
  } catch (error) {
    throw new Error(`Failed to parse LLM response: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }

  // Validate and normalize to unified format
  // IMPORTANT: All suggestions should be added to the layer that corresponds to this milestone
  // Milestone and layer map one-to-one, so all missing concepts go to this layer
  const missingConcepts: MissingConcept[] = (discovery.missingConcepts || []).map((mc: any) => ({
    name: mc.name || '',
    description: mc.description,
    reason: mc.reason || '',
    suggestedLayer: layerNumber, // Always use the layer number for this milestone
    prerequisites: mc.prerequisites || [],
    relationshipType: (mc.relationshipType || 'prerequisite') as 'prerequisite' | 'complementary' | 'sequential' | 'hierarchical',
    priority: (mc.priority || 'medium') as 'high' | 'medium' | 'low',
    suggestedPlacement: 'same_layer' as const, // Always same layer since milestone maps to layer
  }));

  const missingRelationships: MissingRelationship[] = (discovery.missingRelationships || []).map((mr: any) => ({
    source: mr.source || '',
    target: mr.target || '',
    type: (mr.type || 'prerequisite') as 'prerequisite' | 'complementary' | 'sequential' | 'hierarchical',
    reason: mr.reason || '',
    strength: mr.strength,
  }));

  return {
    missingConcepts,
    missingRelationships,
    prompt: fullPrompt,
  };
}

