import { Concept, OperationResult } from '../../types/concept';
import { progressiveExpandMultipleSystemPrompt } from '../../prompts';
import { callLLM, extractJSONArray } from '../../services/llm';
import { validateConcept, normalizeConcept, validateConceptArray } from '../../utils/validation';

/**
 * Generates multiple layers of concepts building on previous layers
 * @param concept - Target concept/seed for the learning path
 * @param previousLayers - Array of concepts from previous layers that learner already understands
 * @param numLayers - Number of layers to generate (default: 2)
 * @returns Object with concepts array and the model that was used
 */
export async function progressiveExpandMultiple(
  concept: Concept,
  previousLayers: Concept[],
  numLayers: number = 2
): Promise<{ concepts: OperationResult; model: string }> {
  // Validate input
  if (!validateConcept(concept)) {
    throw new Error('Invalid concept input for progressiveExpandMultiple operation');
  }

  if (!validateConceptArray(previousLayers)) {
    throw new Error('Invalid previous layers input for progressiveExpandMultiple operation');
  }

  if (numLayers < 1 || numLayers > 5) {
    throw new Error('Number of layers must be between 1 and 5');
  }

  // Filter out concepts with subLayer - only use main layer concepts
  const mainLayerConcepts = previousLayers.filter(c => !c.subLayer);

  // Calculate starting layer number
  const maxPreviousLayer = mainLayerConcepts.length > 0
    ? Math.max(...mainLayerConcepts.map(c => c.layer || 0))
    : 0;
  const startLayer = maxPreviousLayer + 1;

  // Build previous layers context (only main layer concepts)
  const previousLayersInfo = mainLayerConcepts.length > 0
    ? mainLayerConcepts.map(c => `- ${c.name}: ${c.description}`).join('\n')
    : '(No previous concepts - this is the first layer)';

  // Build prompt
  const userPrompt = `You are a learning architect building a progressive learning path for the topic "${concept.name}".

## Topic Anchoring
- The core topic is: "${concept.name}" (Description: ${concept.description})
- ALL generated concepts MUST remain directly relevant to this core topic
- Concepts that branch into unrelated domains (even if interesting) should NOT be generated
- If you find yourself generating concepts that are only tangentially related, stop and refocus on the core topic

## Current Knowledge
Below is the list of concepts the learner already understands:
${previousLayersInfo}

## Task
Generate **${numLayers} sequential layers** of concepts the learner should learn, building progressively on previous knowledge. Each layer should:
- Build on the concepts from the layer before it

## Name Formatting Rules
- Concept names MUST be human-readable phrases with spaces between words
- Use Title Case with proper spacing (e.g., "Machine Learning", "Data Structures", "React Components")
- DO NOT concatenate words (avoid: "MachineLearning", "DataStructures")
- DO NOT use camelCase, PascalCase, or snake_case
- Examples of GOOD names: "JavaScript Development", "Object-Oriented Programming", "State Management"
- Examples of BAD names: "JavaScriptDevelopment", "ObjectOrientedProgramming", "StateManagement"

## Rules
- The learner starts from no prior knowledge if this is the first layer.
- Each new layer should:
  - Expand upon concepts from the previous layer
  - Introduce only the next logical topics (not too advanced)
- **CRITICAL: DO NOT repeat the same concept name across multiple layers. Each concept should appear in exactly ONE layer only.**
- Avoid repeating concepts from previous layers OR from within the same generation
- Each concept in a layer must have at least one parent from the immediately previous layer (or from previousLayers if it's the first generated layer)
- Each concept name must be unique across all ${numLayers} layers you generate
- Return the output **only as a JSON array** with ALL concepts from ALL layers, where each concept has:
  - "name": concept name (MUST be properly spaced, see Name Formatting Rules above)
  - "description": short explanation (1–2 sentences)
  - "parents": array of concept names from the immediately previous layer that lead to this one
  - "children": empty array []
  - "layer": the layer number (starting from ${startLayer})

## Structure
The output should contain concepts for all ${numLayers} layers:
- Layer ${startLayer}: First new layer (parents come from: ${mainLayerConcepts.length > 0 ? mainLayerConcepts.map(c => c.name).join(', ') : 'none'})
- Layer ${startLayer + 1}: Second layer (parents come from Layer ${startLayer})
${numLayers > 2 ? `- Layer ${startLayer + 2}: Third layer (parents come from Layer ${startLayer + 1})` : ''}
${numLayers > 3 ? `- Layer ${startLayer + 3}: Fourth layer (parents come from Layer ${startLayer + 2})` : ''}
${numLayers > 4 ? `- Layer ${startLayer + 4}: Fifth layer (parents come from Layer ${startLayer + 3})` : ''}

Return **only** the JSON array with all concepts from all layers, each with the correct layer number.`;

  // Call LLM
  const response = await callLLM({
    systemPrompt: progressiveExpandMultipleSystemPrompt,
    userPrompt: userPrompt,
  });

  const modelUsed = response.model; // Capture the model that was used


  // Extract and parse JSON array
  let results: any[];
  try {
    results = extractJSONArray(response.content);
  } catch (error) {
    throw new Error(`Failed to parse LLM response: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }

  const allGeneratedConcepts: Concept[] = [];

  // Process results and organize by layer
  const conceptsByLayer: Map<number, Concept[]> = new Map();

  // First pass: normalize all results
  const normalizedResults: Concept[] = [];
  for (const item of results) {
    const normalized = normalizeConcept(item);
    
    // Ensure layer is set
    if (normalized.layer === undefined) {
      continue; // Skip concepts without layer
    }
    
    // Validate layer number is in expected range
    if (normalized.layer < startLayer || normalized.layer >= startLayer + numLayers) {
      continue; // Skip concepts outside expected range
    }

    // Ensure children is an array
    if (!Array.isArray(normalized.children)) {
      normalized.children = [];
    }

    // Remove circular dependencies: filter out self-references from parents
    normalized.parents = normalized.parents.filter(parentName => parentName !== normalized.name);

    normalizedResults.push(normalized);
  }

  // Sort by layer
  normalizedResults.sort((a, b) => (a.layer || 0) - (b.layer || 0));

  // Second pass: group by layer
  for (const normalized of normalizedResults) {
    const layer = normalized.layer!;
    
    // Group by layer
    if (!conceptsByLayer.has(layer)) {
      conceptsByLayer.set(layer, []);
    }
    conceptsByLayer.get(layer)!.push(normalized);
  }

  // Collect all generated concepts from all layers
  for (let layer = startLayer; layer < startLayer + numLayers; layer++) {
    const layerConcepts = conceptsByLayer.get(layer) || [];
    
    for (const concept of layerConcepts) {
      // Validate concept structure only
      const conceptName = concept.name || 'unknown';
      if (!validateConcept(concept)) {
        throw new Error(`Invalid concept in progressiveExpandMultiple result: ${conceptName}`);
      }

      allGeneratedConcepts.push(concept);
    }
  }

  // Update parent concepts to include new children
  const updatedParents: Concept[] = [];

  // Update previous layer concepts (only main layer concepts)
  for (const parentConcept of mainLayerConcepts) {
    const newChildrenNames = allGeneratedConcepts
      .filter(c => c.layer === startLayer && c.parents.includes(parentConcept.name))
      .map(c => c.name);
    
    if (newChildrenNames.length > 0) {
      // Remove circular dependencies: ensure parent doesn't reference itself
      const filteredChildren = newChildrenNames.filter(childName => childName !== parentConcept.name);
      if (filteredChildren.length > 0) {
        updatedParents.push({
          ...parentConcept,
          layer: parentConcept.layer,
          children: [...new Set([...parentConcept.children, ...filteredChildren])],
        });
      }
    }
  }

  // Update concepts from each generated layer to include their children
  for (let layer = startLayer; layer < startLayer + numLayers - 1; layer++) {
    const layerConcepts = conceptsByLayer.get(layer) || [];
    const nextLayerConcepts = conceptsByLayer.get(layer + 1) || [];

    for (const parentConcept of layerConcepts) {
      const newChildrenNames = nextLayerConcepts
        .filter(c => c.parents.includes(parentConcept.name))
        .map(c => c.name);
      
      // Remove circular dependencies: ensure parent doesn't reference itself
      const filteredChildren = newChildrenNames.filter(childName => childName !== parentConcept.name);
      
      if (filteredChildren.length > 0) {
        updatedParents.push({
          ...parentConcept,
          layer: parentConcept.layer,
          children: [...new Set([...parentConcept.children, ...filteredChildren])],
        });
      }
    }
  }

  // Replace concepts in allGeneratedConcepts with updated versions from updatedParents (that have children)
  const updatedParentsMap = new Map<string, Concept>();
  updatedParents.forEach(parent => {
    updatedParentsMap.set(parent.name, parent);
  });

  // Replace concepts in allGeneratedConcepts with updated versions
  const replacedConcepts = allGeneratedConcepts.map(concept => {
    const updated = updatedParentsMap.get(concept.name);
    if (updated && updated.children.length > 0) {
      // Replace with updated version that has children
      return updated;
    }
    return concept;
  });

  // Add any updatedParents that aren't in allGeneratedConcepts (from previous layers)
  const allGeneratedConceptNames = new Set(allGeneratedConcepts.map(c => c.name));
  const uniqueUpdatedParents = updatedParents.filter(parent => !allGeneratedConceptNames.has(parent.name));

  // Return replaced concepts and unique updated parent concepts (from previous layers)
  const result = uniqueUpdatedParents.length > 0 ? [...replacedConcepts, ...uniqueUpdatedParents] : replacedConcepts;
  
  return {
    concepts: result,
    model: modelUsed,
  };
}