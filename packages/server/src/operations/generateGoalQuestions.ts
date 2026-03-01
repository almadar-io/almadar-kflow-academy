import { callLLM } from '../services/llm';
import type {
  GenerateGoalQuestionsResult,
  GenerateGoalQuestionsOptions,
  GoalQuestion,
} from '../types/goal';
import { getAllUserProgress } from '../services/userProgressService';

/**
 * Generates adaptive questions for learning goal refinement based on user's anchor answer.
 * 
 * @param options - Options including anchor answer and context
 * @returns Generated questions with inferred goal type and domain
 */
export async function generateGoalQuestions(
  options: GenerateGoalQuestionsOptions
): Promise<GenerateGoalQuestionsResult> {
  const { anchorAnswer, goalDescription, goalType, domain, uid } = options;

  if (!anchorAnswer || anchorAnswer.trim().length === 0) {
    throw new Error('Anchor answer is required for generating goal questions');
  }

  // Get user's current knowledge level (derived from UserProgress)
  let currentKnowledgeContext = '';
  if (uid) {
    try {
      // Get all user progress to find mastered concepts
      const allProgress = await getAllUserProgress(uid);
      const masteredConcepts = allProgress.filter(p => p.masteryLevel === 3);
      
      if (masteredConcepts.length > 0) {
        const conceptNames = masteredConcepts
          .slice(0, 10) // Limit to 10 for context
          .map(p => p.conceptName)
          .join(', ');
        currentKnowledgeContext = `\n\nUser's current knowledge: The user has mastered: ${conceptNames}.`;
      } else {
        currentKnowledgeContext = `\n\nUser's current knowledge: The user is a beginner with no mastered concepts yet.`;
      }
    } catch (error) {
      // If we can't get progress, continue without it
      console.warn('Could not fetch user progress for goal questions:', error);
    }
  }

  const systemPrompt = `You are an expert learning advisor that helps users refine their learning goals by asking insightful questions.

Your task is to analyze a user's learning aspiration and generate 3-5 follow-up questions that will help clarify and refine their learning goal.

Key principles:
- Generate questions that help understand: motivation, constraints, timeline, success criteria, and context
- Always provide 3-5 multiple choice options for each question
- DO NOT include "Other (specify)" or "Other" as an option - this is automatically added by the system
- Questions should be specific to the user's stated learning interest
- Make questions conversational and easy to understand
- Avoid asking about things that can be derived from user progress data

Question types:
- multiple_choice: Standard multiple choice with 3-5 options
- text: Open-ended but provide 3-5 suggested options as starting points
- scale: Rating scale (1-5, 1-10, etc.) with labeled points
- yes_no: Simple yes/no question

Selection types (for multiple_choice questions):
- "single": User must pick ONE answer (use for: time commitment, priority level, deadline urgency, etc.)
- "multi": User can pick MULTIPLE answers (use for: interests, goals, topics to cover, skills to develop, etc.)

Output format:
Return a JSON array of question objects. Each question should have:
- id: A unique identifier (e.g., "q1", "q2")
- question: The question text
- type: One of "multiple_choice", "text", "scale", "yes_no"
- selectionType: For "multiple_choice" type, specify "single" or "multi" based on whether the question requires one answer or allows multiple
- options: Array of 3-5 option strings
- helpText: Optional helpful context for the question

Also infer:
- goalType: Suggested goal type (common types: "certification", "skill_mastery", "language_level", "project_completion", or a custom type if appropriate)
- domain: The learning domain/topic area

Return ONLY a JSON object with this structure:
{
  "questions": [...],
  "inferredGoalType": "...",
  "suggestedDomain": "..."
}`;

  const userPrompt = `The user answered the anchor question "What's something you've always wanted to learn?" with:

"${anchorAnswer}"${goalDescription ? `\n\nAdditional context: ${goalDescription}` : ''}${goalType ? `\n\nSuggested goal type: ${goalType}` : ''}${domain ? `\n\nDomain: ${domain}` : ''}${currentKnowledgeContext}

Generate 3-5 follow-up questions that will help refine this learning goal. Make questions specific to what the user wants to learn.

For each question:
- Provide 3-5 relevant options (do NOT include "Other" or "Other (specify)" - it's added automatically)
- Make options specific to the user's learning interest
- Consider the user's current knowledge level when appropriate
- Focus on understanding: motivation, timeline, constraints, and success criteria
- For multiple_choice questions, decide if it should be "single" (one answer required, e.g., time commitment, priority) or "multi" (multiple answers allowed, e.g., interests, topics, skills)

Return the JSON object with questions, inferred goal type, and suggested domain.`;

  const response = await callLLM({
    systemPrompt,
    userPrompt,
    provider: 'deepseek',
    model: 'deepseek-chat',
    uid,
  });

  const content = response.content ?? '';
  if (!content.trim()) {
    throw new Error('Failed to generate goal questions: empty response from LLM');
  }

  // Extract JSON from response
  let result: {
    questions: any[];
    inferredGoalType?: string;
    suggestedDomain?: string;
  };

  try {
    // Try to extract JSON object
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      result = JSON.parse(jsonMatch[0]);
    } else {
      // Fallback: try parsing entire content
      result = JSON.parse(content);
    }
  } catch (error) {
    throw new Error(`Failed to parse LLM response: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }

  // Validate and normalize questions
  const questions: GoalQuestion[] = (result.questions || []).map((q: any, index: number) => {
    // Ensure all required fields
    const question: GoalQuestion = {
      id: q.id || `q${index + 1}`,
      question: q.question || '',
      type: q.type || 'multiple_choice',
      selectionType: q.selectionType || 'multi', // Default to 'multi' for backward compatibility
      options: Array.isArray(q.options) && q.options.length > 0 
        ? q.options 
        : ['Option 1', 'Option 2', 'Option 3'], // Fallback
      allowOther: true, // Always true
      allowSkip: true, // Always true
      required: false, // Default to false since skip is allowed
      helpText: q.helpText,
    };

    // Validate question text
    if (!question.question || question.question.trim().length === 0) {
      throw new Error(`Invalid question at index ${index}: missing question text`);
    }

    // Ensure minimum 3 options
    if (question.options.length < 3) {
      question.options = [...question.options, ...Array(3 - question.options.length).fill('Additional option')];
    }

    return question;
  });

  // Ensure we have at least 3 questions
  if (questions.length < 3) {
    throw new Error(`Expected at least 3 questions, got ${questions.length}`);
  }

  return {
    questions,
    inferredGoalType: result.inferredGoalType,
    suggestedDomain: result.suggestedDomain,
    model: response.model,
  };
}

