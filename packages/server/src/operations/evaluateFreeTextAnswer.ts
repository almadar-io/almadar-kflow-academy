import { callLLM } from '../services/llm';

export interface EvaluateFreeTextAnswerOptions {
  question: string;
  studentAnswer: string;
  correctAnswer?: string; // Reference answer or key points
  maxPoints: number;
  context?: string; // Additional context like lesson content
}

export interface EvaluateFreeTextAnswerResult {
  score: number; // Points earned (0 to maxPoints)
  percentage: number; // Percentage score (0-100)
  feedback: string; // Detailed feedback for the student
  isCorrect: boolean; // Whether the answer is considered correct (for pass/fail)
  strengths: string[]; // What the student did well
  weaknesses: string[]; // Areas for improvement
  model: string;
}

/**
 * Evaluates a free-text answer (essay or short answer) using LLM.
 * Provides detailed feedback, scoring, and identifies strengths/weaknesses.
 * 
 * @param options - Evaluation options
 * @returns Evaluation result with score, feedback, and analysis
 */
export async function evaluateFreeTextAnswer(
  options: EvaluateFreeTextAnswerOptions
): Promise<EvaluateFreeTextAnswerResult> {
  const {
    question,
    studentAnswer,
    correctAnswer,
    maxPoints,
    context = '',
  } = options;

  if (!question || !studentAnswer) {
    throw new Error('Question and student answer are required');
  }

  if (maxPoints <= 0) {
    throw new Error('Max points must be greater than 0');
  }

  const systemPrompt = `You are an expert educational evaluator specializing in assessing student responses to open-ended questions.

Your task is to evaluate student answers fairly and provide constructive feedback. You should:
- Assess understanding, not just memorization
- Consider partial credit for partially correct answers
- Provide specific, actionable feedback
- If the answer is incorrect or partially correct, ALWAYS include the correct answer in your feedback
- Identify both strengths and areas for improvement
- Be encouraging but honest
- Score based on accuracy, completeness, and understanding

Scoring Guidelines:
- 0-30%: Answer shows minimal understanding or is largely incorrect
- 31-60%: Answer shows partial understanding but has significant gaps or errors
- 61-80%: Answer demonstrates good understanding with minor gaps or inaccuracies
- 81-100%: Answer demonstrates strong understanding and is largely or completely correct

IMPORTANT: If the student's answer is incorrect or partially correct, your feedback MUST explicitly state the correct answer. Do not just explain why the answer is wrong - provide the correct answer clearly.

Return a JSON object with:
- "score": Points earned (0 to maxPoints)
- "percentage": Percentage score (0-100)
- "feedback": Detailed, constructive feedback (2-4 sentences). If the answer is wrong, MUST include the correct answer.
- "isCorrect": Boolean indicating if answer is considered correct (typically 70%+ for passing)
- "strengths": Array of 1-3 specific strengths in the answer
- "weaknesses": Array of 1-3 specific areas for improvement`;

  const contextText = context ? `\n\nLesson Context:\n${context}\n` : '';
  const correctAnswerText = correctAnswer ? `\n\nReference Answer/Key Points:\n${correctAnswer}\n` : '';

  const userPrompt = `Evaluate the following student answer to an assessment question.

Question: ${question}
${contextText}
Student Answer: ${studentAnswer}
${correctAnswerText}
Maximum Points: ${maxPoints}

Please evaluate this answer and provide:
1. A score from 0 to ${maxPoints} points
2. A percentage score (0-100)
3. Detailed feedback explaining what the student did well and what could be improved. ${correctAnswer ? 'If the answer is incorrect or partially correct, you MUST explicitly state the correct answer: "' + correctAnswer + '". Do not just explain why it is wrong - provide the correct answer.' : 'If the answer is incorrect, explain what the correct answer should be.'}
4. Whether the answer is considered correct (typically 70%+ for passing)
5. Specific strengths (1-3 items)
6. Specific weaknesses or areas for improvement (1-3 items)

Be fair, constructive, and focus on learning outcomes.`;

  const response = await callLLM({
    systemPrompt,
    userPrompt,
    provider: 'deepseek',
    model: 'deepseek-chat',
    temperature: 0.3, // Lower temperature for more consistent evaluation
  });

  try {
    // Try to extract JSON from response
    let evaluationData: any;
    const content = response.content.trim();
    
    // Try to find JSON in the response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      evaluationData = JSON.parse(jsonMatch[0]);
    } else {
      // If no JSON found, try to parse the entire content
      evaluationData = JSON.parse(content);
    }

    // Validate and normalize the response
    const score = Math.max(0, Math.min(maxPoints, Number(evaluationData.score) || 0));
    const percentage = Math.max(0, Math.min(100, Number(evaluationData.percentage) || 0));
    const isCorrect = evaluationData.isCorrect !== undefined 
      ? Boolean(evaluationData.isCorrect)
      : percentage >= 70; // Default: 70%+ is considered correct

    const feedback = evaluationData.feedback || evaluationData.comment || 'No feedback provided.';
    const strengths = Array.isArray(evaluationData.strengths) 
      ? evaluationData.strengths 
      : (evaluationData.strengths ? [evaluationData.strengths] : []);
    const weaknesses = Array.isArray(evaluationData.weaknesses) 
      ? evaluationData.weaknesses 
      : (evaluationData.weaknesses ? [evaluationData.weaknesses] : []);

    return {
      score: Math.round(score * 10) / 10, // Round to 1 decimal place
      percentage: Math.round(percentage * 10) / 10,
      feedback,
      isCorrect,
      strengths: strengths.slice(0, 3), // Limit to 3
      weaknesses: weaknesses.slice(0, 3), // Limit to 3
      model: response.model || 'deepseek-chat',
    };
  } catch (error) {
    console.error('Error parsing evaluation result:', error);
    // Fallback: provide basic evaluation
    const fallbackScore = maxPoints * 0.5; // Default to 50% if parsing fails
    return {
      score: fallbackScore,
      percentage: 50,
      feedback: 'Unable to fully evaluate this answer. Please review manually.',
      isCorrect: false,
      strengths: [],
      weaknesses: ['Evaluation could not be completed automatically'],
      model: response.model || 'deepseek-chat',
    };
  }
}

