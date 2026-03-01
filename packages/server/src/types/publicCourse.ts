/**
 * Public Course Types
 * 
 * Types for the public course index, which is a denormalized
 * collection for efficient searching and browsing of published courses.
 */

/**
 * Public course entry in the index
 * This is a lightweight representation for listing/searching
 */
export interface PublicCourseEntry {
  id: string;
  graphId: string;
  mentorId: string;
  
  // Display info
  title: string;
  description: string;
  thumbnailUrl?: string;
  
  // Mentor info (denormalized for display)
  mentorName: string;
  mentorAvatar?: string;
  
  // Course stats
  moduleCount: number;
  lessonCount: number;
  enrollmentCount: number;
  estimatedDuration?: number; // in minutes
  
  // Language info
  primaryLanguage: string;
  availableLanguages: string[];
  
  // Categories/tags for search
  category?: string;
  tags: string[];
  difficulty?: 'beginner' | 'intermediate' | 'advanced';
  
  // Timestamps
  publishedAt: number;
  updatedAt: number;
  
  // Search optimization
  searchText: string; // Lowercased concatenation of title, description, tags for text search
}

/**
 * Search filters for public courses
 */
export interface PublicCourseSearchFilters {
  query?: string; // Text search
  category?: string;
  tags?: string[];
  difficulty?: 'beginner' | 'intermediate' | 'advanced';
  language?: string;
  mentorId?: string;
  minDuration?: number;
  maxDuration?: number;
  sortBy?: 'publishedAt' | 'enrollmentCount' | 'title' | 'duration';
  sortOrder?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
}

/**
 * Search results with pagination
 */
export interface PublicCourseSearchResult {
  courses: PublicCourseEntry[];
  total: number;
  hasMore: boolean;
  nextOffset?: number;
}

/**
 * Featured course (for homepage/promotions)
 */
export interface FeaturedCourse extends PublicCourseEntry {
  featuredAt: number;
  featuredReason?: string;
  priority: number; // For ordering featured courses
}

/**
 * Course category
 */
export interface CourseCategory {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  courseCount: number;
  parentCategoryId?: string;
}

/**
 * Create search text for a course entry
 */
export function createSearchText(
  title: string,
  description: string,
  tags: string[],
  mentorName: string
): string {
  return [
    title.toLowerCase(),
    description.toLowerCase(),
    ...tags.map(t => t.toLowerCase()),
    mentorName.toLowerCase(),
  ].join(' ');
}

/**
 * Create a public course entry from graph data
 */
export function createPublicCourseEntry(
  graphId: string,
  courseData: {
    title: string;
    description: string;
    thumbnailUrl?: string;
    mentorId: string;
    mentorName: string;
    mentorAvatar?: string;
    moduleCount: number;
    lessonCount: number;
    estimatedDuration?: number;
    primaryLanguage: string;
    availableLanguages?: string[];
    category?: string;
    tags?: string[];
    difficulty?: 'beginner' | 'intermediate' | 'advanced';
  }
): Omit<PublicCourseEntry, 'id' | 'enrollmentCount' | 'publishedAt' | 'updatedAt'> {
  return {
    graphId,
    mentorId: courseData.mentorId,
    title: courseData.title,
    description: courseData.description,
    thumbnailUrl: courseData.thumbnailUrl,
    mentorName: courseData.mentorName,
    mentorAvatar: courseData.mentorAvatar,
    moduleCount: courseData.moduleCount,
    lessonCount: courseData.lessonCount,
    estimatedDuration: courseData.estimatedDuration,
    primaryLanguage: courseData.primaryLanguage,
    availableLanguages: courseData.availableLanguages || [courseData.primaryLanguage],
    category: courseData.category,
    tags: courseData.tags || [],
    difficulty: courseData.difficulty,
    searchText: createSearchText(
      courseData.title,
      courseData.description,
      courseData.tags || [],
      courseData.mentorName
    ),
  };
}
