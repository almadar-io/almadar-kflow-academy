import { callLLM } from '../services/llm';
import { Concept, ConceptGraph, GraphDifficulty } from '../types/concept';

export interface AnswerQuestionOptions {
  conceptGraphId: string;
  conceptId: string;
  question: string;
  conceptGraph?: ConceptGraph;
  difficulty?: GraphDifficulty;
  uid?: string;
  stream?: boolean;
}

export interface AnswerQuestionResult {
  answer: string;
  stream?: AsyncIterable<any>;
  model?: string;
}

/**
 * Answers a question about a concept based on the user's learning level
 */
export async function answerQuestion(
  concept: Concept,
  options: AnswerQuestionOptions
): Promise<AnswerQuestionResult> {
  const { question, difficulty, uid } = options;

  // Get difficulty text
  const difficultyText = difficulty === 'beginner' 
    ? 'beginner' 
    : difficulty === 'intermediate' 
      ? 'intermediate' 
      : difficulty === 'advanced' 
        ? 'advanced' 
        : 'intermediate';

  const difficultyGuidance = difficulty === 'beginner'
    ? 'Use simple language, avoid jargon, and provide clear explanations with examples.'
    : difficulty === 'intermediate'
      ? 'Assume the learner has some background knowledge and can handle moderately complex explanations.'
      : difficulty === 'advanced'
        ? 'Provide detailed, nuanced explanations suitable for someone with substantial prior knowledge.'
        : 'Provide explanations appropriate for an intermediate learner.';

  const systemPrompt = `You are an expert educational assistant helping a learner understand concepts at the ${difficultyText} level.

Your task is to answer questions about concepts in a clear, helpful, and educational manner.

Guidelines:
- Answer the question directly and clearly
- Tailor your response to a ${difficultyText} level learner: ${difficultyGuidance}
- If the question references specific text or content, acknowledge it in your answer
- Use examples when helpful
- Be concise but thorough
- If the question is unclear, ask for clarification or provide the most likely interpretation
- Format your response in clear, readable Markdown
- Use proper formatting for code, lists, and emphasis

Return ONLY the answer text in Markdown format.`;

  // Build context from concept name and description (lesson content is not included)
  const contextContent = `Concept: ${concept.name}\n${concept.description ? `Description: ${concept.description}` : ''}`;

  const userPrompt = `Context:
${contextContent}

Question: ${question}

Please provide a clear, helpful answer to this question, tailored for a ${difficultyText} level learner.`;

  const response = await callLLM({
    systemPrompt,
    userPrompt,
    provider: 'deepseek',
    model: 'deepseek-chat',
    uid,
    stream: options.stream,
  });

  // If streaming, return the stream
  if (response.stream && response.raw) {
    return {
      answer: '',
      stream: response.raw,
      model: response.model,
    } as AnswerQuestionResult & { stream: AsyncIterable<any> };
  }

  const answer = response.content.trim();

  if (!answer) {
    throw new Error('Answer operation returned empty content');
  }

  return {
    answer,
    model: response.model,
  };
}

