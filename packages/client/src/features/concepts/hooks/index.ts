/**
 * @deprecated These hooks are deprecated. Use features/knowledge-graph/hooks instead.
 * This file exports old concept hooks and will be removed in a future version.
 * 
 * Migration guide:
 * - Use useLearningPaths instead of useHomeConcepts
 * - Use useProgressiveExpand instead of useLoadFirstLayer
 * - Use useExplainConcept instead of useSimpleLessonGeneration
 * - Use useConceptDetail instead of useConceptGraphContext
 * - Use useConceptsByLayer instead of useConceptGraphRelations
 * - Use useConceptLevelNeighbors instead of useConceptLevelNeighbors (same name, different implementation)
 */

export { useUserProgress } from './useUserProgress';
export { useConceptActions } from './useConceptActions';
export { useConceptViewState } from './useConceptViewState';
export { useConceptLevels } from './useConceptLevels';
export { useCreateConcept } from './useCreateConcept';
export { useLoadFirstLayer } from './useLoadFirstLayer';
export { useSimpleLessonGeneration } from './useSimpleLessonGeneration';
export { useDeleteGraph } from './useDeleteGraph';
export { useHomeConcepts } from './useHomeConcepts';
export { useLayerPractice } from './useLayerPractice';
export { useAnswerQuestion } from './useAnswerQuestion';
export { useConceptGraphContext } from './useConceptGraphContext';
export { useConceptDetailRelations } from './useConceptDetailRelations';
export { useConceptGraphRelations } from './useConceptGraphRelations';
export { useConceptLevelNeighbors } from './useConceptLevelNeighbors';
export { useConceptLoaderProgress } from './useConceptLoaderProgress';
export { useLessonRenderer } from './useLessonRenderer';
export { default as usePrerequisiteRoute } from './usePrerequisiteRoute';
