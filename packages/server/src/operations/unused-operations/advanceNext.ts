import { Concept, OperationResult, ConceptGraph } from '../../types/concept';
import { advanceNextSystemPrompt } from '../../prompts';
import { callLLM, extractJSONArray } from '../../services/llm';
import { validateConcept, normalizeConcept } from '../../utils/validation';
import { traceAncestorsToRoot, findRootConcept } from '../../utils/traceAncestors';

/**
 * Generates the next logical learning step that advances forward in the learning path
 * Analyzes the parent chain (parent1 -> parent2 -> concept) to understand context
 * and generates what should be learned next in sequence
 * 
 * Example: If learning "Count to Ten", the next step might be "Count to Twenty"
 * 
 * @param concept - Current concept the learner is studying
 * @param graph - Optional graph to trace parent chain and find seed concept
 * @returns Array containing the next concept to learn (advancing forward)
 */
export async function advanceNext(concept: Concept, graph?: ConceptGraph): Promise<OperationResult> {
  // Validate input
  if (!validateConcept(concept)) {
    throw new Error('Invalid concept input for advanceNext operation');
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
  
  // Build prompt
  const userPrompt = `You are a learning architect determining the next logical learning step. ${seedInfo}${parentChainInfo}${existingChildrenInfo}

${currentConceptInfo}

## Task
Analyze the learning context above and determine what the learner should learn **NEXT** to advance forward in their learning journey.

**Key Principle**: Advance the learning path forward in the same direction, not deeper into sub-topics or broader into related topics.

## Examples
- If learning "Count to Ten" → Next: "Count to Twenty" (progression in counting)
- If learning "Basic Addition" → Next: "Two-Digit Addition" (advancing addition skills)
- If learning "Hello World Program" → Next: "Variables and User Input" (next step in programming)
- If learning "Present Tense Verbs" → Next: "Past Tense Verbs" (progression in grammar)

## Important Guidelines
- **Advance Forward**: Generate the next logical step that progresses the learning, not sub-concepts or related concepts
- **Follow the Path**: The next concept should naturally follow from the parent chain context
- **Maintain Sequence**: Think of this as "what comes next in the learning sequence?"
- **Progressive Difficulty**: The next concept should be slightly more advanced than the current one
- **Same Direction**: Continue in the same learning direction established by the parent chain

## Rules
- Generate **ONE concept** that represents the next logical learning step
- The concept should build on "${concept.name}" and advance the learning path forward
- If the parent chain shows a progression (e.g., "Counting" → "Count to Ten"), continue that progression
- The next concept should be at a similar or slightly higher complexity level
- Return the output **only as a JSON array** with ONE concept, where it has:
  - "name": concept name (MUST be properly spaced, human-readable)
  - "description": short explanation (1–2 sentences) of why this is the next logical step
  - "parents": array containing "${concept.name}" (the current concept as parent)
  - "children": empty array []
  - "layer": ${concept.layer !== undefined ? concept.layer + 1 : 'undefined'} (increment layer if current concept has a layer, otherwise omit)

Return **only** the JSON array with ONE concept representing the next learning step.`;

  // Call LLM
  const response = await callLLM({
    systemPrompt: advanceNextSystemPrompt,
    userPrompt: userPrompt,
  });

  // Extract and parse JSON array
  let results: any[];
  try {
    results = extractJSONArray(response.content);
  } catch (error) {
    throw new Error(`Failed to parse LLM response: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }

  // Normalize and validate results - should be exactly one concept
  if (results.length === 0) {
    throw new Error('LLM did not generate a next concept');
  }

  // Take the first result as the next concept
  const normalized = normalizeConcept(results[0]);
  
  // Ensure parent relationship is established
  if (!normalized.parents.includes(concept.name)) {
    normalized.parents = [concept.name]; // Set current concept as parent
  }
  
  // Ensure children is an array (empty for new concept)
  if (!Array.isArray(normalized.children)) {
    normalized.children = [];
  }
  
  // Set layer number to match the parent concept's layer
  if (concept.layer !== undefined) {
    normalized.layer = concept.layer;
  }
  
  // Validate the result
  const conceptName = normalized.name || 'unknown';
  if (!validateConcept(normalized)) {
    throw new Error(`Invalid concept in advanceNext result: ${conceptName}`);
  }

  // Update the current concept to include the next concept as a child
  const updatedConcept: Concept = {
    ...concept,
    children: Array.from(new Set([...concept.children, normalized.name])),
  };

  // Return both the next concept and the updated current concept
  return [normalized, updatedConcept];
}

