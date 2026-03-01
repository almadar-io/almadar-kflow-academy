/**
 * Operation to generate placement test questions based on learning goal
 */

import { callLLM } from '../services/llm';
import type {
  GeneratePlacementQuestionsOptions,
  GeneratePlacementQuestionsResult,
  PlacementQuestion,
} from '../types/placementTest';
import { generateConceptId } from '../utils/uuid';
import { getGoalById } from '../services/goalService';

export async function generatePlacementQuestions(
  options: GeneratePlacementQuestionsOptions
): Promise<GeneratePlacementQuestionsResult> {
  const { goalId, topic, uid } = options;

  // Fetch the learning goal for context
  let goalContext = '';
  if (uid && goalId) {
    try {
      const goal = await getGoalById(uid, goalId);
      if (goal) {
        goalContext = `
Learning Goal Context:
- Title: ${goal.title}
- Description: ${goal.description}
- Type: ${goal.type}
- Target: ${goal.target}
${goal.customMetadata ? `- Additional Context: ${JSON.stringify(goal.customMetadata)}` : ''}`;
      }
    } catch (error) {
      console.warn('Could not fetch goal for placement questions:', error);
    }
  }

  const systemPrompt = `You are an expert educational assessment designer specializing in creating diagnostic placement tests.
Your task is to generate placement test questions that accurately assess a learner's current knowledge level in a specific topic.

The questions should:
1. Test foundational, intermediate, and advanced concepts
2. Be diagnostic (reveal what the learner knows/doesn't know)
3. Map to specific concepts that can be identified in a knowledge graph
4. Have clear correct answers
5. Cover a range of difficulty levels

For each question, you must:
- Provide a clear, well-formatted question
- Specify the question type (multiple_choice, true_false, or short_answer)
- For multiple_choice: provide 4 options with one clearly correct answer
- Specify which concepts this question tests (as an array of concept names)
- Assign a difficulty level (beginner, intermediate, or advanced)
- Provide the correct answer
- Optionally provide an explanation

Generate questions in the following distribution:
- 3-5 beginner questions (foundational concepts, basic terminology)
- 5-7 intermediate questions (core concepts, practical applications)
- 3-5 advanced questions (expert-level knowledge, complex applications)

Output format: JSON array of PlacementQuestion objects.
Each PlacementQuestion must have:
- id: string (UUID)
- question: string
- type: 'multiple_choice' | 'true_false' | 'short_answer'
- options: string[] (required for multiple_choice, empty array otherwise)
- correctAnswer: string | string[] (can be array for multiple correct answers)
- conceptIds: string[] (array of concept names this question tests)
- difficulty: 'beginner' | 'intermediate' | 'advanced'
- explanation?: string (optional explanation)

Example structure:
[
  {
    "id": "uuid-1",
    "question": "What is the primary purpose of a variable in programming?",
    "type": "multiple_choice",
    "options": [
      "To store and manipulate data",
      "To execute code",
      "To format text",
      "To connect to databases"
    ],
    "correctAnswer": "To store and manipulate data",
    "conceptIds": ["variables", "data storage"],
    "difficulty": "beginner",
    "explanation": "Variables are used to store and manipulate data in programs."
  },
  // ... more questions
]`;

  const userPrompt = `Generate a comprehensive placement test for the topic: "${topic}"
${goalContext}

The test should assess the learner's current knowledge level (beginner, intermediate, or advanced) in this topic.
Generate questions that:
- Test foundational concepts (beginner level)
- Test core concepts and practical applications (intermediate level)
- Test expert-level knowledge and complex scenarios (advanced level)

For each question, identify which specific concepts it tests (these should be concept names that could exist in a knowledge graph).
Ensure questions are diagnostic and can accurately determine the learner's proficiency level.

Generate 11-17 questions total (3-5 beginner, 5-7 intermediate, 3-5 advanced).`;

  const response = await callLLM({
    systemPrompt,
    userPrompt,
    provider: 'deepseek',
    model: 'deepseek-chat',
    uid,
  });

  const content = response.content || '[]';
  let questions: PlacementQuestion[];

  try {
    // First, try parsing content directly as JSON
    const parsed = JSON.parse(content);
    questions = Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    // If direct parsing fails, try fallback parsing (handle markdown code blocks)
    try {
      let jsonContent = content.trim();
      
      // Remove markdown code block markers (```json or ```)
      jsonContent = jsonContent.replace(/^```(?:json)?\s*/i, '');
      jsonContent = jsonContent.replace(/\s*```$/i, '');
      jsonContent = jsonContent.trim();
      
      // Try to find JSON array in the content if it's not pure JSON
      const jsonMatch = jsonContent.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        jsonContent = jsonMatch[0];
      }
      
      const parsed = JSON.parse(jsonContent);
      questions = Array.isArray(parsed) ? parsed : [];
    } catch (fallbackError) {
      console.error('Failed to parse placement questions (both direct and fallback parsing failed):', fallbackError);
      console.error('Content received:', content.substring(0, 500)); // Log first 500 chars for debugging
      questions = [];
    }
  }

  // Validate and normalize questions
  questions = questions
    .filter((q: any) => q && q.question && q.type && q.difficulty)
    .map((q: any) => ({
      id: q.id || generateConceptId(),
      question: q.question.trim(),
      type: q.type,
      options: q.type === 'multiple_choice' ? (q.options || []) : undefined,
      correctAnswer: q.correctAnswer || '',
      conceptIds: Array.isArray(q.conceptIds) ? q.conceptIds : [],
      difficulty: q.difficulty,
      explanation: q.explanation?.trim(),
    }));

  // Ensure we have questions at each difficulty level
  const beginnerCount = questions.filter(q => q.difficulty === 'beginner').length;
  const intermediateCount = questions.filter(q => q.difficulty === 'intermediate').length;
  const advancedCount = questions.filter(q => q.difficulty === 'advanced').length;

  if (beginnerCount < 3 || intermediateCount < 5 || advancedCount < 3) {
    console.warn(`Placement test question distribution may be insufficient: ${beginnerCount} beginner, ${intermediateCount} intermediate, ${advancedCount} advanced`);
  }

  return {
    questions,
    model: response.model,
  };
}

