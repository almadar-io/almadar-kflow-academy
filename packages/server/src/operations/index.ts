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
export { progressiveExplore } from './progressiveExplore';
export { advanceNext } from './unused-operations/advanceNext';
export { advanceNextMultiple } from './advanceNextMultiple';
export { explain } from './explain';
export { generateLayerPractice } from './generateLayerPractice';
export type { PracticeItem } from './generateLayerPractice';
export { answerQuestion } from './answerQuestion';
export { customOperation } from './customOperation';
export { generateFlashCards } from './generateFlashCards';
export { runCodeSimulation } from './runCodeSimulation';
export { generateInteractiveOrbital } from './generateInteractiveOrbital';
export { generateGoalQuestions } from './generateGoalQuestions';
export { generateGoal } from './generateGoal';
export type { GenerateGoalQuestionsOptions, GenerateGoalQuestionsResult } from '../types/goal';
export type { GenerateGoalOptions, GenerateGoalResult } from '../types/goal';
export { generatePlacementQuestions } from './generatePlacementQuestions';
export type { GeneratePlacementQuestionsOptions, GeneratePlacementQuestionsResult } from '../types/placementTest';

export * from '../types/concept';

