/**
 * Knowledge Graph Access Layer
 * 
 * Main export file for the access layer and all its services.
 */

// Main facade
export { KnowledgeGraphAccessLayer } from './KnowledgeGraphAccessLayer';
export type { TraverseOptions, TraverseResult } from './KnowledgeGraphAccessLayer';

// Core services
export { GraphCacheManager, GraphLoader } from './core';

// Query services
export {
  NodeQueryService,
  RelationshipQueryService,
  GraphAlgorithmService,
  type RelationshipQueryOptions,
} from './query';

// Mutation services
export {
  NodeMutationService,
  RelationshipMutationService,
  type DeleteNodeOptions,
} from './mutation';

// Publishing services
export {
  PublishingQueryService,
  CoursePublishingService,
  ModulePublishingService,
  LessonPublishingService,
  type ModuleForPublishing,
  type LessonForPublishing,
  type SeedConceptPublishData,
  type ModuleConceptPublishData,
  type LessonContentPublishData,
  type GraphMetadataPublishData,
  type ConceptsByLayer,
  type CoursePublishSettings,
  type PublishedCourseView,
  type ModulePublishSettings,
  type PublishedModuleView,
  type LessonPublishSettings,
  type PublishedLessonView,
} from './publishing';

// Re-export publishing types from facade
export type {
  CoursePublishSettings as CourseSettings,
  PublishedCourseView as CourseView,
  ModulePublishSettings as ModuleSettings,
  PublishedModuleView as ModuleView,
  LessonPublishSettings as LessonSettings,
  PublishedLessonView as LessonView,
} from './KnowledgeGraphAccessLayer';

// Graphology adapter
export { toGraphologyGraph, fromGraphologyGraph, createGraphologyGraph } from './GraphologyAdapter';
