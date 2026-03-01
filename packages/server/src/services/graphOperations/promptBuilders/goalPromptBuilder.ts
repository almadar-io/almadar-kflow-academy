/**
 * Prompt Builder for Goal Generation Operations
 * 
 * Generates clean, readable prompts for generating learning goals and milestones.
 */

import { createPromptBuilder } from './PromptBuilder';

export interface GoalPromptContext {
  anchorAnswer: string;
  questionAnswers: Array<{
    questionId: string;
    answer?: string | string[];
    isOther?: boolean;
    otherValue?: string;
    skipped?: boolean;
  }>;
  manualGoal?: {
    title: string;
    description?: string;
    type?: string;
    target?: string;
  };
  graphId?: string;
}

/**
 * Build system prompt for goal generation operations
 */
export function buildGoalSystemPrompt(): string {
  return createPromptBuilder()
    .section('Role', 'You are an expert learning advisor that helps users create structured, actionable learning goals.')
    .section('Output Format', 'Return a JSON object with the goal structure including title, description, type, target, estimatedTime, milestones, and customMetadata.')
    .buildSystem();
}

/**
 * Build prompt for manual goal (milestone generation only)
 */
export function buildManualGoalPrompt(context: GoalPromptContext): { system: string; user: string } {
  if (!context.manualGoal) {
    throw new Error('Manual goal is required for manual goal prompt');
  }

  const builder = createPromptBuilder()
    .withContext({
      title: context.manualGoal.title,
      description: context.manualGoal.description || '',
      type: context.manualGoal.type || '',
      target: context.manualGoal.target || ''
    });

  builder.section('Role', 'You are an expert learning advisor that helps create structured learning milestones.');
  builder.section('Goal', `**Title**: {{title}}\n\n**Description**: {{description}}\n\n**Type**: {{type}}\n\n**Target**: {{target}}`);
  builder.section('Task', 'Generate 3-5 milestones that break down this learning goal into achievable steps. Each milestone should:\n- Have a clear, specific title\n- Include a description of what will be accomplished\n- Be ordered from first to last');
  builder.rules([
    'Return JSON object with "milestones" array',
    'Each milestone must have: id, title, description, targetDate (can be null), completed (false)',
    'Milestones should be sequential and build upon each other'
  ]);

  return {
    system: builder.buildSystem(),
    user: builder.buildUser()
  };
}

/**
 * Build prompt for regular goal generation
 */
export function buildRegularGoalPrompt(context: GoalPromptContext): { system: string; user: string } {
  // Build answers context
  const answersContext = context.questionAnswers
    .filter(a => {
      if (a.skipped) return false;
      if (a.isOther && a.otherValue) return true;
      if (Array.isArray(a.answer)) return a.answer.length > 0;
      return !!a.answer;
    })
    .map(a => {
      let answerText: string;
      if (a.isOther && a.otherValue) {
        answerText = a.otherValue;
      } else if (Array.isArray(a.answer)) {
        answerText = a.answer.join(', ');
      } else {
        answerText = a.answer || '';
      }
      return `- ${answerText}`;
    })
    .join('\n');

  const builder = createPromptBuilder()
    .withContext({
      anchorAnswer: context.anchorAnswer,
      answersContext,
      graphId: context.graphId || ''
    });

  builder.section('Role', 'You are an expert learning advisor that helps users create structured, actionable learning goals.');
  builder.section('Key Principles', [
    'Create clear, specific, and achievable learning goals',
    'Infer the most appropriate goal type',
    'Extract relevant metadata from user answers',
    'Make goals actionable and measurable',
    'Consider user context and constraints'
  ].map(p => `- ${p}`).join('\n'));

  builder.section('Output Format', `Return a JSON object with this structure:
{
  "title": "Short, clear goal title",
  "description": "Detailed description",
  "type": "goal_type_here",
  "target": "Specific target",
  "estimatedTime": 120,
  "milestones": [
    {
      "id": "m1",
      "title": "Milestone title",
      "description": "Milestone description",
      "targetDate": null,
      "completed": false
    }
  ],
  "customMetadata": {
    // Domain-specific data
  }
}`);

  builder.section('Context', `The user answered "What's something you've always wanted to learn?" with:

"{{anchorAnswer}}"

${answersContext ? `\n\nUser's answers to follow-up questions:\n{{answersContext}}` : ''}${context.graphId ? `\n\nThis goal will be attached to graph ID: {{graphId}}` : ''}`);

  builder.section('Task', 'Generate a comprehensive learning goal based on this information. Extract relevant details from the answers to populate customMetadata (e.g., exam dates, target scores, deadlines, technologies, etc.).');

  builder.rules([
    'Return ONLY the JSON object, no additional text',
    'Include 3-5 milestones that break down the goal',
    'Extract metadata from answers (dates, scores, etc.)'
  ]);

  return {
    system: buildGoalSystemPrompt(),
    user: builder.buildUser()
  };
}

/**
 * Main function to build goal generation prompt
 */
export function buildGoalGenerationPrompt(context: GoalPromptContext): { system: string; user: string } {
  if (context.manualGoal) {
    return buildManualGoalPrompt(context);
  } else {
    return buildRegularGoalPrompt(context);
  }
}

