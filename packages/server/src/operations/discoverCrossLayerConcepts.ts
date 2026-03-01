/**
 * Strategy 5: Cross-Layer Concept Discovery
 * 
 * Analyzes concepts across different layers to identify missing connections
 * or concepts that bridge layers.
 */

import { callLLM } from '../services/llm';
import { UNIFIED_ENRICHMENT_RESPONSE_PROMPT } from '../utils/enrichmentResponse';
import type {
  DiscoverCrossLayerConceptsOptions,
  CrossLayerDiscovery,
  MissingConcept,
  MissingRelationship,
} from '../types/enrichment';

/**
 * Discovers bridging concepts and missing foundations across layers.
 * 
 * @param options - Options including two layers, learning goal, and optional milestone
 * @returns Bridging concepts and missing foundations
 */
export async function discoverCrossLayerConcepts(
  options: DiscoverCrossLayerConceptsOptions
): Promise<CrossLayerDiscovery> {
  const { layer1Concepts, layer2Concepts, learningGoal, targetMilestone, uid } = options;

  // Build concept lists
  const layer1List = layer1Concepts
    .map(c => `- ${c.name}${c.description ? `: ${c.description}` : ''}`)
    .join('\n');
  
  const layer2List = layer2Concepts
    .map(c => `- ${c.name}${c.description ? `: ${c.description}` : ''}`)
    .join('\n');

  const systemPrompt = `You are an expert learning path analyzer. Your task is to analyze concept progression across layers to identify gaps and bridging concepts.

Key principles:
- Analyze the progression from Layer 1 to Layer 2
- Identify concepts that should bridge these layers
- Find missing foundational concepts
- Suggest concepts that would improve the learning path
- Consider the learning goal and milestone context
- Identify missing relationships between layers

${UNIFIED_ENRICHMENT_RESPONSE_PROMPT}

Additional fields for this strategy (include in metadata):
- "bridgingConcepts": array of concepts that bridge layers
- "missingFoundations": array of foundational concepts that are missing

IMPORTANT: 
- Bridging concepts and missing foundations should be in missingConcepts array
- Relationships between concepts (prerequisites, enables) should be in missingRelationships array
- Always include missingConcepts and missingRelationships arrays (even if empty)

Return ONLY the JSON object, no additional text.`;

  const userPrompt = `Analyze concept progression across layers to identify gaps.

Learning Goal: "${learningGoal.title}"
${learningGoal.description ? `Goal Description: "${learningGoal.description}"` : ''}
Goal Type: ${learningGoal.type}
${learningGoal.target ? `Target: ${learningGoal.target}` : ''}
${targetMilestone ? `Target Milestone: "${targetMilestone.title}"` : ''}

Layer 1 Concepts:
${layer1List || 'None'}

Layer 2 Concepts:
${layer2List || 'None'}

Task:
1. Analyze the progression from Layer 1 to Layer 2
2. Identify concepts that should bridge these layers
3. Find missing foundational concepts
4. Suggest concepts that would improve the learning path
5. Consider what learners need to transition smoothly between layers

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
    throw new Error('Failed to discover cross-layer concepts: empty response from LLM');
  }

  // Parse JSON response (LLM returns raw JSON, not typed)
  let discovery: any;

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
  const bridgingConcepts = discovery.bridgingConcepts || [];
  const missingFoundations = discovery.missingFoundations || [];

  // Combine bridging concepts and missing foundations into missingConcepts
  const missingConcepts: MissingConcept[] = [
    ...bridgingConcepts.map((bc: any) => ({
      name: bc.name || '',
      description: bc.description,
      reason: bc.reason || '',
      suggestedLayer: bc.suggestedLayer,
      prerequisites: bc.prerequisites || [],
      relationshipType: 'prerequisite' as const,
      priority: 'high' as const,
      suggestedPlacement: 'same_layer' as const,
    })),
    ...missingFoundations.map((mf: any) => ({
      name: mf.name || '',
      description: mf.description,
      reason: mf.reason || '',
      suggestedLayer: undefined,
      prerequisites: [],
      relationshipType: 'prerequisite' as const,
      priority: (mf.priority || 'medium') as 'high' | 'medium' | 'low',
      suggestedPlacement: 'same_layer' as const,
    })),
  ];

  // Create relationships from bridging concepts' prerequisites and enables
  const missingRelationships: MissingRelationship[] = [
    // Prerequisites relationships
    ...bridgingConcepts.flatMap((bc: any) =>
      (bc.prerequisites || []).map((prereq: string) => ({
        source: prereq,
        target: bc.name || '',
        type: 'prerequisite' as const,
        reason: `Prerequisite for ${bc.name}`,
        strength: 0.9,
      }))
    ),
    // Enables relationships (reverse prerequisite)
    ...bridgingConcepts.flatMap((bc: any) =>
      (bc.enables || []).map((enables: string) => ({
        source: bc.name || '',
        target: enables,
        type: 'sequential' as const,
        reason: `${bc.name} enables ${enables}`,
        strength: 0.8,
      }))
    ),
    ...(discovery.missingRelationships || []).map((mr: any) => ({
      source: mr.source || '',
      target: mr.target || '',
      type: (mr.type || 'prerequisite') as 'prerequisite' | 'complementary' | 'sequential' | 'hierarchical',
      reason: mr.reason || '',
      strength: mr.strength,
    })),
  ];

  const result: CrossLayerDiscovery = {
    missingConcepts,
    missingRelationships,
    metadata: {
      bridgingConcepts: bridgingConcepts.map((bc: any) => ({
        name: bc.name || '',
        reason: bc.reason || '',
        suggestedLayer: bc.suggestedLayer,
        prerequisites: bc.prerequisites || [],
        enables: bc.enables || [],
      })),
      missingFoundations: missingFoundations.map((mf: any) => ({
        name: mf.name || '',
        reason: mf.reason || '',
        priority: (mf.priority || 'medium') as 'high' | 'medium' | 'low',
      })),
    },
  };

  return {
    ...result,
    prompt: fullPrompt,
  };
}

