/**
 * Knowledge Graph Access Hooks
 * 
 * Exports all hooks for both REST and GraphQL access
 */

// Query Keys (for cache invalidation)
export { knowledgeGraphKeys, publishingKeys, enrollmentKeys, analyticsKeys } from './queryKeys';
export type { KnowledgeGraphQueryKey } from './queryKeys';

// REST API hooks
export {
  useGetGraph,
  useSaveGraph,
  useGetNodes,
  useGetNode,
  useCreateNode,
  useUpdateNode,
  useDeleteNode,
  useFindNodes,
  useGetRelationships,
  useGetNodeRelationships,
  useCreateRelationship,
  useDeleteRelationship,
  useFindPath,
  useTraverse,
  useExtractSubgraph,
} from './useKnowledgeGraphRest';

// GraphQL hooks
export {
  useGetGraphQuery,
  useGetGraphLazy,
  useSaveGraphMutation,
  useGetNodeQuery,
  useGetNodeLazy,
  useGetNodesQuery,
  useGetNodesLazy,
  useFindNodesLazy,
  useCreateNodeMutation,
  useUpdateNodeMutation,
  useDeleteNodeMutation,
  useGetRelationshipsQuery,
  useGetRelationshipsLazy,
  useGetNodeRelationshipsQuery,
  useGetNodeRelationshipsLazy,
  useCreateRelationshipMutation,
  useDeleteRelationshipMutation,
  useFindPathLazy,
  useTraverseLazy,
  useExtractSubgraphLazy,
} from './useKnowledgeGraphGraphQL';

// Graph Operations hooks (V2 API)
export { useProgressiveExpand } from './useProgressiveExpand';
export { useExplainConcept } from './useExplainConcept';
export { useAnswerQuestion } from './useAnswerQuestion';
export { useGenerateGoals } from './useGenerateGoals';
export { useGenerateLayerPractice } from './useGenerateLayerPractice';
export { useCustomOperation } from './useCustomOperation';

// Query hooks (Phase 3.2 - Optimized Query API with React Query caching)
export { useLearningPaths } from './useLearningPaths';
export type { UseLearningPathsOptions } from './useLearningPaths';
export { useGraphSummary } from './useGraphSummary';
export type { UseGraphSummaryOptions } from './useGraphSummary';
export { useConceptsByLayer } from './useConceptsByLayer';
export type { UseConceptsByLayerOptions } from './useConceptsByLayer';
export { useConceptDetail } from './useConceptDetail';
export type { UseConceptDetailOptions } from './useConceptDetail';
export { useMindMapStructure } from './useMindMapStructure';
export type { UseMindMapStructureOptions } from './useMindMapStructure';
export { useUpdateNodeProperties } from './useUpdateNodeProperties';
export type { UseUpdateNodePropertiesReturn } from './useUpdateNodeProperties';
export { useLessonAnnotations } from './useLessonAnnotations';
export type { UseLessonAnnotationsReturn } from './useLessonAnnotations';

// Cache invalidation utility
export { useInvalidateGraph } from './useInvalidateGraph';

// Graph-based Publishing hooks (Phase 6 - Graph API migration)
export {
  // Course settings
  useCourseSettings,
  useIsCoursePublished,
  usePublishCourseToGraph,
  useUnpublishCourseFromGraph,
  useUpdateCourseSettingsInGraph,
  usePublishedCourseView,
  // Module publishing
  usePublishedModules,
  usePublishModule,
  useUnpublishModule,
  usePublishAllModules,
  // Lesson publishing
  usePublishedLessons,
  useModuleLessons,
  usePublishLesson,
  useUnpublishLesson,
  usePublishAllLessonsInModule,
  // Content readiness
  useContentReadiness,
  // Mentor courses
  useMentorPublishedCourses,
} from './useGraphPublishing';

export type {
  CoursePublishSettings,
  ModulePublishSettings,
  LessonPublishSettings,
  CourseSettingsResponse,
  PublishedCourseView,
  ModuleForPublishing,
  LessonForPublishing,
  ContentReadinessResponse,
  MentorPublishedCourse,
} from './useGraphPublishing';
