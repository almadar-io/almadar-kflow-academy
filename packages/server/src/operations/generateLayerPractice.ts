import { Concept, GraphDifficulty } from '../types/concept';
import { callLLM } from '../services/llm';
import { validateConceptArray, validateConcept } from '../utils/validation';

/**
 * Practice item type - can be a question or a project
 */
export interface PracticeItem {
  type: 'question' | 'project';
  question: string; // For questions: the question text; for projects: the project outline/description
  answer: string; // The answer or solution
}

/**
 * Result type for generateLayerPractice
 */
export interface GenerateLayerPracticeResult {
  items: PracticeItem[];
  model?: string;
  review?: string; // Markdown review content when streaming
}

/**
 * Options for generateLayerPractice
 */
export interface GenerateLayerPracticeOptions {
  uid?: string;
  preferProject?: boolean; // If true, prefer generating a project over questions
  stream?: boolean; // Whether to stream the response
  seedConcept?: Concept; // Seed concept to anchor the review
  difficulty?: GraphDifficulty; // Difficulty level from graph
  focus?: string; // Learning focus from graph
}

/**
 * Generates practice questions or a project for a layer of concepts.
 * The LLM will decide whether to generate questions or a project based on the layer goal and concepts.
 * 
 * @param concepts - Concepts in the layer
 * @param layerGoal - The learning goal for this layer
 * @param layerNumber - The layer number
 * @param options - Optional configuration including seed concept, difficulty, and focus
 */
export async function generateLayerPractice(
  concepts: Concept[],
  layerGoal: string,
  layerNumber: number,
  options: GenerateLayerPracticeOptions = {}
): Promise<GenerateLayerPracticeResult> {
  if (!validateConceptArray(concepts)) {
    throw new Error('Invalid concepts input for generateLayerPractice operation');
  }

  if (concepts.length === 0) {
    throw new Error('At least one concept is required for generateLayerPractice');
  }

  const { uid, stream = false, seedConcept, difficulty, focus } = options;

  // Validate seed concept if provided
  if (seedConcept && !validateConcept(seedConcept)) {
    throw new Error('Invalid seed concept provided to generateLayerPractice');
  }

  // Build concept list with descriptions
  const conceptList = concepts.map(c => {
    const desc = c.description ? ` - ${c.description}` : '';
    return `- ${c.name}${desc}`;
  }).join('\n');

  // Build seed concept and context information
  const difficultyText = difficulty 
    ? difficulty === 'beginner' 
      ? 'beginner-level' 
      : difficulty === 'intermediate' 
        ? 'intermediate-level' 
        : 'advanced-level'
    : '';

  const seedInfo = seedConcept
    ? `\n\n**Overall Learning Context:**
The learner is studying the broader topic "${seedConcept.name}".${seedConcept.description ? ` This topic is about: ${seedConcept.description}` : ''}${difficulty ? ` The learner is at a ${difficultyText} level.` : ''}${focus ? ` The learning focus for this path is: "${focus}".` : ''}`
    : '';

  const contextGuidance = seedConcept
    ? `\n\n**Important:** Make sure the solution and concept explanations connect back to the overall learning topic "${seedConcept.name}" and align with the learner's ${difficultyText || 'current'} level. The review should help the learner see how these concepts contribute to understanding "${seedConcept.name}".`
    : '';

  const systemPrompt = `You are an expert educational content creator. Your task is to create a solution-focused review that helps learners understand how concepts apply to real-world goals.

Create content in Markdown format that:
1. First presents a complete solution (project, implementation, or approach) that addresses the learning goal
2. Then explains how each concept learned relates to and is used in that solution
3. Uses clear, engaging language appropriate for the learner's level

Structure the content as follows:
- Start with a section presenting the complete solution to the goal (this is the "answer" or "solution")
- Follow with sections for each concept, explaining how it relates to the solution (these are like "questions" about each concept's role, followed by "answers" explaining their application)

Format it naturally without explicit question/answer tags - just present it as flowing text with clear sections. Use headings to separate the solution from concept explanations.

Use Markdown formatting for:
- Code blocks with syntax highlighting (triple backticks with language)
- Lists (bulleted or numbered)
- Emphasis (asterisks for italic or bold)
- Headings (hash symbols for sections)
- Inline code (single backticks)
- Links and other Markdown features`;

  const userPrompt = `Create a solution-focused review for Level ${layerNumber} with the following learning goal:

**Learning Goal:** ${layerGoal}

**Concepts Learned:**
${conceptList}${seedInfo}

Generate content that:
1. First presents a complete solution that addresses the learning goal (this could be a project, implementation, approach, or method)
2. Then for each concept, explain how it relates to and is used in that solution
3. Connect everything back to the overall learning topic and ensure the content is appropriate for the learner's level${contextGuidance}

Structure it as:
- A main section with the solution/implementation
- Followed by sections for each concept showing how it applies to the solution
- Make connections to how this relates to the broader learning topic

Write it naturally without explicit question/answer tags - just flowing text with clear headings. Focus on showing how each concept contributes to solving the goal and how it fits into the overall learning journey.

Return only the Markdown text, no additional formatting or JSON.`;

  const response = await callLLM({
    systemPrompt,
    userPrompt,
    provider: 'deepseek',
    model: 'deepseek-chat',
    uid,
    stream: stream,
  });

  // If streaming, return the stream
  if (response.stream && response.raw) {
    return {
      stream: response.raw,
      model: response.model,
    } as any;
  }

  const content = response.content ?? '';
  
  // For non-streaming, return the review as markdown
  // Keep backward compatibility by creating a single item with the review
  const reviewContent = content.trim();
  
  if (!reviewContent) {
    throw new Error('Failed to generate review: empty response');
  }

  // For backward compatibility, create a single practice item with the review
  // The frontend will handle displaying it as markdown
  const items: PracticeItem[] = [{
    type: 'project',
    question: reviewContent,
    answer: '', // No answer needed for review
  }];

  return {
    items,
    model: response.model,
    review: reviewContent,
  };
}

