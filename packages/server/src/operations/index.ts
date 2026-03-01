/**
 * KFlow Operations - Composable concept graph functions
 * 
 * All operations follow the composable function pattern:
 * - Input: Concept | Concept[]
 * - Output: Promise<Concept[]>
 * 
 * This allows seamless chaining and integration of operations.
 */

export { expand } from './expand';
export { expandList } from './unused-operations/expandList';
export { synthesize } from './synthesize';
export { deriveParents } from './deriveParents';
export { explore } from './explore';
export { refocus } from './unused-operations/refocus';
export { tracePath } from './tracePath';
export { deriveSummary } from './deriveSummary';
export { progressiveExpand } from './unused-operations/progressiveExpand';
export { progressiveExpandMultiple } from './unused-operations/progressiveExpandMultiple';
export { progressiveExpandSingle } from './progressiveExpandSingle';
export { progressiveExplore } from './progressiveExplore';
export { advanceNext } from './unused-operations/advanceNext';
export { advanceNextMultiple } from './advanceNextMultiple';
export { explain } from './explain';
export { progressiveExpandMultipleFromText } from './progressiveExpandMultipleFromText';
export { generateLayerPractice, PracticeItem } from './generateLayerPractice';
export { answerQuestion } from './answerQuestion';
export { customOperation } from './customOperation';
export { generateFlashCards } from './generateFlashCards';
export { generateAssessmentQuestions, GenerateAssessmentQuestionsOptions, GenerateAssessmentQuestionsResult } from './generateAssessmentQuestions';
export { evaluateFreeTextAnswer, EvaluateFreeTextAnswerOptions, EvaluateFreeTextAnswerResult } from './evaluateFreeTextAnswer';
export { generateGoalQuestions } from './generateGoalQuestions';
export { generateGoal } from './generateGoal';
export type { GenerateGoalQuestionsOptions, GenerateGoalQuestionsResult } from '../types/goal';
export type { GenerateGoalOptions, GenerateGoalResult } from '../types/goal';
export { generatePlacementQuestions } from './generatePlacementQuestions';
export type { GeneratePlacementQuestionsOptions, GeneratePlacementQuestionsResult } from '../types/placementTest';

// Enrichment operations
export { analyzeLayerCompleteness } from './analyzeLayerCompleteness';
export { findMissingConceptsForLayer } from './findMissingConceptsForLayer';
export { identifyLayerRelationships } from './identifyLayerRelationships';
export { discoverMissingConceptsForMilestone } from './discoverMissingConceptsForMilestone';
export { analyzePrerequisiteChain } from './analyzePrerequisiteChain';
export { discoverGoalAwareRelationships } from './discoverGoalAwareRelationships';
export { discoverCrossLayerConcepts } from './discoverCrossLayerConcepts';
export type * from '../types/enrichment';

export * from '../types/concept';

