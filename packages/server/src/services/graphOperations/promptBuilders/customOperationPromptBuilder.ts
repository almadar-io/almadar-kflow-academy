/**
 * Prompt Builder for Custom Operation
 * 
 * Generates clean, readable prompts for custom user-prompted graph modifications.
 */

import { createPromptBuilder } from './PromptBuilder';
import { GraphNode } from '../../../types/nodeBasedKnowledgeGraph';

export interface CustomOperationPromptContext {
  targetNodes: GraphNode[];
  userPrompt: string;
  seedConcept?: GraphNode;
  graph?: {
    nodes: Record<string, GraphNode>;
    relationships?: Array<{
      source: string;
      target: string;
      type: string;
    }>;
  };
  details?: {
    lesson?: boolean;
    flashCards?: boolean;
  };
  parentForNewConcepts?: string;
}

/**
 * Build system prompt for custom operations
 */
export function buildCustomOperationSystemPrompt(): string {
  return createPromptBuilder()
    .section('Role', 'You are an expert concept graph editor that helps modify learning paths and concept structures.')
    .section('Capabilities', [
      'Add new concepts to the graph',
      'Update existing concepts (modify name, description, parents, children)',
      'Delete concepts from the graph',
      'Perform complex operations that combine multiple actions',
      'Generate lessons for concepts (when user requests "generate a lesson" or similar)',
      'Generate flash cards for concepts (when user requests "generate flash cards" or similar, requires existing lesson)'
    ].map(c => `- ${c}`).join('\n'))
    .section('Output Format', 'Return ONLY a JSON array of concepts, no additional text or commentary.')
    .buildSystem();
}

/**
 * Build user prompt for custom operations
 */
export function buildCustomOperationPrompt(context: CustomOperationPromptContext): { system: string; user: string } {
  const builder = createPromptBuilder()
    .withContext({
      userPrompt: context.userPrompt
    });

  // Build concepts info with parent lookup from relationships
  const conceptsInfo = context.targetNodes.map(node => {
    const name = node.properties.name || node.id;
    const description = node.properties.description || 'No description';
    
    // Find parent concepts using relationships
    const parents: string[] = [];
    if (context.graph && context.graph.relationships) {
      // Find relationships where this node is the target and type is 'hasParent'
      const parentRelationships = context.graph.relationships.filter(rel => 
        rel.target === node.id && rel.type === 'hasParent'
      );
      
      // Get parent node names
      parentRelationships.forEach(rel => {
        const parentNode = context.graph!.nodes[rel.source];
        if (parentNode && parentNode.properties?.name) {
          parents.push(parentNode.properties.name);
        }
      });
    }
    
    return `- "${name}": ${description} (parents: ${parents.join(', ') || 'none'})`;
  }).join('\n');

  // Build seed info
  const seedInfo = context.seedConcept 
    ? `\n\nThis is part of the broader topic: "${context.seedConcept.properties.name}".`
    : '';

  // Build graph context
  let graphContext = '';
  if (context.graph) {
    const allNodes = Object.values(context.graph.nodes);
    if (allNodes.length > 0) {
      const nodesInfo = allNodes
        .slice(0, 20) // Limit for readability
        .map(node => `"${node.properties.name || node.id}": ${node.properties.description || 'No description'}`)
        .join(', ');
      graphContext = `\n\nExisting concepts in the graph: ${nodesInfo}${allNodes.length > 20 ? `\n(And ${allNodes.length - 20} more concepts)` : ''}.`;
    }
  }

  // Build details context
  let detailsContext = '';
  if (context.details) {
    const contextParts: string[] = [];
    if (context.details.lesson) {
      contextParts.push('The user may request lesson generation. If so, include a "lesson" field with markdown-formatted lesson content.');
    }
    if (context.details.flashCards) {
      contextParts.push('The user may request flash card generation. If so, include a "flash" field with an array of flash card objects (each with "front" and "back" fields).');
    }
    if (contextParts.length > 0) {
      detailsContext = `\n\n${contextParts.join('\n')}`;
    }
  }

  // Task section
  builder.section('Task', `You are editing a concept graph. The user wants to modify the following concepts:

${conceptsInfo}${seedInfo}${graphContext}

User instruction: {{userPrompt}}${detailsContext}

Based on the instruction, return a JSON array of concepts that should be:
- Added (new concepts with full structure)
- Updated (modified existing concepts - include all fields)
- Deleted (concepts with "delete": true flag)`);

  // Concept structure
  builder.section('Concept Structure', `For each concept, include:
- "name": concept name (required)
- "description": concept description (required)
- "parents": array of parent concept names (required)
- "children": array of child concept names (required)
- "delete": true if this concept should be deleted (optional, only for deletions)
- "lesson": markdown string for lesson content (optional, include if user requests lesson generation)
- "flash": array of flash card objects with "front" and "back" fields (optional, include if user requests flash card generation)`);

  // Hierarchy structure for new concepts
  if (context.parentForNewConcepts) {
    builder.section('Hierarchy Structure for NEW Concepts', `When generating NEW concepts (not updating existing ones):
1. Create a NEW shared parent concept that will contain all the new concepts
2. Name this parent concept appropriately based on the topic/theme
3. Set this parent concept's "parents" to: ["${context.parentForNewConcepts}"]
4. Set this parent concept's "children" to: [] (will be populated automatically)
5. For ALL other new concepts:
   - Set their "parents" to: [the name of the shared parent concept you just created]
   - Set their "children" to: [] (empty array)
6. This creates a flat hierarchy: ${context.parentForNewConcepts} -> [shared parent] -> [all new concepts as siblings]

IMPORTANT: Only apply this structure to NEW concepts. When updating existing concepts, maintain their current parent/child relationships unless the user explicitly requests changes.`);
  }

  // Array ordering
  builder.section('Array Ordering', `**CRITICAL**: Return concepts in the array sorted by learning complexity:
- Order from most basic/foundational concepts (first in array) to most complex/advanced concepts (last in array)
- This represents the natural learning progression
- The system will automatically assign sequence numbers based on the array order
- Unless the user's prompt specifically requests a different ordering, always sort by learning complexity`);

  // Rules
  builder.rules([
    'If updating a concept, include ALL fields (name, description, parents, children)',
    'If deleting a concept, set "delete": true',
    'The order of concepts in the returned array determines their learning sequence',
    'Maintain consistency with the existing graph structure',
    'Preserve parent-child relationships unless explicitly instructed to change them',
    'Return JSON array only, no text, no extra fields'
  ]);

  return {
    system: buildCustomOperationSystemPrompt(),
    user: builder.buildUser()
  };
}

