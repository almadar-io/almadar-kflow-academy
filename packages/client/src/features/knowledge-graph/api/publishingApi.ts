/**
 * Graph-Based Publishing API
 * 
 * API client for graph-based publishing operations.
 * These endpoints use CourseSettings, ModuleSettings, and LessonSettings nodes
 * stored directly in the knowledge graph.
 */

import { apiClient } from '../../../services/apiClient';
import { auth } from '../../../config/firebase';

// ============================================================================
// Types
// ============================================================================

export interface CoursePublishSettings {
  title?: string;
  description?: string;
  visibility?: 'public' | 'private' | 'unlisted';
  enrollmentEnabled?: boolean;
  maxStudents?: number;
  price?: number;
  currency?: string;
  thumbnailUrl?: string;
  tags?: string[];
  category?: string;
  estimatedDuration?: number;
  supportedLanguages?: string[];
  defaultLanguage?: string;
}

export interface ModulePublishSettings {
  order?: number;
  isVisible?: boolean;
  prerequisites?: string[];
}

export interface LessonPublishSettings {
  order?: number;
  isVisible?: boolean;
  enableAssessment?: boolean;
  enableFlashcards?: boolean;
}

export interface CourseSettingsResponse {
  id: string;
  graphId: string;
  title: string;
  description: string;
  visibility: 'public' | 'private' | 'unlisted';
  isPublished: boolean;
  publishedAt?: number;
  unpublishedAt?: number;
  enrollmentEnabled: boolean;
  maxStudents?: number;
  price?: number;
  currency?: string;
  thumbnailUrl?: string;
  tags?: string[];
  category?: string;
  estimatedDuration?: number;
  supportedLanguages?: string[];
  defaultLanguage?: string;
  createdAt: number;
  updatedAt: number;
}

export interface ModuleForPublishing {
  id: string;
  name: string;
  description: string;
  layerNumber: number;
  goal?: string;
  conceptCount: number;
  isPublished?: boolean; // Added to track published status
}

export interface LessonForPublishing {
  id: string;
  name: string;
  description: string;
  sequence?: number;
  hasLessonContent: boolean;
  hasFlashCards: boolean;
  isPublished?: boolean; // Added to track published status
}

export interface PublishedCourseView {
  courseSettingsId: string;
  graphId: string;
  title: string;
  description: string;
  visibility: 'public' | 'private' | 'unlisted';
  isPublished: boolean;
  publishedAt?: number;
  enrollmentEnabled: boolean;
  maxStudents?: number;
  price?: number;
  currency?: string;
  thumbnailUrl?: string;
  tags?: string[];
  category?: string;
  estimatedDuration?: number;
  difficulty?: string;
  supportedLanguages?: string[];
  defaultLanguage?: string;
  seed: {
    id: string;
    name: string;
    description: string;
    modules: ModuleForPublishing[];
  };
  totalModules: number;
  totalLessons: number;
}

export interface ContentReadinessResponse {
  graphId: string;
  isReady: boolean;
  readinessScore: number;
  totalModules: number;
  modulesWithContent: number;
  totalLessons: number;
  lessonsWithContent: number;
  issues: Array<{
    type: 'error' | 'warning';
    message: string;
    moduleId?: string;
    lessonId?: string;
  }>;
}

export interface MentorPublishedCourse {
  graphId: string;
  title: string;
  description: string;
  visibility: 'public' | 'private' | 'unlisted';
  isPublished: boolean;
  publishedAt?: number;
  enrollmentCount?: number;
  totalModules: number;
  totalLessons: number;
  thumbnailUrl?: string;
  tags?: string[];
  category?: string;
}

// ============================================================================
// Helper
// ============================================================================

const withAuthHeaders = async (): Promise<HeadersInit> => {
  const currentUser = auth.currentUser;
  if (!currentUser) {
    throw new Error('User is not authenticated');
  }
  const token = await currentUser.getIdToken();
  return {
    Authorization: `Bearer ${token}`,
  };
};

// ============================================================================
// API Client
// ============================================================================

export const graphPublishingApi = {
  // ==========================================================================
  // Course Publishing
  // ==========================================================================

  /**
   * Get course settings from graph (CourseSettings node)
   */
  getCourseSettings: async (graphId: string): Promise<{ settings: CourseSettingsResponse | null }> => {
    const headers = await withAuthHeaders();
    return apiClient.fetch(`/api/mentor/graphs/${graphId}/course-settings`, {
      headers,
    });
  },

  /**
   * Publish a course (creates CourseSettings node in graph)
   */
  publishCourse: async (
    graphId: string,
    settings: CoursePublishSettings
  ): Promise<{ courseSettingsId: string; course: PublishedCourseView }> => {
    const headers = await withAuthHeaders();
    return apiClient.fetch(`/api/mentor/graphs/${graphId}/publish`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...headers },
      body: JSON.stringify(settings),
    });
  },

  /**
   * Unpublish a course (marks CourseSettings as unpublished)
   */
  unpublishCourse: async (graphId: string): Promise<{ success: boolean }> => {
    const headers = await withAuthHeaders();
    return apiClient.fetch(`/api/mentor/graphs/${graphId}/publish`, {
      method: 'DELETE',
      headers,
    });
  },

  /**
   * Update course settings
   */
  updateCourseSettings: async (
    graphId: string,
    updates: Partial<CoursePublishSettings>
  ): Promise<{ settings: CourseSettingsResponse }> => {
    const headers = await withAuthHeaders();
    return apiClient.fetch(`/api/mentor/graphs/${graphId}/course-settings`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...headers },
      body: JSON.stringify(updates),
    });
  },

  /**
   * Get published course view (for students or preview)
   */
  getPublishedCourseView: async (
    graphId: string,
    options?: { language?: string }
  ): Promise<{ course: PublishedCourseView | null }> => {
    const headers = await withAuthHeaders();
    const params = new URLSearchParams();
    if (options?.language) params.append('language', options.language);
    const query = params.toString() ? `?${params}` : '';
    return apiClient.fetch(`/api/mentor/graphs/${graphId}/published-view${query}`, {
      headers,
    });
  },

  // ==========================================================================
  // Module Publishing
  // ==========================================================================

  /**
   * Get published modules for a graph
   */
  getPublishedModules: async (graphId: string): Promise<{ modules: ModuleForPublishing[] }> => {
    const headers = await withAuthHeaders();
    return apiClient.fetch(`/api/mentor/graphs/${graphId}/modules`, {
      headers,
    });
  },

  /**
   * Publish a module (layer)
   */
  publishModule: async (
    graphId: string,
    layerId: string,
    settings?: ModulePublishSettings
  ): Promise<{ moduleSettingsId: string }> => {
    const headers = await withAuthHeaders();
    return apiClient.fetch(`/api/mentor/graphs/${graphId}/modules/${layerId}/publish`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...headers },
      body: JSON.stringify(settings || {}),
    });
  },

  /**
   * Unpublish a module
   */
  unpublishModule: async (graphId: string, layerId: string): Promise<{ success: boolean }> => {
    const headers = await withAuthHeaders();
    return apiClient.fetch(`/api/mentor/graphs/${graphId}/modules/${layerId}/publish`, {
      method: 'DELETE',
      headers,
    });
  },

  /**
   * Publish all modules in a graph
   */
  publishAllModules: async (graphId: string): Promise<{ count: number }> => {
    const headers = await withAuthHeaders();
    return apiClient.fetch(`/api/mentor/graphs/${graphId}/modules/publish-all`, {
      method: 'POST',
      headers,
    });
  },

  // ==========================================================================
  // Lesson Publishing
  // ==========================================================================

  /**
   * Get all published lessons in a graph
   */
  getPublishedLessons: async (graphId: string): Promise<{ lessons: LessonForPublishing[] }> => {
    const headers = await withAuthHeaders();
    return apiClient.fetch(`/api/mentor/graphs/${graphId}/lessons`, {
      headers,
    });
  },

  /**
   * Get lessons for a specific module
   */
  getModuleLessons: async (
    graphId: string,
    layerId: string
  ): Promise<{ lessons: LessonForPublishing[] }> => {
    const headers = await withAuthHeaders();
    return apiClient.fetch(`/api/mentor/graphs/${graphId}/modules/${layerId}/lessons`, {
      headers,
    });
  },

  /**
   * Publish a lesson (concept)
   */
  publishLesson: async (
    graphId: string,
    conceptId: string,
    settings?: LessonPublishSettings
  ): Promise<{ lessonSettingsId: string }> => {
    const headers = await withAuthHeaders();
    return apiClient.fetch(`/api/mentor/graphs/${graphId}/lessons/${conceptId}/publish`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...headers },
      body: JSON.stringify(settings || {}),
    });
  },

  /**
   * Unpublish a lesson
   */
  unpublishLesson: async (graphId: string, conceptId: string): Promise<{ success: boolean }> => {
    const headers = await withAuthHeaders();
    return apiClient.fetch(`/api/mentor/graphs/${graphId}/lessons/${conceptId}/publish`, {
      method: 'DELETE',
      headers,
    });
  },

  /**
   * Publish all lessons in a module
   */
  publishAllLessonsInModule: async (
    graphId: string,
    layerId: string
  ): Promise<{ count: number }> => {
    const headers = await withAuthHeaders();
    return apiClient.fetch(`/api/mentor/graphs/${graphId}/modules/${layerId}/lessons/publish-all`, {
      method: 'POST',
      headers,
    });
  },

  // ==========================================================================
  // Content Readiness
  // ==========================================================================

  /**
   * Get content readiness status for publishing
   */
  getContentReadiness: async (graphId: string): Promise<ContentReadinessResponse> => {
    const headers = await withAuthHeaders();
    return apiClient.fetch(`/api/mentor/graphs/${graphId}/content-readiness`, {
      headers,
    });
  },

  // ==========================================================================
  // Mentor Courses
  // ==========================================================================

  /**
   * Get all published courses for the current mentor
   * Queries graphs that have CourseSettings nodes
   */
  getMentorPublishedCourses: async (): Promise<{ courses: MentorPublishedCourse[] }> => {
    const headers = await withAuthHeaders();
    return apiClient.fetch('/api/mentor/published-courses', {
      headers,
    });
  },

  /**
   * Check if a graph is published as a course
   */
  isGraphPublished: async (graphId: string): Promise<{ isPublished: boolean }> => {
    const headers = await withAuthHeaders();
    return apiClient.fetch(`/api/mentor/graphs/${graphId}/is-published`, {
      headers,
    });
  },
};
