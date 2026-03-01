import { apiClient } from '../../services/apiClient';

/**
 * Public API client for courses (no authentication required)
 */
export const publicApi = {
  /**
   * List all public courses
   */
  listPublicCourses: async () => {
    return apiClient.fetch('/api/public/courses', {
      headers: { "Content-Type": "application/json" },
    });
  },

  /**
   * Get a public course by ID
   */
  getPublicCourse: async (courseId: string) => {
    return apiClient.fetch(`/api/public/courses/${courseId}`, {
      headers: { "Content-Type": "application/json" },
    });
  },

  /**
   * Get a course by private link
   */
  getCourseByLink: async (link: string) => {
    return apiClient.fetch(`/api/public/courses/by-link?link=${encodeURIComponent(link)}`, {
      headers: { "Content-Type": "application/json" },
    });
  },

  /**
   * Get course details with modules and lessons (for public preview)
   */
  getCourseDetails: async (
    courseId: string,
    options?: {
      includeModules?: boolean;
      includeLessons?: boolean;
    }
  ) => {
    const params = new URLSearchParams();
    if (options?.includeModules) params.append('includeModules', 'true');
    if (options?.includeLessons) params.append('includeLessons', 'true');
    
    return apiClient.fetch(`/api/public/courses/${courseId}/details?${params}`, {
      headers: { "Content-Type": "application/json" },
    });
  },

  /**
   * Get lesson content for a published lesson
   */
  getLessonContent: async (
    courseId: string,
    lessonId: string
  ) => {
    return apiClient.fetch(`/api/public/courses/${courseId}/lessons/${lessonId}/content`, {
      headers: { "Content-Type": "application/json" },
    });
  },
};

