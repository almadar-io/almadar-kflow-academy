import { Concept, OperationResult, ConceptGraph } from '../types/concept';
import { progressiveExpandSingleSystemPrompt } from '../prompts';
import { callLLM, extractJSONArray } from '../services/llm';
import { validateConcept, normalizeConcept, validateConceptArray } from '../utils/validation';
import { getAllConcepts } from '../utils/graph';

/**
 * Generates one sub-layer under a specific concept
 * Sub-layers extend beyond normal layers (e.g., 1.1a, 1.2a, 2.1b)
 * Format: {mainLayer}.{subLayerNumber}{letter}
 *   - mainLayer: the main layer number (1, 2, 3...)
 *   - subLayerNumber: sequence number of sub-layer under this concept (1, 2, 3...)
 *   - letter: indicates which concept in the parent layer (a=first, b=second, c=third...)
 * 
 * If the sub-layer already exists, generates new concepts for that same sub-layer.
 * Otherwise, generates the first sub-layer (1.1a).
 * 
 * @param seedConcept - Seed concept for the overall learning path
 * @param conceptToExpand - Concept in a main layer that we want to expand with sub-layers
 * @param previousSubLayers - Array of concepts from previous sub-layers under the same parent concept
 * @param graph - Optional graph to determine the concept's position in its layer
 * @returns Array of concepts for the generated sub-layer with subLayer identifier
 */
export async function progressiveExpandSingle(
  seedConcept: Concept,
  conceptToExpand: Concept,
  previousSubLayers: Concept[],
  graph?: ConceptGraph
): Promise<OperationResult> {
  // Validate input
  if (!validateConcept(seedConcept)) {
    throw new Error('Invalid seed concept input for progressiveExpandSingle operation');
  }

  if (!validateConcept(conceptToExpand)) {
    throw new Error('Invalid concept to expand input for progressiveExpandSingle operation');
  }

  if (!validateConceptArray(previousSubLayers)) {
    throw new Error('Invalid previous sub-layers input for progressiveExpandSingle operation');
  }

  // Determine the concept's layer and position within that layer
  const mainLayer = conceptToExpand.layer || 1;
  
  // Find the concept's index in its layer to determine the letter suffix
  let conceptLetter = 'a'; // Default to 'a' if we can't determine
  if (graph) {
    const allConcepts = getAllConcepts(graph);
    const layerConcepts = allConcepts
      .filter(c => c.layer === mainLayer && !c.subLayer) // Only main layer concepts, not sub-layer ones
      .sort((a, b) => a.name.localeCompare(b.name)); // Sort for consistency
    
    const index = layerConcepts.findIndex(c => c.name === conceptToExpand.name);
    if (index >= 0) {
      // Convert index to letter: 0=a, 1=b, 2=c, etc.
      conceptLetter = String.fromCharCode(97 + index); // 97 is 'a' in ASCII
    }
  }

  // Determine which sub-layer to work with
  // If sub-layers exist, use the highest one. Otherwise, use 1.1a
  let targetSubLayerNum = 1;
  const existingInTargetSubLayer: Concept[] = [];
  
  if (previousSubLayers.length > 0) {
    // Parse existing sub-layers to find the highest sub-layer number
    const subLayerNumbers = previousSubLayers
      .map(c => {
        if (!c.subLayer) return 0;
        // Extract number from subLayer like "1.2a" -> 2
        const match = c.subLayer.match(/^\d+\.(\d+)/);
        return match ? parseInt(match[1], 10) : 0;
      })
      .filter(n => n > 0);
    
    if (subLayerNumbers.length > 0) {
      targetSubLayerNum = Math.max(...subLayerNumbers);
      // Find all concepts in this target sub-layer (they already exist)
      const targetSubLayerId = `${mainLayer}.${targetSubLayerNum}${conceptLetter}`;
      existingInTargetSubLayer.push(...previousSubLayers.filter(c => c.subLayer === targetSubLayerId));
    }
  }
  
  const targetSubLayerId = `${mainLayer}.${targetSubLayerNum}${conceptLetter}`;

  // Build context for existing concepts in the target sub-layer
  const existingConceptsInfo = existingInTargetSubLayer.length > 0
    ? existingInTargetSubLayer.map(c => `- ${c.name}: ${c.description}`).join('\n')
    : `(No existing concepts in this sub-layer - this will be the first batch of concepts)`;

  // Build previous sub-layers context (for reference)
  const previousSubLayersInfo = previousSubLayers.length > 0
    ? previousSubLayers
        .filter(c => c.subLayer !== targetSubLayerId) // Exclude concepts from target sub-layer
        .map(c => `- ${c.name}: ${c.description}${c.subLayer ? ` (${c.subLayer})` : ''}`)
        .join('\n')
    : `(No previous sub-layers)`;

  // Always use conceptToExpand as the parent to stay focused on one concept
  const parentConcepts: Concept[] = [conceptToExpand];

  // Build prompt
  const userPrompt = `You are a learning architect building a progressive sub-layer learning path for the topic "${seedConcept.name}".

## Topic Anchoring
- The core topic is: "${seedConcept.name}" (Description: ${seedConcept.description})
- ALL generated concepts MUST remain directly relevant to this core topic
- Concepts that branch into unrelated domains (even if interesting) should NOT be generated
- If you find yourself generating concepts that are only tangentially related, stop and refocus on the core topic

## Concept to Expand
The concept to expand with sub-layers (Main Layer ${mainLayer}):
- ${conceptToExpand.name}: ${conceptToExpand.description}

## Target Sub-Layer
You will generate concepts for sub-layer: **${targetSubLayerId}**

${targetSubLayerNum === 1 
  ? `This is the FIRST sub-layer under "${conceptToExpand.name}".` 
  : `This is sub-layer ${targetSubLayerNum} under "${conceptToExpand.name}".`}

## Existing Concepts in Target Sub-Layer (DO NOT DUPLICATE)
Below are concepts that already exist in sub-layer ${targetSubLayerId}. **DO NOT generate these concepts again:**
${existingConceptsInfo}

## Previous Sub-Layers (for reference)
${previousSubLayersInfo}

## Task
Generate **5-10 NEW concepts** for sub-layer ${targetSubLayerId} under "${conceptToExpand.name}".

**IMPORTANT**: All generated concepts must have "${conceptToExpand.name}" as their parent. This ensures we stay focused on expanding "${conceptToExpand.name}" and do not branch off to multiple parents.

These concepts should build directly on "${conceptToExpand.name}" and expand this specific concept further.

**CRITICAL**: Do NOT generate any concepts that already exist in sub-layer ${targetSubLayerId} (listed above).

## Name Formatting Rules
- Concept names MUST be human-readable phrases with spaces between words
- Use Title Case with proper spacing (e.g., "Machine Learning", "Data Structures", "React Components")
- DO NOT concatenate words (avoid: "MachineLearning", "DataStructures")
- DO NOT use camelCase, PascalCase, or snake_case
- Examples of GOOD names: "JavaScript Development", "Object-Oriented Programming", "State Management"
- Examples of BAD names: "JavaScriptDevelopment", "ObjectOrientedProgramming", "StateManagement"

## Rules
- Generate 5-10 NEW concepts for sub-layer ${targetSubLayerId}
- **CRITICAL**: Every concept MUST have "${conceptToExpand.name}" as its ONLY parent. Do NOT use any other parent concepts.
- **DO NOT repeat concepts that already exist in sub-layer ${targetSubLayerId}**
- Each concept should expand and deepen "${conceptToExpand.name}" further
- All concepts must stay focused on "${conceptToExpand.name}" - do not branch off to unrelated topics
- Return the output **only as a JSON array** with NEW concepts, where each concept has:
  - "name": concept name (MUST be properly spaced, see Name Formatting Rules above)
  - "description": short explanation (1–2 sentences)
  - "parents": array containing ONLY "${conceptToExpand.name}" (e.g., ["${conceptToExpand.name}"])
  - "children": empty array []
  - "subLayer": "${targetSubLayerId}" (MUST be exactly this value)
  - "layer": ${mainLayer} (maintain the main layer number)

Return **only** the JSON array with NEW concepts for sub-layer ${targetSubLayerId}.`;

  // Call LLM
  const response = await callLLM({
    systemPrompt: progressiveExpandSingleSystemPrompt,
    userPrompt: userPrompt,
  });

  // Extract and parse JSON array
  let results: any[];
  try {
    results = extractJSONArray(response.content);
  } catch (error) {
    throw new Error(`Failed to parse LLM response: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }

  const allGeneratedConcepts: Concept[] = [];

  // Normalize and validate all results - they should all be for the target sub-layer
  for (const item of results) {
    const normalized = normalizeConcept(item);
    
    // Validate subLayer format - must match target sub-layer exactly
    if (!normalized.subLayer || normalized.subLayer !== targetSubLayerId) {
      continue; // Skip concepts without subLayer or with wrong subLayer
    }
    
    if (!Array.isArray(normalized.children)) {
      normalized.children = [];
    }
    
    // Set main layer number
    normalized.layer = mainLayer;
    
    // Ensure parent relationship is correct - always use conceptToExpand as parent
    normalized.parents = [conceptToExpand.name];
    
    allGeneratedConcepts.push(normalized);
  }

  // Update parent concepts to include new children
  const updatedParents: Concept[] = [];

  // Update conceptToExpand to include new children from this sub-layer
  for (const parentConcept of parentConcepts) {
    const childrenForParent = allGeneratedConcepts
      .filter(c => c.parents.includes(parentConcept.name))
      .map(c => c.name);
    
    if (childrenForParent.length > 0) {
      updatedParents.push({
        ...parentConcept,
        layer: parentConcept.layer,
        subLayer: parentConcept.subLayer,
        children: [...new Set([...parentConcept.children, ...childrenForParent])],
      });
    }
  }

  // Add any updatedParents that aren't in allGeneratedConcepts (like the main conceptToExpand)
  const allGeneratedConceptNames = new Set(allGeneratedConcepts.map(c => c.name));
  const uniqueUpdatedParents = updatedParents.filter(parent => !allGeneratedConceptNames.has(parent.name));

  return uniqueUpdatedParents.length > 0 ? [...allGeneratedConcepts, ...uniqueUpdatedParents] : allGeneratedConcepts;
}

