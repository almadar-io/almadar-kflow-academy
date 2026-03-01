import { Concept, OperationResult } from '../types/concept';
import { callLLM, extractJSONArray } from '../services/llm';
import { validateConcept } from '../utils/validation';

/**
 * Generates flash cards from a concept's lesson content.
 * @param concept - Concept with a lesson to generate flash cards from
 * @returns Array with a single concept containing the generated flash cards
 */
export async function generateFlashCards(
  concept: Concept
): Promise<OperationResult> {
  if (!validateConcept(concept)) {
    throw new Error('Invalid concept input for generateFlashCards operation');
  }

  if (!concept.lesson || concept.lesson.trim().length === 0) {
    throw new Error('Concept must have a lesson to generate flash cards');
  }

  const systemPrompt = `You are an expert educational content creator specializing in creating effective flash cards for learning.

Your task is to generate high-quality flash cards from lesson content. Flash cards should:
- Be cognitively appropriate in length (not overwhelming)
- Cover key concepts, definitions, and important facts from the lesson
- Have clear, concise questions on the front
- Have comprehensive but digestible answers on the back
- Focus on understanding rather than rote memorization
- Avoid overly complex or lengthy content that would be cognitively overwhelming

Return a JSON array of flash cards, each with:
- "front": The question or prompt (should be clear and focused)
- "back": The answer or explanation (should be comprehensive but not overwhelming)

Generate 5-10 flash cards that cover the most important concepts from the lesson.`;

  const userPrompt = `Generate flash cards from the following lesson for the concept "${concept.name}":

${concept.lesson}

Create flash cards that:
- Cover the key concepts, definitions, and important information
- Are appropriate in length (front: 1-2 sentences max, back: 2-4 sentences max)
- Focus on understanding and application
- Are not cognitively overwhelming

Return a JSON array of flash cards with "front" and "back" fields.`;

  const response = await callLLM({
    systemPrompt,
    userPrompt,
    provider: 'gemini',
    model: 'gemini-2.5-flash',
  });

  // Extract and parse JSON array
  let flashCards: any[];
  try {
    flashCards = extractJSONArray(response.content);
  } catch (error) {
    throw new Error(`Failed to parse LLM response: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }

  // Validate flash cards structure
  const validatedFlashCards = flashCards
    .filter(card => card && typeof card.front === 'string' && typeof card.back === 'string')
    .map(card => ({
      front: card.front.trim(),
      back: card.back.trim(),
    }))
    .filter(card => card.front.length > 0 && card.back.length > 0);

  if (validatedFlashCards.length === 0) {
    throw new Error('No valid flash cards generated from lesson');
  }

  const conceptWithFlashCards: Concept = {
    ...concept,
    flash: validatedFlashCards,
  };

  return [conceptWithFlashCards];
}

