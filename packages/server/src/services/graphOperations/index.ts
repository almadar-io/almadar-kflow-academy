/**
 * Graph Operations Service
 * 
 * NEW IMPLEMENTATION: These operations work directly with NodeBasedKnowledgeGraph.
 * They do NOT call the original operations - they are designed for the new architecture.
 * 
 * Location: server/src/services/graphOperations/
 * 
 * Key Features:
 * - Accept GraphNode inputs (not Concept objects)
 * - Use prompt builders for clean, readable prompts
 * - Generate mutations directly
 * - Return standardized format with mutations + content
 */

export { 
  progressiveExpandMultipleFromText,
  type ProgressiveExpandMultipleFromTextOptions,
  type ProgressiveExpandMultipleFromTextResult
} from './progressiveExpandMultipleFromText';

export {
  explain,
  type ExplainOptions,
  type ExplainResult
} from './explain';

export {
  answerQuestion,
  type AnswerQuestionOptions,
  type AnswerQuestionResult
} from './answerQuestion';

export {
  generateGoals,
  type GenerateGoalsOptions,
  type GenerateGoalsResult
} from './generateGoals';

export {
  generateLayerPractice,
  type GenerateLayerPracticeOptions,
  type GenerateLayerPracticeResult
} from './generateLayerPractice';

export {
  customOperation,
  type CustomOperationOptions,
  type CustomOperationResult
} from './customOperation';

// Prompt builders
export * from './promptBuilders';

