import { Concept, OperationResult, ConceptGraph } from '../types/concept';
import { customOperationSystemPrompt } from '../prompts';
import { callLLM, extractJSONArray } from '../services/llm';
import { validateConcept, normalizeConcept, validateConceptArray } from '../utils/validation';

export interface CustomOperationOptions {
  seedConcept?: Concept;
  graph?: ConceptGraph;
  details?: {
    lesson?: string;
    flash?: Array<{ front: string; back: string }>;
  };
  stream?: boolean;
  uid?: string;
}

/**
 * Performs a custom operation on concepts based on user-provided natural language prompt
 * @param concepts - Array of concepts to operate on
 * @param prompt - User's natural language instruction
 * @param options - Optional seed concept and graph for context
 * @returns Array of concepts representing additions, updates, or deletions
 */
export async function customOperation(
  concepts: Concept[],
  prompt: string,
  options: CustomOperationOptions = {}
): Promise<OperationResult> {
  // Validate input
  if (!validateConceptArray(concepts) || concepts.length === 0) {
    throw new Error('Invalid concepts input for customOperation');
  }

  if (!prompt || prompt.trim().length === 0) {
    throw new Error('Prompt is required for customOperation');
  }

  const { seedConcept, graph, details } = options;

  // Build context information
  const conceptsInfo = concepts.map(c => 
    `- "${c.name}": ${c.description} (parents: ${c.parents.join(', ') || 'none'}, children: ${c.children.join(', ') || 'none'})`
  ).join('\n');

  const seedInfo = seedConcept ? `This is part of the broader topic: "${seedConcept.name}". ` : '';

  // Build graph context if available
  let graphContext = '';
  if (graph) {
    const allConcepts = Array.from(graph.concepts.values());
    if (allConcepts.length > 0) {
      const conceptsInfo = allConcepts.map(c => 
        `"${c.name}": ${c.description || 'No description'}`
      ).join(', ');
      graphContext = `\n\nExisting concepts in the graph: ${conceptsInfo}.`;
    }
  }

  // Build lesson and flash cards context if available
  let detailsContext = '';
  if (details) {
    const contextParts: string[] = [];
    
    if (details.lesson && details.lesson.trim().length > 0) {
      contextParts.push(`\n\nCurrent lesson content for the concept:\n${details.lesson}`);
    }
    
    if (details.flash && details.flash.length > 0) {
      const flashCardsText = details.flash.map((card, index) => 
        `  ${index + 1}. Front: "${card.front}"\n     Back: "${card.back}"`
      ).join('\n');
      contextParts.push(`\n\nCurrent flash cards for the concept:\n${flashCardsText}`);
    }
    
    if (contextParts.length > 0) {
      detailsContext = contextParts.join('');
    }
  }

  // Determine the parent concept for new concepts
  // If seedConcept is provided and is in the concepts array, use it as the parent
  // Otherwise, use the first concept in the array
  const parentForNewConcepts = seedConcept && concepts.some(c => c.name === seedConcept.name)
    ? seedConcept.name
    : concepts.length > 0
      ? concepts[0].name
      : null;

  // Construct user prompt - split into two cases based on whether detailsContext is provided
  let userPrompt: string;
  
  if (detailsContext) {
    // Prompt for lesson/flash card updates - simpler, focused on content updates
    userPrompt = `${seedInfo}You are updating lesson content or flash cards for the following concept(s):

${conceptsInfo}${detailsContext}

User instruction: ${prompt}

CRITICAL - DO NOT Generate New Concepts:
- You are ONLY updating lesson content or flash cards for existing concepts
- DO NOT create new concepts
- DO NOT modify the concept structure (name, description, parents, children)
- ONLY update the "lesson" or "flash" fields based on the user's request

Based on the instruction, return a JSON array with the updated concept(s). For each concept, include:
- "name": concept name (must match exactly one of the concepts above)
- "description": concept description (keep the same as the original)
- "parents": array of parent concept names (keep the same as the original)
- "children": array of child concept names (keep the same as the original)
- "lesson": markdown string for lesson content (include if user requests lesson generation, updates, or changes)
- "flash": array of flash card objects with "front" and "back" fields (include if user requests flash card generation, updates, or changes)

Important:
- Return ONLY the concepts that need to be updated with lesson or flash card content
- Maintain all existing fields (name, description, parents, children) exactly as they are
- Only modify the "lesson" or "flash" fields based on the user's instruction
- If the user asks to "generate flash cards", "create flashcards", "add flash cards", "update lesson", "improve lesson", "modify lesson", or similar, update the appropriate field(s)

Return JSON array only, no text, no extra fields.`;
  } else {
    // Prompt for general concept operations - full graph context and hierarchy instructions
    userPrompt = `${seedInfo}You are editing a concept graph. The user wants to modify the following concepts:

${conceptsInfo}${graphContext}

User instruction: ${prompt}

Based on the instruction, return a JSON array of concepts that should be:
- Added (new concepts with full structure)
- Updated (modified existing concepts - include all fields)
- Deleted (concepts with "delete": true flag)

For each concept, include:
- "name": concept name (required)
- "description": concept description (required)
- "parents": array of parent concept names (required)
- "children": array of child concept names (required)
- "delete": true if this concept should be deleted (optional, only for deletions)
- "lesson": markdown string for lesson content (optional, include if user requests lesson generation)
- "flash": array of flash card objects with "front" and "back" fields (optional, include if user requests flash card generation)

CRITICAL - Hierarchy Structure for NEW Concepts:
When generating NEW concepts (not updating existing ones):
1. Create a NEW shared parent concept that will contain all the new concepts
2. Name this parent concept appropriately based on the topic/theme of the new concepts (e.g., if generating concepts about "React Hooks", name it "React Hooks Concepts")
3. Set this parent concept's "parents" to: ${parentForNewConcepts ? `["${parentForNewConcepts}"]` : 'the appropriate parent from the existing graph'}
4. Set this parent concept's "children" to: [] (will be populated automatically)
5. For ALL other new concepts (the actual content concepts):
   - Set their "parents" to: [the name of the shared parent concept you just created]
   - Set their "children" to: [] (empty array - new concepts should not have children)
6. This creates a flat hierarchy: ${parentForNewConcepts || 'parent'} -> [shared parent] -> [all new concepts as siblings]
7. This structure makes viewing easier on the frontend by avoiding deep nesting and cognitive load

Example structure:
- If generating 3 new concepts about "State Management":
  - Create: "State Management Concepts" (parent, children: ["State Hook", "Effect Hook", "Context Hook"])
  - Create: "State Hook" (parent: ["State Management Concepts"], children: [])
  - Create: "Effect Hook" (parent: ["State Management Concepts"], children: [])
  - Create: "Context Hook" (parent: ["State Management Concepts"], children: [])

IMPORTANT: 
- Only apply this structure to NEW concepts
- When updating existing concepts, maintain their current parent/child relationships unless the user explicitly requests changes

IMPORTANT - Array Ordering:
- Return concepts in a JSON array sorted by learning complexity
- Order the array from most basic/foundational concepts (first) to most complex/advanced concepts (last)
- This represents the natural learning progression: simple concepts should appear earlier in the array, complex concepts should appear later
- The system will automatically assign sequence numbers based on the array order
- Unless the user's prompt specifically requests a different ordering, always sort by learning complexity
- If updating existing concepts, consider their complexity relative to other concepts in the response

Important:
- If updating a concept, include ALL fields (name, description, parents, children)
- If deleting a concept, set "delete": true
- The order of concepts in the returned array determines their learning sequence

Return JSON array only, no text, no extra fields.`;
  }

  // Call LLM
  const { stream = false, uid } = options;
  const response = await callLLM({
    systemPrompt: customOperationSystemPrompt,
    userPrompt: userPrompt,
    provider: 'deepseek',
    model: 'deepseek-chat',
    stream: stream,
    uid: uid,
  });

  // Build full prompt (system + user) for return
  const fullPrompt = `${customOperationSystemPrompt}\n\n${userPrompt}`;

  // If streaming, return the stream with prompt
  if (stream && response.stream && response.raw) {
    return {
      stream: response.raw,
      model: response.model,
      prompt: fullPrompt,
    } as any;
  }

  // Extract and parse JSON array
  let results: any[];
  try {
    results = extractJSONArray(response.content);
  } catch (error) {
    throw new Error(`Failed to parse LLM response: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }

  // Process results - separate deletions from additions/updates
  const normalizedResults: Concept[] = [];
  const deletions: Concept[] = [];

  for (const item of results) {
    // Preserve lesson and flash fields from LLM response before normalization
    const lesson = typeof item.lesson === 'string' ? item.lesson : undefined;
    const flash = Array.isArray(item.flash) ? item.flash.filter((card: any) => 
      card && typeof card === 'object' && typeof card.front === 'string' && typeof card.back === 'string'
    ).map((card: any) => ({
      front: card.front.trim(),
      back: card.back.trim(),
    })) : undefined;
    
    const normalized = normalizeConcept(item);
    
    // Restore lesson and flash fields if they were provided by LLM
    if (lesson !== undefined) {
      (normalized as any).lesson = lesson;
    }
    if (flash !== undefined && flash.length > 0) {
      (normalized as any).flash = flash;
    }
    
    // Check if this is a deletion
    if (item.delete === true) {
      deletions.push(normalized);
    } else {
      // Validate concept structure
      if (!validateConcept(normalized)) {
        const conceptName = (normalized as any).name || 'unknown';
        throw new Error(`Invalid concept in customOperation result: ${conceptName}`);
      }
      normalizedResults.push(normalized);
    }
  }

  // Assign sequence numbers based on array order (LLM has already sorted by learning complexity)
  // Use a base sequence number and increment for each concept
  const baseSequence = Date.now();
  normalizedResults.forEach((concept, index) => {
    concept.sequence = baseSequence + index;
  });

  // Process results - merge with existing graph if available
  // Note: normalizedResults already have sequence numbers assigned based on array order
  if (normalizedResults.length > 0 && graph) {
    // Get all existing concepts from the graph
    const existingConcepts = Array.from(graph.concepts.values());
    
    // Create a map of existing concepts by name for easy lookup and merging
    const existingConceptsMap = new Map<string, Concept>();
    existingConcepts.forEach(c => existingConceptsMap.set(c.name, c));
    
    // Identify new concepts (not in existing graph)
    const newConcepts = normalizedResults.filter(c => !existingConceptsMap.has(c.name));
    
    // For new concepts, ensure shared parent's children array is populated
    // Find concepts that are parents of new concepts (both new and existing)
    const parentConcepts = new Set<string>();
    newConcepts.forEach(concept => {
      concept.parents.forEach(parentName => {
        parentConcepts.add(parentName);
      });
    });
    
    // Update parent concepts in normalizedResults (new/updated concepts) to include new children
    normalizedResults.forEach(concept => {
      if (parentConcepts.has(concept.name)) {
        // This is a parent concept - ensure all its children are in its children array
        const childConcepts = newConcepts.filter(c => c.parents.includes(concept.name));
        const existingChildren = new Set(concept.children);
        childConcepts.forEach(child => {
          if (!existingChildren.has(child.name)) {
            concept.children.push(child.name);
          }
        });
      }
    });
    
    // Update existing parent concepts (like seedConcept) to include new children in their children arrays
    const updatedExistingConcepts: Concept[] = [];
    existingConcepts.forEach(existingConcept => {
      // Check if this existing concept is a parent of any new concepts
      const isParentOfNewConcepts = newConcepts.some(newConcept => 
        newConcept.parents.includes(existingConcept.name)
      );
      
      if (isParentOfNewConcepts) {
        // This existing concept is a parent of new concepts - update its children array
        const childConcepts = newConcepts.filter(c => c.parents.includes(existingConcept.name));
        const existingChildren = new Set(existingConcept.children);
        const updatedChildren = [...existingConcept.children];
        
        childConcepts.forEach(child => {
          if (!existingChildren.has(child.name)) {
            updatedChildren.push(child.name);
          }
        });
        
        // Only update if children array actually changed
        if (updatedChildren.length !== existingConcept.children.length) {
          const updatedConcept: Concept = {
            ...existingConcept,
            children: updatedChildren,
          };
          updatedExistingConcepts.push(updatedConcept);
        }
      }
    });
    
    // Merge new/updated concepts with existing ones (new concepts override existing)
    const allConcepts: Concept[] = [];
    const processedNames = new Set<string>();
    
    // First, add all existing concepts (excluding those that will be updated)
    existingConcepts.forEach(concept => {
      // Check if this concept is being updated or deleted
      const isUpdated = normalizedResults.some(c => c.name === concept.name);
      const isDeleted = deletions.some(c => (c.id || c.name) === (concept.id || concept.name));
      const isExistingParentUpdated = updatedExistingConcepts.some(c => c.name === concept.name);
      
      if (!isUpdated && !isDeleted && !isExistingParentUpdated) {
        allConcepts.push(concept);
        processedNames.add(concept.name);
      }
    });
    
    // Add updated existing concepts (like seedConcept with new children)
    updatedExistingConcepts.forEach(concept => {
      allConcepts.push(concept);
      processedNames.add(concept.name);
    });
    
    // Then, add all new/updated concepts (already have sequence numbers from array order)
    normalizedResults.forEach(concept => {
      allConcepts.push(concept);
      processedNames.add(concept.name);
    });
    
    // Sort all concepts by sequence (maintains LLM's sorted order)
    allConcepts.sort((a, b) => {
      // Handle undefined sequences (put them at the end)
      if (a.sequence === undefined && b.sequence === undefined) return 0;
      if (a.sequence === undefined) return 1;
      if (b.sequence === undefined) return -1;
      return a.sequence - b.sequence;
    });
        
    // Return all concepts (existing + new/updated) sorted by sequence
    const result = [...allConcepts, ...deletions.map(c => ({ ...c, delete: true } as any))] as OperationResult & { prompt?: string };
    result.prompt = fullPrompt;
    return result;
  } else if (normalizedResults.length > 0) {
    // Fallback: if no graph provided, concepts already have sequence numbers from array order
    // Return only new concepts if no graph provided
    const result = [...normalizedResults, ...deletions.map(c => ({ ...c, delete: true } as any))] as OperationResult & { prompt?: string };
    result.prompt = fullPrompt;
    return result;
  }

  // Return only deletions if no new/updated concepts
  const result = [...deletions.map(c => ({ ...c, delete: true } as any))] as OperationResult & { prompt?: string };
  result.prompt = fullPrompt;
  return result;
}
