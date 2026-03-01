import { Concept, OperationResult } from '../types/concept';
import { progressiveExploreSystemPrompt } from '../prompts';
import { callLLM, extractJSONArray } from '../services/llm';
import { validateConcept, normalizeConcept, validateConceptArray } from '../utils/validation';

/**
 * Generates additional related concepts within the same layer (horizontal expansion)
 * Focuses on a single concept to explore around
 * @param concept - Single concept from a layer to expand horizontally around
 * @param seedConcept - Seed concept for anchoring the prompt
 * @param previousLayer - Array of concepts from the layer immediately before the concept's layer
 * @param currentLayer - Array of concepts from the current layer (excluding the concept itself)
 * @param nextLayer - Array of concepts from the layer immediately after the concept's layer
 * @returns Array of new concepts in the same layer with updated parent concepts
 */
export async function progressiveExplore(
  concept: Concept,
  seedConcept: Concept,
  previousLayer: Concept[],
  currentLayer: Concept[],
  nextLayer: Concept[]
): Promise<OperationResult> {
  // Validate input
  if (!validateConcept(concept)) {
    throw new Error('Invalid concept input for progressiveExplore operation');
  }

  if (!validateConcept(seedConcept)) {
    throw new Error('Invalid seed concept input for progressiveExplore operation');
  }

  if (!validateConceptArray(previousLayer)) {
    throw new Error('Invalid previous layer input for progressiveExplore operation');
  }

  if (!validateConceptArray(currentLayer)) {
    throw new Error('Invalid current layer input for progressiveExplore operation');
  }

  if (!validateConceptArray(nextLayer)) {
    throw new Error('Invalid next layer input for progressiveExplore operation');
  }

  const targetLayer = concept.layer || 1;
  const prevLayerNum = targetLayer > 1 ? targetLayer - 1 : undefined;
  const nextLayerNum = targetLayer + 1;

  // Build concept context
  const conceptInfo = `${concept.name}: ${concept.description}`;
  
  // Build previous layer context
  const previousLayerInfo = previousLayer.length > 0
    ? previousLayer.map(c => `- ${c.name}: ${c.description}`).join('\n')
    : prevLayerNum ? `(No concepts in Layer ${prevLayerNum})` : '(No previous layer)';
  
  // Build current layer context
  const currentLayerInfo = currentLayer.length > 0
    ? currentLayer.map(c => `- ${c.name}: ${c.description}`).join('\n')
    : `(No other concepts in Layer ${targetLayer})`;
  
  // Build next layer context
  const nextLayerInfo = nextLayer.length > 0
    ? nextLayer.map(c => `- ${c.name}: ${c.description}`).join('\n')
    : `(No concepts in Layer ${nextLayerNum})`;

  // Combine all concepts from previous, current, and next layers for deduplication
  const allRelevantLayers = [...previousLayer, ...currentLayer, ...nextLayer];
  
  // Get existing concept names from all relevant layers to avoid duplication
  const existingNames = new Set([
    concept.name.toLowerCase(),
    ...allRelevantLayers.map(c => c.name.toLowerCase())
  ]);

  // Get parent names from the concept
  const conceptParentNames = concept.parents;

  // Build prompt
  const userPrompt = `You are a learning architect building a progressive learning path for the topic "${seedConcept.name}".

## Topic Anchoring
- The core topic is: "${seedConcept.name}" (Description: ${seedConcept.description})
- ALL generated concepts MUST remain directly relevant to this core topic
- Concepts that branch into unrelated domains (even if interesting) should NOT be generated
- If you find yourself generating concepts that are only tangentially related, stop and refocus on the core topic

## Concept to Explore
The concept to explore around (Layer ${targetLayer}):
${conceptInfo}

## Existing Concepts in Adjacent Layers (DO NOT DUPLICATE)
Below are concepts from the previous layer, current layer, and next layer. DO NOT generate any of these again:

### Previous Layer ${prevLayerNum || 'N/A'}:
${previousLayerInfo}

### Current Layer ${targetLayer} (siblings of "${concept.name}"):
${currentLayerInfo}

### Next Layer ${nextLayerNum}:
${nextLayerInfo}

## Task
Generate **5-10 additional related concepts** that belong to the SAME layer (Layer ${targetLayer}) as the concept above. These should be:
- Related to "${concept.name}"
- At the same complexity/abstraction level (same layer)
- Siblings to the concept (they should share the same parent concepts)
- New concepts that have NOT been generated in any layer

## Name Formatting Rules
- Concept names MUST be human-readable phrases with spaces between words
- Use Title Case with proper spacing (e.g., "Machine Learning", "Data Structures", "React Components")
- DO NOT concatenate words (avoid: "MachineLearning", "DataStructures")
- DO NOT use camelCase, PascalCase, or snake_case
- Examples of GOOD names: "JavaScript Development", "Object-Oriented Programming", "State Management"
- Examples of BAD names: "JavaScriptDevelopment", "ObjectOrientedProgramming", "StateManagement"

## Rules
- Generate concepts at the same layer level as the input concept (Layer ${targetLayer})
- Each new concept should have the same parent concepts as "${concept.name}": ${conceptParentNames.length > 0 ? conceptParentNames.join(', ') : 'empty (root level)'}
- DO NOT generate concepts that already exist in the previous layer (Layer ${prevLayerNum || 'N/A'}), current layer (Layer ${targetLayer}), or next layer (Layer ${nextLayerNum})
- Focus on breadth - exploring different aspects of the same level rather than going deeper
- Return the output **only as a JSON array** with the following minimal fields:
  - "name": concept name (MUST be properly spaced, see Name Formatting Rules above)
  - "description": short explanation (1–2 sentences)
  - "parents": array of concept names from the parent layer (should match parents of layer concepts)
  - "children": empty array []
  - "layer": ${targetLayer} (same layer as input concepts)

Return **only** the JSON array with new concepts for Layer ${targetLayer}.`;

  // Call LLM
  const response = await callLLM({
    systemPrompt: progressiveExploreSystemPrompt,
    userPrompt: userPrompt,
  });

  // Extract and parse JSON array
  let results: any[];
  try {
    results = extractJSONArray(response.content);
  } catch (error) {
    throw new Error(`Failed to parse LLM response: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }

  // Normalize and validate results
  const normalizedResults: Concept[] = [];
  for (const item of results) {
    const normalized = normalizeConcept(item);
    
    // Check for duplicates (case-insensitive)
    const normalizedName = normalized.name.toLowerCase();
    if (existingNames.has(normalizedName)) {
      continue; // Skip duplicates
    }
    
    // Set layer number to match input layer
    normalized.layer = targetLayer;
    
    // Validate that parents match the concept's parents
    // If no parents specified, use parents from the concept
    if (normalized.parents.length === 0) {
      normalized.parents = [...conceptParentNames];
    }
    
    // Ensure children is an array (empty for new concepts)
    if (!Array.isArray(normalized.children)) {
      normalized.children = [];
    }
    
    normalizedResults.push(normalized);
    existingNames.add(normalizedName); // Track to avoid duplicates within this generation
  }

  // Validate all results
  for (const result of normalizedResults) {
    const conceptName = result.name || 'unknown';
    if (!validateConcept(result)) {
      throw new Error(`Invalid concept in progressiveExplore result: ${conceptName}`);
    }
  }

  // Update parent concepts to include new children
  const updatedParents: Concept[] = [];
  const newConceptNames = normalizedResults.map(c => c.name);
  
  // Find parent concepts from previous layer that need to be updated
  const parentConceptMap = new Map<string, Concept>();
  previousLayer.forEach(c => {
    if (newConceptNames.some(nc => normalizedResults.find(n => n.name === nc && n.parents.includes(c.name)))) {
      parentConceptMap.set(c.name, c);
    }
  });

  // Update each parent to include new children
  for (const [parentName, parentConcept] of parentConceptMap) {
    const childrenForParent = normalizedResults
      .filter(c => c.parents.includes(parentName))
      .map(c => c.name);
    
    if (childrenForParent.length > 0) {
      updatedParents.push({
        ...parentConcept,
        layer: parentConcept.layer, // Preserve layer
        children: [...new Set([...parentConcept.children, ...childrenForParent])],
      });
    }
  }

  // Return new concepts and updated parent concepts
  return updatedParents.length > 0 ? [...normalizedResults, ...updatedParents] : normalizedResults;
}

