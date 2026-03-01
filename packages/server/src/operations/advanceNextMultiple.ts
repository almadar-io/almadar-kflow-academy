import { Concept, OperationResult, ConceptGraph } from '../types/concept';
import { advanceNextMultipleSystemPrompt } from '../prompts';
import { callLLM, extractJSONArray } from '../services/llm';
import { validateConcept, normalizeConcept } from '../utils/validation';
import { traceAncestorsToRoot, findRootConcept } from '../utils/traceAncestors';

/**
 * Generates multiple sequential learning steps that advance forward in the learning path
 * Analyzes the parent chain (parent1 -> parent2 -> concept) to understand context
 * and generates sequential next steps: concept -> step1 -> step2 -> step3...
 * 
 * Example: If learning "Count to Ten", generates "Count to Twenty", "Count to Thirty", etc.
 * 
 * @param concept - Current concept the learner is studying
 * @param graph - Optional graph to trace parent chain and find seed concept
 * @param numSteps - Number of steps to advance ahead (default: 3)
 * @returns Array containing multiple sequential next concepts (advancing forward)
 */
export async function advanceNextMultiple(
  concept: Concept,
  graph?: ConceptGraph,
  numSteps: number = 3
): Promise<OperationResult> {
  // Validate input
  if (!validateConcept(concept)) {
    throw new Error('Invalid concept input for advanceNextMultiple operation');
  }

  if (numSteps < 1 || numSteps > 5) {
    throw new Error('Number of steps must be between 1 and 5');
  }

  // Find seed concept (root) and trace parent chain if graph is provided
  let seedConcept: Concept | undefined;
  let parentChain: Concept[] = [];
  let parentChainInfo = '';
  
  if (graph) {
    seedConcept = findRootConcept(graph, concept);
    if (seedConcept) {
      // Trace parent chain from concept to seed
      const ancestors = traceAncestorsToRoot(graph, concept);
      // Reverse to get path from seed to concept (parent1 -> parent2 -> concept)
      parentChain = ancestors.reverse();
      
      if (parentChain.length > 1) {
        // Build parent chain string for context
        const chainNames = parentChain.map(c => c.name);
        parentChainInfo = `Learning path so far: ${chainNames.join(' → ')}. `;
      }
    }
  } else {
    // If no graph, use direct parents
    if (concept.parents.length > 0) {
      parentChainInfo = `Direct parent: ${concept.parents[0]}. `;
    }
  }

  // Build context information
  const seedInfo = seedConcept && seedConcept.name !== concept.name
    ? `This learning path is part of the broader topic: "${seedConcept.name}". `
    : '';
  
  const currentConceptInfo = `Current concept: "${concept.name}" (${concept.description})`;
  const existingChildrenInfo = concept.children.length > 0
    ? `Existing next-step concepts (do NOT generate these again): ${concept.children.join(', ')}. `
    : '';
  
  // Calculate layer numbers for each step
  const baseLayer = concept.layer !== undefined ? concept.layer : undefined;
  const layerInfo = baseLayer !== undefined 
    ? `Each step should keep the same layer number as the current concept (Layer ${baseLayer}).`
    : 'Do not include layer numbers.';
  
  // Build prompt
  const userPrompt = `You are a learning architect determining multiple sequential learning steps. ${seedInfo}${parentChainInfo}${existingChildrenInfo}

${currentConceptInfo}

## Task
Analyze the learning context above and generate **${numSteps} sequential learning steps** that advance forward in the learning path.

**Key Principle**: Advance the learning path forward in the same direction, generating sequential steps that build on each other: "${concept.name}" → Step 1 → Step 2 → Step 3... etc.

## Examples
- If learning "Count to Ten" → Generate: "Count to Twenty" → "Count to Thirty" → "Count to Fifty" (sequential progression)
- If learning "Basic Addition" → Generate: "Two-Digit Addition" → "Three-Digit Addition" → "Addition with Carrying" (advancing skills)
- If learning "Hello World Program" → Generate: "Variables" → "User Input" → "Conditional Statements" (sequential programming concepts)
- If learning "Present Tense Verbs" → Generate: "Past Tense Verbs" → "Future Tense Verbs" → "Irregular Verbs" (progression in grammar)

## Important Guidelines
- **Sequential Steps**: Each step should build on the previous step, creating a chain: concept → step1 → step2 → step3
- **Advance Forward**: Generate steps that progress the learning, not sub-concepts or related concepts
- **Follow the Path**: The steps should naturally follow from the parent chain context
- **Maintain Sequence**: Think of this as "what comes next, then next, then next in the learning sequence?"
- **Progressive Difficulty**: Each step should be slightly more advanced than the previous one
- **Same Direction**: Continue in the same learning direction established by the parent chain

## Rules
- Generate **${numSteps} sequential concepts** that represent the next logical learning steps
- Each concept should build on the previous concept in the sequence
- The first step should build on "${concept.name}"
- Each subsequent step should build on the immediately previous step
- If the parent chain shows a progression, continue that progression
- Each step should be at a similar or slightly higher complexity level than the previous
- Return the output **only as a JSON array** with ${numSteps} concepts in sequence, where each has:
  - "name": concept name (MUST be properly spaced, human-readable)
  - "description": short explanation (1–2 sentences) of why this is the next logical step
  - "parents": array containing the previous concept's name (first step has "${concept.name}" as parent)
  - "children": empty array []
  - "layer": ${baseLayer !== undefined ? `increment by 1 for each step (Step 1 = ${baseLayer + 1}, Step 2 = ${baseLayer + 2}, etc.)` : 'omit this field'}
- ${layerInfo}

## Sequence Structure
The output should be a JSON array with ${numSteps} concepts in order:
1. First step: builds on "${concept.name}"
2. Second step: builds on the first step
3. Third step: builds on the second step
${numSteps > 3 ? `4. Fourth step: builds on the third step` : ''}
${numSteps > 4 ? `5. Fifth step: builds on the fourth step` : ''}

Return **only** the JSON array with ${numSteps} concepts in sequential order.`;

  // Call LLM
  const response = await callLLM({
    systemPrompt: advanceNextMultipleSystemPrompt,
    userPrompt: userPrompt,
  });

  // Extract and parse JSON array
  let results: any[];
  try {
    results = extractJSONArray(response.content);
  } catch (error) {
    throw new Error(`Failed to parse LLM response: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }

  // Normalize and validate results - should be multiple concepts in sequence
  if (results.length === 0) {
    throw new Error('LLM did not generate any next concepts');
  }

  // Normalize and validate all results, establishing sequential relationships
  const normalizedResults: Concept[] = [];
  for (let i = 0; i < results.length; i++) {
    const item = results[i];
    const normalized = normalizeConcept(item);
    
    // All generated concepts are direct children of the original concept
    normalized.parents = [concept.name];
    
    // Ensure children is an array (empty for new concept)
    if (!Array.isArray(normalized.children)) {
      normalized.children = [];
    }
    
    // Set layer number (increment from current concept's layer if it exists)
    if (baseLayer !== undefined) {
      normalized.layer = baseLayer;
    }
    
    // Validate the result
    const conceptName = normalized.name || 'unknown';
    if (!validateConcept(normalized)) {
      throw new Error(`Invalid concept in advanceNextMultiple result at step ${i + 1}: ${conceptName}`);
    }
    
    normalizedResults.push(normalized);
  }

  // Update parent concepts to include new children
  const updatedParents: Concept[] = [];

  // Update the input concept to include the first step as a child
  if (normalizedResults.length > 0) {
    updatedParents.push({
      ...concept,
      children: Array.from(new Set([...concept.children, ...normalizedResults.map(c => c.name)])),
    });
  }

  // Return all steps and updated parent concept
  return [...normalizedResults, ...updatedParents];
}

