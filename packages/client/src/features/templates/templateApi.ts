/**
 * Course Template API
 * 
 * API client for course template operations.
 */

import { apiClient } from '../../services/apiClient';
import { auth } from '../../config/firebase';

// ============================================================================
// Types
// ============================================================================

export type TemplateCategory = 
  | 'programming'
  | 'data-science'
  | 'design'
  | 'business'
  | 'language'
  | 'marketing'
  | 'personal-development'
  | 'other';

export type TemplateDifficulty = 'beginner' | 'intermediate' | 'advanced';

export interface LessonTemplate {
  id: string;
  title: string;
  description: string;
  sequence: number;
  estimatedMinutes: number;
  contentPlaceholder?: string;
  includeFlashcards: boolean;
  includeAssessment: boolean;
  objectives?: string[];
}

export interface ModuleTemplate {
  id: string;
  title: string;
  description: string;
  sequence: number;
  lessons: LessonTemplate[];
  goals?: string[];
}

export interface CourseTemplate {
  id: string;
  name: string;
  description: string;
  category: TemplateCategory;
  difficulty: TemplateDifficulty;
  thumbnailUrl?: string;
  modules: ModuleTemplate[];
  estimatedDuration: number;
  lessonCount: number;
  createdBy: string;
  isPublic: boolean;
  usageCount: number;
  rating?: number;
  ratingCount?: number;
  tags?: string[];
  targetAudience?: string;
  prerequisites?: string[];
  learningOutcomes?: string[];
  createdAt: number;
  updatedAt: number;
}

export interface TemplateSummary {
  id: string;
  name: string;
  description: string;
  category: TemplateCategory;
  difficulty: TemplateDifficulty;
  thumbnailUrl?: string;
  moduleCount: number;
  lessonCount: number;
  estimatedDuration: number;
  usageCount: number;
  rating?: number;
  createdBy: string;
  isPublic: boolean;
  tags?: string[];
}

export interface CreateTemplateInput {
  name: string;
  description: string;
  category: TemplateCategory;
  difficulty: TemplateDifficulty;
  thumbnailUrl?: string;
  modules: Omit<ModuleTemplate, 'id'>[];
  isPublic: boolean;
  tags?: string[];
  targetAudience?: string;
  prerequisites?: string[];
  learningOutcomes?: string[];
}

export interface UpdateTemplateInput {
  name?: string;
  description?: string;
  category?: TemplateCategory;
  difficulty?: TemplateDifficulty;
  thumbnailUrl?: string;
  modules?: Omit<ModuleTemplate, 'id'>[];
  isPublic?: boolean;
  tags?: string[];
  targetAudience?: string;
  prerequisites?: string[];
  learningOutcomes?: string[];
}

export interface CourseCustomization {
  title?: string;
  description?: string;
  selectedModuleIds?: string[];
  visibility?: 'public' | 'private' | 'unlisted';
  defaultLanguage?: string;
}

export interface CreateFromTemplateResult {
  graphId: string;
  courseSettingsId: string;
  moduleCount: number;
  lessonCount: number;
}

export interface TemplateFilters {
  category?: TemplateCategory;
  difficulty?: TemplateDifficulty;
  minRating?: number;
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

export const templateApi = {
  // ==========================================================================
  // System Templates
  // ==========================================================================

  /**
   * List system templates, optionally filtered by category
   */
  listSystemTemplates: async (
    category?: TemplateCategory
  ): Promise<{ templates: TemplateSummary[] }> => {
    const params = new URLSearchParams();
    if (category) params.append('category', category);
    const query = params.toString() ? `?${params}` : '';
    return apiClient.fetch(`/api/templates${query}`);
  },

  /**
   * Get popular templates
   */
  getPopularTemplates: async (
    limit?: number
  ): Promise<{ templates: TemplateSummary[] }> => {
    const params = new URLSearchParams();
    if (limit) params.append('limit', limit.toString());
    const query = params.toString() ? `?${params}` : '';
    return apiClient.fetch(`/api/templates/popular${query}`);
  },

  /**
   * Search templates
   */
  searchTemplates: async (
    query: string,
    filters?: TemplateFilters
  ): Promise<{ templates: TemplateSummary[] }> => {
    const params = new URLSearchParams();
    if (query) params.append('q', query);
    if (filters?.category) params.append('category', filters.category);
    if (filters?.difficulty) params.append('difficulty', filters.difficulty);
    if (filters?.minRating) params.append('minRating', filters.minRating.toString());
    return apiClient.fetch(`/api/templates/search?${params}`);
  },

  /**
   * Get a single system template
   */
  getSystemTemplate: async (templateId: string): Promise<{ template: CourseTemplate }> => {
    return apiClient.fetch(`/api/templates/${templateId}`);
  },

  /**
   * Create a course from a system template
   */
  createCourseFromTemplate: async (
    templateId: string,
    customizations: CourseCustomization
  ): Promise<CreateFromTemplateResult> => {
    const headers = await withAuthHeaders();
    return apiClient.fetch(`/api/templates/${templateId}/use`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...headers },
      body: JSON.stringify(customizations),
    });
  },

  // ==========================================================================
  // User Templates
  // ==========================================================================

  /**
   * List user's templates
   */
  listUserTemplates: async (): Promise<{ templates: TemplateSummary[] }> => {
    const headers = await withAuthHeaders();
    return apiClient.fetch('/api/user/templates', { headers });
  },

  /**
   * Get a single user template
   */
  getUserTemplate: async (templateId: string): Promise<{ template: CourseTemplate }> => {
    const headers = await withAuthHeaders();
    return apiClient.fetch(`/api/user/templates/${templateId}`, { headers });
  },

  /**
   * Create a new user template
   */
  createUserTemplate: async (
    input: CreateTemplateInput
  ): Promise<{ template: CourseTemplate }> => {
    const headers = await withAuthHeaders();
    return apiClient.fetch('/api/user/templates', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...headers },
      body: JSON.stringify(input),
    });
  },

  /**
   * Update a user template
   */
  updateUserTemplate: async (
    templateId: string,
    updates: UpdateTemplateInput
  ): Promise<{ template: CourseTemplate }> => {
    const headers = await withAuthHeaders();
    return apiClient.fetch(`/api/user/templates/${templateId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...headers },
      body: JSON.stringify(updates),
    });
  },

  /**
   * Delete a user template
   */
  deleteUserTemplate: async (templateId: string): Promise<{ success: boolean }> => {
    const headers = await withAuthHeaders();
    return apiClient.fetch(`/api/user/templates/${templateId}`, {
      method: 'DELETE',
      headers,
    });
  },

  /**
   * Create a course from a user template
   */
  createCourseFromUserTemplate: async (
    templateId: string,
    customizations: CourseCustomization
  ): Promise<CreateFromTemplateResult> => {
    const headers = await withAuthHeaders();
    return apiClient.fetch(`/api/user/templates/${templateId}/use`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...headers },
      body: JSON.stringify(customizations),
    });
  },

  // ==========================================================================
  // Course to Template
  // ==========================================================================

  /**
   * Save an existing course as a template
   */
  saveCourseAsTemplate: async (
    graphId: string,
    options: {
      name: string;
      description: string;
      category: TemplateCategory;
      difficulty: TemplateDifficulty;
      isPublic?: boolean;
    }
  ): Promise<{ template: CourseTemplate }> => {
    const headers = await withAuthHeaders();
    return apiClient.fetch(`/api/courses/${graphId}/save-as-template`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...headers },
      body: JSON.stringify(options),
    });
  },
};
