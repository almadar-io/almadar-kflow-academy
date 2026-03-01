import { callLLM } from '../services/llm';
import type {
  GenerateGoalOptions,
  GenerateGoalResult,
  Milestone,
} from '../types/goal';
import { generateConceptId } from '../utils/uuid';

/**
 * Generates a learning goal based on anchor answer and question responses.
 * This operation handles all LLM interactions for goal generation.
 * 
 * @param options - Options including anchor answer, question answers, and context
 * @returns Generated goal with metadata
 */
export async function generateGoal(
  options: GenerateGoalOptions
): Promise<GenerateGoalResult | { stream: any; model: string }> {
  const { anchorAnswer, questionAnswers, graphId, uid, manualGoal, stream } = options;

  if (!anchorAnswer || anchorAnswer.trim().length === 0) {
    throw new Error('Anchor answer is required for generating a goal');
  }

  // Determine which prompts to use (manual goal vs regular goal generation)
  let systemPrompt: string;
  let userPrompt: string;
  
  if (manualGoal) {
    // Get prompts for manual goal (only generates milestones)
    const manualPrompts = generateGoalFromManualEntry(manualGoal, anchorAnswer);
    systemPrompt = manualPrompts.systemPrompt;
    userPrompt = manualPrompts.userPrompt;
  } else {
    // Build prompts for regular goal generation
    const answersContext = questionAnswers
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
          // Handle multiple selections - join with commas
          answerText = a.answer.join(', ');
        } else {
          answerText = a.answer || '';
        }
        return `- ${answerText}`;
      })
      .join('\n');

    systemPrompt = `You are an expert learning advisor that helps users create structured, actionable learning goals.

Your task is to analyze a user's learning aspiration and their answers to follow-up questions, then generate a comprehensive learning goal.

Key principles:
- Create a clear, specific, and achievable learning goal
- Infer the most appropriate goal type (common types: "certification", "skill_mastery", "language_level", "project_completion", or suggest a custom type if it fits better)
- Extract relevant metadata from the user's answers (timeline, target scores, deadlines, etc.)
- Make the goal actionable and measurable
- Consider the user's context and constraints

Output format:
Return a JSON object with this structure:
{
  "title": "Short, clear goal title",
  "description": "Detailed description of the learning goal",
  "type": "goal_type_here",
  "target": "Specific target (e.g., 'AWS Certified Solutions Architect', 'B1 Spanish', 'Publish research paper')",
  "estimatedTime": 120,  // Estimated hours (optional, can be null)
  "milestones": [
    {
      "id": "m1",
      "title": "Milestone title",
      "description": "Milestone description",
      "targetDate": null,  // timestamp or null
      "completed": false
    }
  ],
  "customMetadata": {
    // Domain-specific data extracted from answers
    // e.g., {"examDate": "2024-12-31", "targetScore": 320, "provider": "AWS"}
  }
}

Return ONLY the JSON object, no additional text.`;

    userPrompt = `The user answered the anchor question "What's something you've always wanted to learn?" with:

"${anchorAnswer}"

${answersContext ? `\n\nUser's answers to follow-up questions:\n${answersContext}` : ''}${graphId ? `\n\nThis goal will be attached to graph ID: ${graphId}` : ''}

Generate a comprehensive learning goal based on this information. Extract relevant details from the answers to populate customMetadata (e.g., exam dates, target scores, deadlines, technologies, etc.).

Return the JSON object with the goal structure.`;
  }

  const response = await callLLM({
    systemPrompt,
    userPrompt,
    provider: 'deepseek',
    model: 'deepseek-chat',
    uid,
    stream,
  });

  // If streaming, return the stream
  if (stream && response.stream && response.raw) {
    return {
      stream: response.raw,
      model: response.model || 'deepseek-chat',
    } as any;
  }

  const content = response.content ?? '';
  if (!content.trim()) {
    throw new Error('Failed to generate goal: empty response from LLM');
  }

  // Parse response based on whether it's a manual goal or regular goal
  if (manualGoal) {
    // For manual goals, parse milestone data
    let milestoneData: {
      type?: string;
      target?: string;
      milestones?: any[];
    };

    try {
      // Try to extract JSON object
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        milestoneData = JSON.parse(jsonMatch[0]);
      } else {
        // Fallback: try parsing entire content
        milestoneData = JSON.parse(content);
      }
    } catch (error) {
      throw new Error(`Failed to parse LLM response: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    // Normalize milestones
    const milestones: Milestone[] = (milestoneData.milestones || []).map((m: any, index: number) => ({
      id: m.id || `m${index + 1}`,
      title: m.title || 'Milestone',
      description: m.description,
      targetDate: m.targetDate || undefined,
      completed: m.completed || false,
      completedAt: m.completedAt || undefined,
    }));

    const now = Date.now();
    // TypeScript: manualGoal is guaranteed to be defined in this block
    const mg: {
      title: string;
      description: string;
      type?: string;
      target?: string;
      estimatedTime?: number;
    } = manualGoal!;
    const goal = {
      id: generateConceptId(),
      graphId: graphId || '', // Will be set when graph is created
      title: mg.title, // Use exact title from manual entry - NEVER modified
      description: mg.description, // Use exact description from manual entry - NEVER modified
      type: mg.type || milestoneData.type || 'custom', // Use provided type, inferred type, or default to 'custom'
      target: mg.target || milestoneData.target || mg.title, // Use provided target, inferred target, or fallback to title
      estimatedTime: mg.estimatedTime,
      milestones, // Generated milestones
      shortTermGoals: [], // Will be populated from graph layers
      customMetadata: {},
      createdAt: now,
      updatedAt: now,
    };

    return {
      goal,
      model: response.model,
    };
  } else {
    // For regular goals, parse full goal data
    let goalData: {
      title: string;
      description: string;
      type: string;
      target: string;
      estimatedTime?: number;
      milestones?: any[];
      customMetadata?: Record<string, any>;
    };

    try {
      // Try to extract JSON object
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        goalData = JSON.parse(jsonMatch[0]);
      } else {
        // Fallback: try parsing entire content
        goalData = JSON.parse(content);
      }
    } catch (error) {
      throw new Error(`Failed to parse LLM response: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    // Validate required fields
    if (!goalData.title || !goalData.description || !goalData.type || !goalData.target) {
      throw new Error('LLM response missing required fields: title, description, type, or target');
    }

    // Normalize milestones
    const milestones: Milestone[] = (goalData.milestones || []).map((m: any, index: number) => ({
      id: m.id || `m${index + 1}`,
      title: m.title || 'Milestone',
      description: m.description,
      targetDate: m.targetDate || undefined,
      completed: m.completed || false,
      completedAt: m.completedAt || undefined,
    }));

    const now = Date.now();
    const goal = {
      id: generateConceptId(),
      graphId: graphId || '', // Will be set when graph is created
      title: goalData.title,
      description: goalData.description,
      type: goalData.type, // Can be common type or custom type
      target: goalData.target,
      estimatedTime: goalData.estimatedTime,
      milestones,
      shortTermGoals: [], // Will be populated from graph layers
      customMetadata: goalData.customMetadata || {},
      createdAt: now,
      updatedAt: now,
    };

    return {
      goal,
      model: response.model,
    };
  }
}

/**
 * Generate prompts for manual goal entry - preserves the exact goal and only generates milestones
 * Returns the prompts to be used for LLM call (does not call LLM itself)
 */
function generateGoalFromManualEntry(
  manualGoal: {
    title: string;
    description: string;
    type?: string;
    target?: string;
    estimatedTime?: number;
  },
  anchorAnswer: string
): { systemPrompt: string; userPrompt: string } {
  const systemPrompt = `You are an expert learning advisor that helps users create structured, actionable learning goals.

Your task is to generate milestones for a learning goal that the user has manually specified. You must NOT modify the goal title or description - these are FIXED and must be used exactly as provided.

Key principles:
- The goal title and description are FIXED and must be used exactly as provided
- If type and target are not provided, you may infer appropriate values from the description, but do NOT modify the title or description
- Your ONLY task is to generate appropriate milestones that will help the learner achieve this goal
- Determine the optimal number of milestones based on the complexity and scope of the goal
- Create a well-paced learning progression: not too few (missing important checkpoints) and not too many (overwhelming or too granular)
- Consider the estimated time, goal complexity, and natural learning phases when determining milestone count
- Milestones should be sequential and build upon each other
- Each milestone should represent a meaningful learning checkpoint or achievement
- Make milestones specific, measurable, and aligned with the goal

Output format:
Return a JSON object with this structure:
{
  "type": "inferred_type_if_not_provided",  // Only include if type was not provided in manual goal
  "target": "inferred_target_if_not_provided",  // Only include if target was not provided in manual goal
  "milestones": [
    {
      "id": "m1",
      "title": "Milestone title",
      "description": "Milestone description",
      "targetDate": null,  // timestamp or null
      "completed": false
    }
  ]
}

Return ONLY the JSON object, no additional text.`;

  const userPrompt = `The user has manually specified this learning goal:

**Title**: ${manualGoal.title}
**Description**: ${manualGoal.description}
${manualGoal.type ? `**Type**: ${manualGoal.type}` : ''}
${manualGoal.target ? `**Target**: ${manualGoal.target}` : ''}
${manualGoal.estimatedTime ? `**Estimated Time**: ${manualGoal.estimatedTime} hours` : ''}

The user's anchor answer was: "${anchorAnswer}"

Generate an appropriate number of milestones that will help the learner achieve this goal. Determine the optimal count based on:
- The complexity and scope of the goal (simple goals may need fewer milestones, complex goals may need more)
- Natural learning phases and progression points
- The estimated time (if provided) - ensure milestones are spaced appropriately
- Meaningful checkpoints that represent real progress toward the goal

The milestones should:
- Break down the goal into logical, sequential steps that build upon each other
- Be specific and measurable, representing clear learning achievements
- Have a good learning pace - not too rushed (too few milestones) or too granular (too many milestones)
- Align with the goal type and target
- Each milestone should feel like a meaningful accomplishment on the path to the overall goal

Return ONLY the JSON object with milestones.`;

  return {
    systemPrompt,
    userPrompt,
  };
}

