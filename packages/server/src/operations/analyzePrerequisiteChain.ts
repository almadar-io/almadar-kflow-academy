/**
 * Strategy 3: Prerequisite Chain Analysis
 * 
 * Analyzes each concept in the graph and identifies its complete prerequisite chain,
 * including implicit prerequisites.
 */

import { callLLM } from '../services/llm';
import { UNIFIED_ENRICHMENT_RESPONSE_PROMPT } from '../utils/enrichmentResponse';
import type {
  AnalyzePrerequisiteChainOptions,
  PrerequisiteAnalysis,
  MissingConcept,
  MissingRelationship,
} from '../types/enrichment';

/**
 * Analyzes complete prerequisite chain for a concept.
 * 
 * @param options - Options including concept, graph, and learning goal
 * @returns Prerequisite analysis with direct, indirect, and suggested prerequisites
 */
export async function analyzePrerequisiteChain(
  options: AnalyzePrerequisiteChainOptions
): Promise<PrerequisiteAnalysis> {
  const { concept, graph, learningGoal, uid } = options;

  // Get existing prerequisites from concept
  const existingPrereqs = concept.prerequisites || [];
  const existingPrereqList = existingPrereqs.length > 0
    ? existingPrereqs.join(', ')
    : 'None';

  // Get related concepts in graph for context
  const relatedConcepts = Object.keys(graph.concepts)
    .filter(name => name !== concept.name)
    .slice(0, 20) // Limit to avoid too long prompts
    .map(name => {
      const c = graph.concepts[name];
      return `- ${name}${c.description ? `: ${c.description}` : ''}`;
    })
    .join('\n');

  // Get existing relationships for this concept
  const existingRelationships = graph.relationships?.[concept.name] || [];
  const relationshipList = existingRelationships.length > 0
    ? existingRelationships
        .map(rel => `${concept.name} → ${rel.target} (${rel.type})`)
        .join('\n')
    : 'None';

  const systemPrompt = `You are an expert learning path analyzer. Your task is to analyze the complete prerequisite chain for a concept.

Key principles:
- Identify ALL prerequisites needed (both explicit and implicit)
- Consider the learning goal context
- Think about what a learner MUST know before attempting this concept
- Include foundational concepts, tools, and related skills
- Check if prerequisites exist in the graph
- For prerequisites that don't exist, add them to missingConcepts
- For relationships that should exist, add them to missingRelationships

${UNIFIED_ENRICHMENT_RESPONSE_PROMPT}

Additional fields for this strategy (include in metadata):
- "directPrerequisites": array of direct prerequisites with existsInGraph flag
- "indirectPrerequisites": array of indirect prerequisites with existsInGraph flag
- "suggestedPrerequisites": array of suggested prerequisite relationships

IMPORTANT: 
- Prerequisites that don't exist (existsInGraph: false) should be in missingConcepts
- Suggested prerequisites should be in missingRelationships
- Always include missingConcepts and missingRelationships arrays (even if empty)

Return ONLY the JSON object, no additional text.`;

  const userPrompt = `Analyze the prerequisite chain for this concept:

Concept: "${concept.name}"
${concept.description ? `Description: "${concept.description}"` : ''}
Current Prerequisites: ${existingPrereqList}

Learning Goal: "${learningGoal.title}"
${learningGoal.description ? `Goal Description: "${learningGoal.description}"` : ''}
Goal Type: ${learningGoal.type}
${learningGoal.target ? `Target: ${learningGoal.target}` : ''}
${learningGoal.assessedLevel ? `Assessed Level: ${learningGoal.assessedLevel}` : ''}

Related Concepts in Graph:
${relatedConcepts || 'None'}

Existing Relationships:
${relationshipList}

Task:
1. Identify ALL prerequisites needed (both explicit and implicit)
2. Consider the learning goal context
3. Think about what a learner MUST know before attempting this concept
4. Include foundational concepts, tools, and related skills
5. Check if each prerequisite exists in the graph (use the related concepts list)
6. Add missing prerequisites to missingConcepts array
7. Add prerequisite relationships to missingRelationships array
8. Organize prerequisites by dependency level (direct vs. indirect) in metadata

IMPORTANT: You MUST return missingConcepts and missingRelationships arrays (even if empty).

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
    throw new Error('Failed to analyze prerequisite chain: empty response from LLM');
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
  const allPrereqs = [
    ...(analysis.directPrerequisites || []),
    ...(analysis.indirectPrerequisites || []),
  ];

  // Missing concepts are prerequisites that don't exist in graph
  const missingConcepts: MissingConcept[] = allPrereqs
    .filter((pr: any) => !pr.existsInGraph)
    .map((pr: any) => ({
      name: pr.name || '',
      description: pr.description,
      reason: pr.reason || '',
      suggestedLayer: undefined,
      prerequisites: [],
      relationshipType: 'prerequisite' as const,
      priority: 'high' as const,
      suggestedPlacement: 'same_layer' as const,
    }));

  // Missing relationships from suggested prerequisites
  const missingRelationships: MissingRelationship[] = [
    ...(analysis.suggestedPrerequisites || []).map((sp: any) => ({
      source: sp.addPrerequisite || '',
      target: sp.concept || concept.name,
      type: 'prerequisite' as const,
      reason: sp.reason || '',
      strength: 0.8,
    })),
    // Also add relationships from missing prerequisites to the concept
    ...missingConcepts.map((mc) => ({
      source: mc.name,
      target: concept.name,
      type: 'prerequisite' as const,
      reason: `Prerequisite for ${concept.name}`,
      strength: 0.9,
    })),
  ];

  const result: PrerequisiteAnalysis = {
    missingConcepts,
    missingRelationships,
    metadata: {
      directPrerequisites: (analysis.directPrerequisites || []).map((pr: any) => ({
        name: pr.name || '',
        reason: pr.reason || '',
        existsInGraph: pr.existsInGraph ?? false,
      })),
      indirectPrerequisites: (analysis.indirectPrerequisites || []).map((pr: any) => ({
        name: pr.name || '',
        reason: pr.reason || '',
        existsInGraph: pr.existsInGraph ?? false,
      })),
      suggestedPrerequisites: (analysis.suggestedPrerequisites || []).map((sp: any) => ({
        concept: sp.concept || concept.name,
        addPrerequisite: sp.addPrerequisite || '',
        reason: sp.reason || '',
      })),
    },
  };

  return {
    ...result,
    prompt: fullPrompt,
  };
}

