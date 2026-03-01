/**
 * Prompt Builder for Layer Practice Generation
 * 
 * Generates clean, readable prompts for generating practice exercises and reviews.
 */

import { createPromptBuilder } from './PromptBuilder';
import { GraphNode } from '../../../types/nodeBasedKnowledgeGraph';

export interface LayerPracticePromptContext {
  concepts: GraphNode[];
  layerGoal: string;
  layerNumber: number;
  seedConcept?: GraphNode;
  difficulty?: 'beginner' | 'intermediate' | 'advanced';
  focus?: string;
}

/**
 * Build system prompt for layer practice generation
 */
export function buildLayerPracticeSystemPrompt(): string {
  return createPromptBuilder()
    .section('Role', 'You are an expert educational content creator. Your task is to create a solution-focused review that helps learners understand how concepts apply to real-world goals.')
    .section('Content Format', `Create content in Markdown format that:
1. First presents a complete solution (project, implementation, or approach) that addresses the learning goal
2. Then explains how each concept learned relates to and is used in that solution
3. Uses clear, engaging language appropriate for the learner's level`)
    .section('Structure', `Structure the content as follows:
- Start with a section presenting the complete solution to the goal (this is the "answer" or "solution")
- Follow with sections for each concept, explaining how it relates to the solution (these are like "questions" about each concept's role, followed by "answers" explaining their application)

Format it naturally without explicit question/answer tags - just present it as flowing text with clear sections. Use headings to separate the solution from concept explanations.`)
    .section('Markdown Formatting', `Use Markdown formatting for:
- Code blocks with syntax highlighting (triple backticks with language)
- Lists (bulleted or numbered)
- Emphasis (asterisks for italic or bold)
- Headings (hash symbols for sections)
- Inline code (single backticks)
- Links and other Markdown features`)
    .buildSystem();
}

/**
 * Build user prompt for layer practice generation
 */
export function buildLayerPracticePrompt(context: LayerPracticePromptContext): { system: string; user: string } {
  // Build concept list
  const conceptList = context.concepts.map(node => {
    const name = node.properties.name || node.id;
    const desc = node.properties.description ? ` - ${node.properties.description}` : '';
    return `- ${name}${desc}`;
  }).join('\n');

  // Build difficulty text
  const difficultyText = context.difficulty 
    ? context.difficulty === 'beginner' 
      ? 'beginner-level' 
      : context.difficulty === 'intermediate' 
        ? 'intermediate-level' 
        : 'advanced-level'
    : '';

  // Build seed info
  const seedInfo = context.seedConcept
    ? `\n\n**Overall Learning Context:**
The learner is studying the broader topic "${context.seedConcept.properties.name}".${context.seedConcept.properties.description ? ` This topic is about: ${context.seedConcept.properties.description}` : ''}${context.difficulty ? ` The learner is at a ${difficultyText} level.` : ''}${context.focus ? ` The learning focus for this path is: "${context.focus}".` : ''}`
    : '';

  // Build context guidance
  const contextGuidance = context.seedConcept
    ? `\n\nEnsure the content connects back to "${context.seedConcept.properties.name}" and shows how this layer's concepts fit into the broader learning journey.`
    : '';

  const builder = createPromptBuilder()
    .withContext({
      layerNumber: context.layerNumber,
      layerGoal: context.layerGoal,
      conceptList,
      seedInfo,
      contextGuidance
    });

  builder.section('Task', `Create a solution-focused review for Level {{layerNumber}} with the following learning goal:

**Learning Goal:** {{layerGoal}}

**Concepts Learned:**
{{conceptList}}{{seedInfo}}

Generate content that:
1. First presents a complete solution that addresses the learning goal (this could be a project, implementation, approach, or method)
2. Then for each concept, explain how it relates to and is used in that solution
3. Connect everything back to the overall learning topic and ensure the content is appropriate for the learner's level{{contextGuidance}}

Structure it as:
- A main section with the solution/implementation
- Followed by sections for each concept showing how it applies to the solution
- Make connections to how this relates to the broader learning topic

Write it naturally without explicit question/answer tags - just flowing text with clear headings. Focus on showing how each concept contributes to solving the goal and how it fits into the overall learning journey.

Return only the Markdown text, no additional formatting or JSON.`);

  return {
    system: buildLayerPracticeSystemPrompt(),
    user: builder.buildUser()
  };
}

