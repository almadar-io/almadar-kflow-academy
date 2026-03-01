/**
 * Graph-Based Publishing Hooks
 * 
 * React Query hooks for graph-based publishing operations.
 * These hooks use the new API that stores CourseSettings, ModuleSettings,
 * and LessonSettings nodes directly in the knowledge graph.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { publishingKeys, knowledgeGraphKeys } from './queryKeys';
import {
  graphPublishingApi,
  type CoursePublishSettings,
  type ModulePublishSettings,
  type LessonPublishSettings,
  type CourseSettingsResponse,
  type PublishedCourseView,
  type ModuleForPublishing,
  type LessonForPublishing,
  type ContentReadinessResponse,
  type MentorPublishedCourse,
} from '../api/publishingApi';

// ============================================================================
// Course Settings Hooks
// ============================================================================

/**
 * Get course settings from graph (CourseSettings node)
 */
export function useCourseSettings(graphId: string | undefined) {
  return useQuery({
    queryKey: publishingKeys.courseSettings(graphId!),
    queryFn: async () => {
      const response = await graphPublishingApi.getCourseSettings(graphId!);
      return response.settings;
    },
    enabled: !!graphId,
  });
}

/**
 * Check if a graph is published as a course
 */
export function useIsCoursePublished(graphId: string | undefined) {
  const { data: settings, isLoading } = useCourseSettings(graphId);
  return {
    isPublished: settings?.isPublished ?? false,
    isLoading,
    settings,
  };
}

/**
 * Publish a course (creates CourseSettings node in graph)
 */
export function usePublishCourseToGraph() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      graphId,
      settings,
    }: {
      graphId: string;
      settings: CoursePublishSettings;
    }) => {
      return graphPublishingApi.publishCourse(graphId, settings);
    },
    onSuccess: (data, { graphId }) => {
      // Invalidate graph and publishing caches
      queryClient.invalidateQueries({ queryKey: knowledgeGraphKeys.graph(graphId) });
      queryClient.invalidateQueries({ queryKey: publishingKeys.courseSettings(graphId) });
      queryClient.invalidateQueries({ queryKey: publishingKeys.courses() });
    },
  });
}

/**
 * Unpublish a course
 */
export function useUnpublishCourseFromGraph() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (graphId: string) => {
      return graphPublishingApi.unpublishCourse(graphId);
    },
    onSuccess: (_, graphId) => {
      queryClient.invalidateQueries({ queryKey: knowledgeGraphKeys.graph(graphId) });
      queryClient.invalidateQueries({ queryKey: publishingKeys.courseSettings(graphId) });
      queryClient.invalidateQueries({ queryKey: publishingKeys.courses() });
    },
  });
}

/**
 * Update course settings
 */
export function useUpdateCourseSettingsInGraph() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      graphId,
      updates,
    }: {
      graphId: string;
      updates: Partial<CoursePublishSettings>;
    }) => {
      return graphPublishingApi.updateCourseSettings(graphId, updates);
    },
    onSuccess: (_, { graphId }) => {
      queryClient.invalidateQueries({ queryKey: publishingKeys.courseSettings(graphId) });
      queryClient.invalidateQueries({ queryKey: publishingKeys.courses() });
    },
  });
}

/**
 * Get published course view (for preview or student view)
 */
export function usePublishedCourseView(
  graphId: string | undefined,
  options?: { language?: string }
) {
  return useQuery({
    queryKey: [...publishingKeys.courseSettings(graphId!), 'view', options?.language] as const,
    queryFn: async () => {
      const response = await graphPublishingApi.getPublishedCourseView(graphId!, options);
      return response.course;
    },
    enabled: !!graphId,
  });
}

// ============================================================================
// Module Publishing Hooks
// ============================================================================

/**
 * Get published modules for a graph (layers)
 */
export function usePublishedModules(graphId: string | undefined) {
  return useQuery({
    queryKey: publishingKeys.availableModules(graphId!),
    queryFn: async () => {
      const response = await graphPublishingApi.getPublishedModules(graphId!);
      return response.modules;
    },
    enabled: !!graphId,
  });
}

/**
 * Publish a module (layer)
 */
export function usePublishModule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      graphId,
      layerId,
      settings,
    }: {
      graphId: string;
      layerId: string;
      settings?: ModulePublishSettings;
    }) => {
      return graphPublishingApi.publishModule(graphId, layerId, settings);
    },
    onSuccess: async (_, { graphId, layerId }) => {
      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: knowledgeGraphKeys.graph(graphId) });
      queryClient.invalidateQueries({ queryKey: publishingKeys.availableModules(graphId) });
      // Also invalidate lessons queries since module publishing might affect lesson visibility
      queryClient.invalidateQueries({ queryKey: publishingKeys.availableLessons(graphId, layerId) });
      queryClient.invalidateQueries({ queryKey: publishingKeys.availableLessons(graphId, '') });
      // Refetch to ensure UI updates immediately
      await queryClient.refetchQueries({ queryKey: publishingKeys.availableModules(graphId) });
    },
  });
}

/**
 * Unpublish a module
 */
export function useUnpublishModule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ graphId, layerId }: { graphId: string; layerId: string }) => {
      return graphPublishingApi.unpublishModule(graphId, layerId);
    },
    onSuccess: async (_, { graphId, layerId }) => {
      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: knowledgeGraphKeys.graph(graphId) });
      queryClient.invalidateQueries({ queryKey: publishingKeys.availableModules(graphId) });
      // Also invalidate lessons queries
      queryClient.invalidateQueries({ queryKey: publishingKeys.availableLessons(graphId, layerId) });
      queryClient.invalidateQueries({ queryKey: publishingKeys.availableLessons(graphId, '') });
      // Refetch to ensure UI updates immediately
      await queryClient.refetchQueries({ queryKey: publishingKeys.availableModules(graphId) });
    },
  });
}

/**
 * Publish all modules in a graph
 */
export function usePublishAllModules() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (graphId: string) => {
      return graphPublishingApi.publishAllModules(graphId);
    },
    onSuccess: (_, graphId) => {
      queryClient.invalidateQueries({ queryKey: knowledgeGraphKeys.graph(graphId) });
      queryClient.invalidateQueries({ queryKey: publishingKeys.availableModules(graphId) });
    },
  });
}

// ============================================================================
// Lesson Publishing Hooks
// ============================================================================

/**
 * Get all published lessons in a graph
 */
export function usePublishedLessons(graphId: string | undefined) {
  return useQuery({
    queryKey: publishingKeys.availableLessons(graphId!, ''),
    queryFn: async () => {
      const response = await graphPublishingApi.getPublishedLessons(graphId!);
      return response.lessons;
    },
    enabled: !!graphId,
  });
}

/**
 * Get lessons for a specific module
 */
export function useModuleLessons(graphId: string | undefined, layerId: string | undefined) {
  return useQuery({
    queryKey: publishingKeys.availableLessons(graphId!, layerId!),
    queryFn: async () => {
      const response = await graphPublishingApi.getModuleLessons(graphId!, layerId!);
      return response.lessons;
    },
    enabled: !!graphId && !!layerId,
  });
}

/**
 * Publish a lesson (concept)
 */
export function usePublishLesson() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      graphId,
      conceptId,
      settings,
    }: {
      graphId: string;
      conceptId: string;
      settings?: LessonPublishSettings;
      layerId?: string; // Optional layerId for more specific invalidation
    }) => {
      return graphPublishingApi.publishLesson(graphId, conceptId, settings);
    },
    onSuccess: async (_, { graphId, layerId }) => {
      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: knowledgeGraphKeys.graph(graphId) });
      queryClient.invalidateQueries({ queryKey: publishingKeys.availableLessons(graphId, '') });
      // If layerId provided, also invalidate module-specific lessons query
      if (layerId) {
        queryClient.invalidateQueries({ queryKey: publishingKeys.availableLessons(graphId, layerId) });
      }
      // Refetch to ensure UI updates immediately
      if (layerId) {
        await queryClient.refetchQueries({ queryKey: publishingKeys.availableLessons(graphId, layerId) });
      }
      await queryClient.refetchQueries({ queryKey: publishingKeys.availableLessons(graphId, '') });
    },
  });
}

/**
 * Unpublish a lesson
 */
export function useUnpublishLesson() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ graphId, conceptId }: { graphId: string; conceptId: string; layerId?: string }) => {
      return graphPublishingApi.unpublishLesson(graphId, conceptId);
    },
    onSuccess: async (_, { graphId, layerId }) => {
      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: knowledgeGraphKeys.graph(graphId) });
      queryClient.invalidateQueries({ queryKey: publishingKeys.availableLessons(graphId, '') });
      // If layerId provided, also invalidate module-specific lessons query
      if (layerId) {
        queryClient.invalidateQueries({ queryKey: publishingKeys.availableLessons(graphId, layerId) });
      }
      // Refetch to ensure UI updates immediately
      if (layerId) {
        await queryClient.refetchQueries({ queryKey: publishingKeys.availableLessons(graphId, layerId) });
      }
      await queryClient.refetchQueries({ queryKey: publishingKeys.availableLessons(graphId, '') });
    },
  });
}

/**
 * Publish all lessons in a module
 */
export function usePublishAllLessonsInModule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ graphId, layerId }: { graphId: string; layerId: string }) => {
      return graphPublishingApi.publishAllLessonsInModule(graphId, layerId);
    },
    onSuccess: (_, { graphId, layerId }) => {
      queryClient.invalidateQueries({ queryKey: knowledgeGraphKeys.graph(graphId) });
      queryClient.invalidateQueries({ queryKey: publishingKeys.availableLessons(graphId, '') });
      queryClient.invalidateQueries({ queryKey: publishingKeys.availableLessons(graphId, layerId) });
    },
  });
}

// ============================================================================
// Content Readiness Hook
// ============================================================================

/**
 * Get content readiness status for publishing
 */
export function useContentReadiness(graphId: string | undefined) {
  return useQuery({
    queryKey: [...publishingKeys.courseSettings(graphId!), 'readiness'] as const,
    queryFn: async () => {
      return graphPublishingApi.getContentReadiness(graphId!);
    },
    enabled: !!graphId,
  });
}

// ============================================================================
// Mentor Courses Hook
// ============================================================================

/**
 * Get all published courses for the current mentor
 * Queries graphs that have CourseSettings nodes
 */
export function useMentorPublishedCourses() {
  return useQuery({
    queryKey: publishingKeys.courses(),
    queryFn: async () => {
      const response = await graphPublishingApi.getMentorPublishedCourses();
      return response.courses;
    },
  });
}

// ============================================================================
// Type Exports
// ============================================================================

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
};
