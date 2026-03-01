/**
 * Course Template Types
 * 
 * Types for course templates - pre-built course structures that
 * mentors can use as starting points for creating new courses.
 */

/**
 * Course categories
 */
export type TemplateCategory = 
  | 'programming'
  | 'data-science'
  | 'design'
  | 'business'
  | 'language'
  | 'marketing'
  | 'personal-development'
  | 'other';

/**
 * Difficulty levels
 */
export type TemplateDifficulty = 'beginner' | 'intermediate' | 'advanced';

/**
 * Lesson template within a module
 */
export interface LessonTemplate {
  /**
   * Unique identifier for the lesson template
   */
  id: string;
  
  /**
   * Lesson title
   */
  title: string;
  
  /**
   * Brief description of what this lesson covers
   */
  description: string;
  
  /**
   * Order within the module
   */
  sequence: number;
  
  /**
   * Estimated time to complete in minutes
   */
  estimatedMinutes: number;
  
  /**
   * Optional placeholder content/outline
   */
  contentPlaceholder?: string;
  
  /**
   * Whether this lesson should include flashcards
   */
  includeFlashcards: boolean;
  
  /**
   * Whether this lesson should include an assessment
   */
  includeAssessment: boolean;
  
  /**
   * Learning objectives for this lesson
   */
  objectives?: string[];
}

/**
 * Module template within a course
 */
export interface ModuleTemplate {
  /**
   * Unique identifier for the module template
   */
  id: string;
  
  /**
   * Module title
   */
  title: string;
  
  /**
   * Brief description of what this module covers
   */
  description: string;
  
  /**
   * Order within the course
   */
  sequence: number;
  
  /**
   * Lessons within this module
   */
  lessons: LessonTemplate[];
  
  /**
   * Module learning goals
   */
  goals?: string[];
}

/**
 * Course template
 */
export interface CourseTemplate {
  /**
   * Unique identifier
   */
  id: string;
  
  /**
   * Template name
   */
  name: string;
  
  /**
   * Detailed description of the course
   */
  description: string;
  
  /**
   * Category for discovery
   */
  category: TemplateCategory;
  
  /**
   * Difficulty level
   */
  difficulty: TemplateDifficulty;
  
  /**
   * Thumbnail image URL
   */
  thumbnailUrl?: string;
  
  /**
   * Modules in this course template
   */
  modules: ModuleTemplate[];
  
  /**
   * Estimated total duration in hours
   */
  estimatedDuration: number;
  
  /**
   * Total number of lessons
   */
  lessonCount: number;
  
  /**
   * Who created this template
   * 'system' for built-in templates, userId for user-created
   */
  createdBy: string;
  
  /**
   * Whether this template is available to all users
   */
  isPublic: boolean;
  
  /**
   * How many times this template has been used
   */
  usageCount: number;
  
  /**
   * Average rating (1-5)
   */
  rating?: number;
  
  /**
   * Number of ratings
   */
  ratingCount?: number;
  
  /**
   * Tags for search/discovery
   */
  tags?: string[];
  
  /**
   * Target audience description
   */
  targetAudience?: string;
  
  /**
   * Prerequisites for this course
   */
  prerequisites?: string[];
  
  /**
   * What learners will achieve
   */
  learningOutcomes?: string[];
  
  /**
   * Creation timestamp
   */
  createdAt: number;
  
  /**
   * Last update timestamp
   */
  updatedAt: number;
}

/**
 * Input for creating a new template
 */
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

/**
 * Input for updating a template
 */
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

/**
 * Customization options when creating a course from a template
 */
export interface CourseCustomization {
  /**
   * Override the course title
   */
  title?: string;
  
  /**
   * Override the course description
   */
  description?: string;
  
  /**
   * Select specific modules to include (by id)
   */
  selectedModuleIds?: string[];
  
  /**
   * Set initial visibility
   */
  visibility?: 'public' | 'private' | 'unlisted';
  
  /**
   * Set default language
   */
  defaultLanguage?: string;
}

/**
 * Filters for template search
 */
export interface TemplateFilters {
  category?: TemplateCategory;
  difficulty?: TemplateDifficulty;
  minRating?: number;
  isPublic?: boolean;
  createdBy?: string;
  tags?: string[];
}

/**
 * Result from creating a course from a template
 */
export interface CreateFromTemplateResult {
  graphId: string;
  courseSettingsId: string;
  moduleCount: number;
  lessonCount: number;
}

/**
 * Template summary for lists
 */
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
