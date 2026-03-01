import { Concept } from '../types/concept';
import { callLLM, extractJSONArray } from '../services/llm';
import { validateConcept } from '../utils/validation';
import { AssessmentQuestion } from '../types/publishing';

export interface GenerateAssessmentQuestionsOptions {
  numQuestions?: number;
  questionTypes?: ('multiple_choice' | 'true_false' | 'short_answer' | 'essay')[];
  difficulty?: 'easy' | 'medium' | 'hard';
  focusAreas?: string[];
  specialInstructions?: string; // Special instructions for the LLM
  flashCards?: Array<{ front: string; back: string }>; // Flash cards to include as context
}

export interface GenerateAssessmentQuestionsResult {
  questions: AssessmentQuestion[];
  model: string;
}

/**
 * Generates assessment questions from a concept's lesson content.
 * Supports multiple question types: multiple_choice, true_false, short_answer, essay
 * 
 * @param concept - Concept with a lesson to generate questions from
 * @param options - Options for question generation
 * @returns Array of assessment questions
 */
export async function generateAssessmentQuestions(
  concept: Concept,
  options: GenerateAssessmentQuestionsOptions = {}
): Promise<GenerateAssessmentQuestionsResult> {
  if (!validateConcept(concept)) {
    throw new Error('Invalid concept input for generateAssessmentQuestions operation');
  }

  if (!concept.lesson || concept.lesson.trim().length === 0) {
    throw new Error('Concept must have a lesson to generate assessment questions');
  }

  const {
    numQuestions = 5,
    questionTypes = ['multiple_choice', 'true_false', 'short_answer'],
    difficulty = 'medium',
    focusAreas = [],
    specialInstructions,
    flashCards = [],
  } = options;

  // Validate numQuestions
  if (numQuestions < 1 || numQuestions > 20) {
    throw new Error('Number of questions must be between 1 and 20');
  }

  // Build question type descriptions only for selected types
  const questionTypeDescriptions: Record<string, string> = {
    multiple_choice: '**multiple_choice**: Provide 4 options (A, B, C, D), with one clearly correct answer and 3 plausible distractors',
    true_false: '**true_false**: Simple true/false statements that test understanding of key concepts',
    short_answer: '**short_answer**: Questions requiring brief answers (1-3 sentences), with a clear correct answer',
    essay: '**essay**: Open-ended questions requiring longer, analytical responses (no single correct answer, but key points to cover)',
  };

  const selectedTypeDescriptions = questionTypes.map((type, idx) => 
    `${idx + 1}. ${questionTypeDescriptions[type]}`
  ).join('\n');

  const typeList = questionTypes.map(t => `"${t}"`).join(', ');

  // Build return structure description based on selected types
  let returnStructure = '- "type": One of ' + typeList + '\n';
  returnStructure += '- "question": The question text\n';
  
  if (questionTypes.includes('multiple_choice')) {
    returnStructure += '- "options": Array of options (required for multiple_choice)\n';
  }
  
  if (questionTypes.includes('true_false') || questionTypes.includes('short_answer') || questionTypes.includes('multiple_choice')) {
    returnStructure += '- "correctAnswer": The correct answer (required for true_false, short_answer, and single correct multiple_choice)\n';
  }
  
  if (questionTypes.includes('multiple_choice')) {
    returnStructure += '- "correctAnswers": Array of correct answers (optional, for multiple correct multiple_choice)\n';
  }
  
  returnStructure += '- "points": Points value (1-10, higher for more complex questions)\n';
  returnStructure += '- "explanation": Brief explanation of the correct answer (optional but recommended)';

  if (questionTypes.includes('essay')) {
    returnStructure += '\n\nFor essay questions, provide key points that should be covered rather than a single correct answer.';
  }

  const systemPrompt = `You are an expert educational assessment designer specializing in creating high-quality assessment questions.

Your task is to generate diverse, well-structured assessment questions from lesson content. Questions should:
- Test understanding and application, not just memorization
- Be appropriate for the specified difficulty level
- Cover key concepts from the lesson
- Be clear, unambiguous, and well-formulated
- Follow best practices for each question type

IMPORTANT: You MUST ONLY generate questions of the following types:
${selectedTypeDescriptions}

You are STRICTLY FORBIDDEN from generating any other question types. Only use the types specified above.

Return a JSON array of questions, each with:
${returnStructure}`;

  const focusAreasText = focusAreas.length > 0
    ? `\n\nFocus on these specific areas:\n${focusAreas.map(area => `- ${area}`).join('\n')}`
    : '';

  const flashCardsText = flashCards.length > 0
    ? `\n\nFlash Cards (key concepts to emphasize):\n${flashCards.map((fc, idx) => `${idx + 1}. ${fc.front} → ${fc.back}`).join('\n')}`
    : '';

  const specialInstructionsText = specialInstructions
    ? `\n\nSpecial Instructions:\n${specialInstructions}`
    : '';

  // Build type-specific requirements only for selected types
  const typeSpecificRequirements: string[] = [];
  if (questionTypes.includes('multiple_choice')) {
    typeSpecificRequirements.push('- For multiple_choice: Provide exactly 4 options with one clearly correct answer. MUST include "correctAnswer" field with the exact text of the correct option.');
  }
  if (questionTypes.includes('true_false')) {
    typeSpecificRequirements.push('- For true_false: Create statements that test understanding (not trivial facts). MUST include "correctAnswer" field with either "true" or "false" (lowercase).');
  }
  if (questionTypes.includes('short_answer')) {
    typeSpecificRequirements.push('- For short_answer: Require brief but substantive answers (1-3 sentences). MUST include "correctAnswer" field with the expected correct answer.');
  }
  if (questionTypes.includes('essay')) {
    typeSpecificRequirements.push('- For essay: Require analytical thinking and key points to cover');
  }

  const distributionText = questionTypes.length > 1
    ? `- Distribute questions evenly across the ${questionTypes.length} requested types: ${questionTypes.join(', ')}`
    : `- ALL questions must be of type: ${questionTypes[0]}`;

  const userPrompt = `Generate exactly ${numQuestions} assessment questions from the following lesson for the concept "${concept.name}".

CRITICAL REQUIREMENT: You MUST ONLY generate questions of these types: ${questionTypes.join(', ')}. Do NOT generate any other question types.

Lesson Content:
${concept.lesson}
${flashCardsText}
${specialInstructionsText}

Requirements:
- Difficulty level: ${difficulty}
- Question types: ${questionTypes.join(', ')} ONLY
${distributionText}
- Questions should test understanding of key concepts from the lesson
${typeSpecificRequirements.join('\n')}
- Points: Assign 1-3 points for simple questions, 4-6 for medium, 7-10 for complex/essay questions
${focusAreasText}

Return a JSON array of exactly ${numQuestions} questions, ALL of which must be one of the specified types: ${questionTypes.join(', ')}.`;

  const response = await callLLM({
    systemPrompt,
    userPrompt,
    provider: 'deepseek',
    model: 'deepseek-chat',
    temperature: 0.7, // Slightly higher for creativity in question generation
  });

  try {
    const questionsData = extractJSONArray(response.content) as any[];

    // Validate and transform questions
    const questions: AssessmentQuestion[] = questionsData.map((q, index) => {
      // Validate question type matches requested types
      if (!questionTypes.includes(q.type)) {
        throw new Error(`Question at index ${index} has type "${q.type}" but only these types are allowed: ${questionTypes.join(', ')}`);
      }

      // Generate ID if not provided
      const id = q.id || `q${index + 1}`;

      // Validate required fields
      if (!q.question || typeof q.question !== 'string') {
        throw new Error(`Missing or invalid question text at index ${index}`);
      }

      if (typeof q.points !== 'number' || q.points < 1 || q.points > 10) {
        throw new Error(`Invalid points value at index ${index}`);
      }

      // Validate type-specific requirements
      if (q.type === 'multiple_choice') {
        if (!Array.isArray(q.options) || q.options.length < 2) {
          throw new Error(`Multiple choice question at index ${index} must have at least 2 options`);
        }
        if (!q.correctAnswer && !q.correctAnswers) {
          throw new Error(`Multiple choice question at index ${index} must have correctAnswer or correctAnswers`);
        }
      }

      if (q.type === 'true_false') {
        if (q.correctAnswer !== 'true' && q.correctAnswer !== 'false') {
          throw new Error(`True/false question at index ${index} must have correctAnswer as "true" or "false"`);
        }
      }

      if (q.type === 'short_answer' && !q.correctAnswer) {
        throw new Error(`Short answer question at index ${index} must have correctAnswer`);
      }

      // For essay questions, we don't require a single correctAnswer, but we can store key points
      if (q.type === 'essay' && !q.correctAnswer && !q.correctAnswers) {
        // Essay questions might have key points instead
        q.correctAnswer = q.keyPoints || 'Key points should cover: ' + (q.expectedPoints || 'main concepts from the lesson');
      }

      return {
        id,
        type: q.type,
        question: q.question,
        options: q.options,
        correctAnswer: q.correctAnswer,
        correctAnswers: q.correctAnswers,
        points: q.points,
        explanation: q.explanation,
      };
    });

    return {
      questions,
      model: response.model || 'deepseek-chat',
    };
  } catch (error) {
    console.error('Error parsing assessment questions:', error);
    throw new Error(`Failed to generate assessment questions: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

