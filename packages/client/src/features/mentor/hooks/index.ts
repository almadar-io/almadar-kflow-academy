/**
 * Mentor Feature Hooks
 * 
 * Exports all hooks for the mentor feature.
 * 
 * Note: Publishing hooks have been migrated to knowledge-graph/hooks/useGraphPublishing.
 * Import from there instead:
 * 
 * import {
 *   usePublishCourseToGraph,
 *   useUnpublishCourseFromGraph,
 *   useMentorPublishedCourses,
 *   usePublishedModules,
 *   useModuleLessons,
 *   usePublishModule,
 *   usePublishLesson,
 *   // etc.
 * } from '../../knowledge-graph/hooks';
 */

// Available content from graph
export {
  useAvailableModules,
  useAvailableLessons,
  useLessonContent,
  type AvailableModule,
  type AvailableLesson,
  type UseAvailableContentOptions,
} from './useAvailableContent';

// UI state and utility hooks
export { useConceptDragHandlers } from './useConceptDragHandlers';
export { useConceptEditing } from './useConceptEditing';
export { useConceptReorder } from './useConceptReorder';
export { useLayerEnrichment } from './useLayerEnrichment';
export { useLayerGoal } from './useLayerGoal';
export { useMentorOperations } from './useMentorOperations';
