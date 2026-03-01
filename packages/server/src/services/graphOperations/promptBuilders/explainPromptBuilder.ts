/**
 * Prompt Builder for Explain Operations
 * 
 * Generates clean, readable prompts for explaining concepts.
 */

import { createPromptBuilder } from './PromptBuilder';
import { GraphNode } from '../../../types/nodeBasedKnowledgeGraph';
import { LearningGoal } from '../../../types/goal';

export interface ExplainPromptContext {
  concept: GraphNode;
  seedConcept?: GraphNode;
  learningGoal?: LearningGoal;
  difficulty?: 'beginner' | 'intermediate' | 'advanced';
  focus?: string;
  simple?: boolean;
  minimal?: boolean;
  prerequisites?: GraphNode[];
}

/**
 * Build system prompt for explain operations
 */
export function buildExplainSystemPrompt(): string {
  return createPromptBuilder()
    .section('Role', 'You are an expert instructional designer who creates engaging, comprehensive learning content.')
    .section('Output Format', 'Return your explanation in Markdown format with proper formatting:\n- Use headings, lists, and code blocks\n- Include examples when helpful\n- Use clear, structured sections')
    .buildSystem();
}

/**
 * Build user prompt for explain operations
 */
export function buildExplainPrompt(context: ExplainPromptContext): { system: string; user: string } {
  const builder = createPromptBuilder()
    .withContext({
      conceptName: context.concept.properties.name,
      conceptDescription: context.concept.properties.description || '',
      difficulty: context.difficulty || 'intermediate',
      focus: context.focus || ''
    });

  // Concept Context
  builder.section('Concept to Explain', `**Name**: {{conceptName}}\n\n**Description**: {{conceptDescription}}`);

  // Learning Context
  if (context.seedConcept) {
    builder.section('Learning Context', `The learner is studying: **${context.seedConcept.properties.name}**`);
  }

  if (context.learningGoal) {
    builder.section('Learning Goal', `**Goal**: ${context.learningGoal.title}\n\n${context.learningGoal.description}`);
  }

  // Difficulty Level
  if (context.difficulty === 'beginner') {
    builder.section('Difficulty Level', 'Use simple language, avoid jargon, and provide clear explanations with examples. Assume minimal prior knowledge.');
  } else if (context.difficulty === 'advanced') {
    builder.section('Difficulty Level', 'Provide detailed, nuanced explanations suitable for someone with substantial prior knowledge.');
  }

  // Prerequisites
  if (context.prerequisites && context.prerequisites.length > 0) {
    builder.list('Prerequisites', context.prerequisites.map(p => p.properties.name));
  }

  // Task
  const taskParts: string[] = [
    'Create a comprehensive explanation for {{conceptName}}',
    'Use Markdown formatting',
    'Include examples, analogies, and real-world applications when helpful'
  ];

  if (!context.minimal) {
    taskParts.push('Include practice questions with Bloom\'s taxonomy levels');
    taskParts.push('Use learning science tags: <activate>, <connect>, <reflect>, <bloom>');
  }

  builder.section('Task', taskParts.map((t, i) => `${i + 1}. ${t}`).join('\n'));

  // Learning Science Tags (if not minimal)
  if (!context.minimal && !context.simple) {
    const prerequisiteNames = context.prerequisites?.map(p => p.properties.name) || [];
    const parentsList = prerequisiteNames.length > 0 
      ? prerequisiteNames.map(p => `- **${p}**: [one-sentence reminder of what this concept means]`).join('\n   ')
      : '- No prior concepts (this is foundational)';
    
    builder.section('Learning Science Tags (REQUIRED)', `
**CRITICAL: All tags MUST have proper opening AND closing tags. Never leave tags unclosed.**

1. **Activation Tag** - MUST be the very first element in the lesson:
   <activate>
   A thought-provoking question about prior knowledge (1-2 sentences)
   </activate>

2. **Connection Tag** - Immediately after activation:
   <connect>
   This builds on:
   ${parentsList}
   </connect>
   ${prerequisiteNames.length === 0 ? '(You may skip <connect> tag if no parent concepts)' : ''}

3. **Reflection Tags** - Insert 1-2 reflection prompts throughout the lesson (after key concepts):
   <reflect>
   One sentence question encouraging elaboration or real-world connections
   </reflect>

4. **Bloom's Taxonomy Tags** - Wrap ALL practice questions with cognitive level:
   <bloom level="[remember|understand|apply|analyze|evaluate|create]">
   <question>Your question here</question>
   <answer>Your answer here</answer>
   </bloom>
   - Use at least 2-3 different Bloom levels
   - Progress from lower to higher cognitive levels

**Tag Rules:**
- <activate> MUST be the very first element
- <connect> immediately after <activate>
- <reflect> tags inline within lesson content (1-2 total)
- <bloom> wraps existing <question>/<answer> pairs
- ALL tags MUST be properly closed (</activate>, </connect>, </reflect>, </bloom>)
- Do NOT nest tags incorrectly or leave any tags unclosed`);
  }

  // Rules
  builder.rules([
    'Use GitHub-flavored Markdown',
    'Include code snippets with language identifiers when relevant',
    'Be precise and factual',
    'Tone should be supportive and clear',
    'If information is uncertain, state assumptions'
  ]);

  return {
    system: buildExplainSystemPrompt(),
    user: builder.buildUser()
  };
}

