/**
 * Course Template React Query Hooks
 * 
 * Hooks for course template operations with caching and optimistic updates.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  templateApi,
  type TemplateCategory,
  type TemplateDifficulty,
  type TemplateFilters,
  type CreateTemplateInput,
  type UpdateTemplateInput,
  type CourseCustomization,
  type CourseTemplate,
  type TemplateSummary,
  type CreateFromTemplateResult,
} from '../templateApi';

// ============================================================================
// Query Keys
// ============================================================================

export const templateKeys = {
  all: ['templates'] as const,
  system: () => [...templateKeys.all, 'system'] as const,
  systemList: (category?: TemplateCategory) => [...templateKeys.system(), 'list', category] as const,
  systemDetail: (id: string) => [...templateKeys.system(), 'detail', id] as const,
  popular: (limit?: number) => [...templateKeys.all, 'popular', limit] as const,
  search: (query: string, filters?: TemplateFilters) => [...templateKeys.all, 'search', query, filters] as const,
  user: () => [...templateKeys.all, 'user'] as const,
  userList: () => [...templateKeys.user(), 'list'] as const,
  userDetail: (id: string) => [...templateKeys.user(), 'detail', id] as const,
};

// ============================================================================
// System Template Hooks
// ============================================================================

/**
 * Get list of system templates
 */
export function useSystemTemplates(category?: TemplateCategory) {
  return useQuery({
    queryKey: templateKeys.systemList(category),
    queryFn: async () => {
      const response = await templateApi.listSystemTemplates(category);
      return response.templates;
    },
  });
}

/**
 * Get popular templates
 */
export function usePopularTemplates(limit?: number) {
  return useQuery({
    queryKey: templateKeys.popular(limit),
    queryFn: async () => {
      const response = await templateApi.getPopularTemplates(limit);
      return response.templates;
    },
  });
}

/**
 * Search templates
 */
export function useSearchTemplates(query: string, filters?: TemplateFilters) {
  return useQuery({
    queryKey: templateKeys.search(query, filters),
    queryFn: async () => {
      const response = await templateApi.searchTemplates(query, filters);
      return response.templates;
    },
    enabled: query.length > 0 || !!filters?.category || !!filters?.difficulty,
  });
}

/**
 * Get a single system template
 */
export function useSystemTemplate(templateId: string | undefined) {
  return useQuery({
    queryKey: templateKeys.systemDetail(templateId!),
    queryFn: async () => {
      const response = await templateApi.getSystemTemplate(templateId!);
      return response.template;
    },
    enabled: !!templateId,
  });
}

/**
 * Create course from system template
 */
export function useCreateCourseFromTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      templateId,
      customizations,
    }: {
      templateId: string;
      customizations: CourseCustomization;
    }) => {
      return templateApi.createCourseFromTemplate(templateId, customizations);
    },
    onSuccess: () => {
      // Invalidate courses list after creating a new course
      queryClient.invalidateQueries({ queryKey: ['publishing', 'courses'] });
    },
  });
}

// ============================================================================
// User Template Hooks
// ============================================================================

/**
 * Get list of user's templates
 */
export function useUserTemplates() {
  return useQuery({
    queryKey: templateKeys.userList(),
    queryFn: async () => {
      const response = await templateApi.listUserTemplates();
      return response.templates;
    },
  });
}

/**
 * Get a single user template
 */
export function useUserTemplate(templateId: string | undefined) {
  return useQuery({
    queryKey: templateKeys.userDetail(templateId!),
    queryFn: async () => {
      const response = await templateApi.getUserTemplate(templateId!);
      return response.template;
    },
    enabled: !!templateId,
  });
}

/**
 * Create a new user template
 */
export function useCreateUserTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateTemplateInput) => {
      const response = await templateApi.createUserTemplate(input);
      return response.template;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: templateKeys.userList() });
    },
  });
}

/**
 * Update a user template
 */
export function useUpdateUserTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      templateId,
      updates,
    }: {
      templateId: string;
      updates: UpdateTemplateInput;
    }) => {
      const response = await templateApi.updateUserTemplate(templateId, updates);
      return response.template;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: templateKeys.userList() });
      queryClient.invalidateQueries({ queryKey: templateKeys.userDetail(variables.templateId) });
    },
  });
}

/**
 * Delete a user template
 */
export function useDeleteUserTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (templateId: string) => {
      return templateApi.deleteUserTemplate(templateId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: templateKeys.userList() });
    },
  });
}

/**
 * Create course from user template
 */
export function useCreateCourseFromUserTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      templateId,
      customizations,
    }: {
      templateId: string;
      customizations: CourseCustomization;
    }) => {
      return templateApi.createCourseFromUserTemplate(templateId, customizations);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['publishing', 'courses'] });
    },
  });
}

// ============================================================================
// Course to Template Hooks
// ============================================================================

/**
 * Save existing course as a template
 */
export function useSaveCourseAsTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      graphId,
      name,
      description,
      category,
      difficulty,
      isPublic = false,
    }: {
      graphId: string;
      name: string;
      description: string;
      category: TemplateCategory;
      difficulty: TemplateDifficulty;
      isPublic?: boolean;
    }) => {
      const response = await templateApi.saveCourseAsTemplate(graphId, {
        name,
        description,
        category,
        difficulty,
        isPublic,
      });
      return response.template;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: templateKeys.userList() });
    },
  });
}

// ============================================================================
// Type Exports
// ============================================================================

export type {
  CourseTemplate,
  TemplateSummary,
  CreateTemplateInput,
  UpdateTemplateInput,
  CourseCustomization,
  CreateFromTemplateResult,
  TemplateCategory,
  TemplateDifficulty,
  TemplateFilters,
};
