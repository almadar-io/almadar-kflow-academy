/**
 * React Query Keys for Knowledge Graph
 * 
 * Centralized query keys for consistent caching and invalidation.
 * Using factory pattern for type safety and consistency.
 */

export const knowledgeGraphKeys = {
  // Base keys
  all: ['knowledge-graph'] as const,
  
  // Learning paths
  learningPaths: () => [...knowledgeGraphKeys.all, 'learning-paths'] as const,
  
  // Graph-specific keys
  graph: (graphId: string) => [...knowledgeGraphKeys.all, 'graph', graphId] as const,
  
  // Graph summary
  graphSummary: (graphId: string) => [...knowledgeGraphKeys.graph(graphId), 'summary'] as const,
  
  // Concepts by layer
  conceptsByLayer: (graphId: string, options?: { includeRelationships?: boolean; groupByLayer?: boolean }) => 
    [...knowledgeGraphKeys.graph(graphId), 'concepts-by-layer', options ?? {}] as const,
  
  // Concept detail
  conceptDetail: (graphId: string, conceptId: string) => 
    [...knowledgeGraphKeys.graph(graphId), 'concept', conceptId] as const,
  
  // MindMap structure
  mindMap: (graphId: string, options?: { expandAll?: boolean }) => 
    [...knowledgeGraphKeys.graph(graphId), 'mindmap', options ?? {}] as const,
  
  // Full graph data (REST API)
  graphData: (graphId: string) => [...knowledgeGraphKeys.graph(graphId), 'data'] as const,
  
  // Nodes
  nodes: (graphId: string) => [...knowledgeGraphKeys.graph(graphId), 'nodes'] as const,
  node: (graphId: string, nodeId: string) => [...knowledgeGraphKeys.nodes(graphId), nodeId] as const,
  
  // Relationships
  relationships: (graphId: string) => [...knowledgeGraphKeys.graph(graphId), 'relationships'] as const,
  nodeRelationships: (graphId: string, nodeId: string) => 
    [...knowledgeGraphKeys.relationships(graphId), 'node', nodeId] as const,
};

/**
 * React Query Keys for Course Publishing
 */
export const publishingKeys = {
  // Base keys
  all: ['publishing'] as const,
  
  // Courses
  courses: () => [...publishingKeys.all, 'courses'] as const,
  course: (courseId: string) => [...publishingKeys.all, 'course', courseId] as const,
  courseDetails: (courseId: string, options?: { includeModules?: boolean; includeLessons?: boolean }) => 
    [...publishingKeys.course(courseId), 'details', options ?? {}] as const,
  
  // Course settings (graph-based)
  courseSettings: (graphId: string) => [...publishingKeys.all, 'settings', graphId] as const,
  
  // Published course view
  publishedCourse: (mentorId: string, graphId: string) => 
    [...publishingKeys.all, 'published', mentorId, graphId] as const,
  
  // Modules
  modules: (courseId: string) => [...publishingKeys.course(courseId), 'modules'] as const,
  module: (courseId: string, moduleId: string) => [...publishingKeys.modules(courseId), moduleId] as const,
  publishedModules: (courseId: string) => [...publishingKeys.modules(courseId), 'published'] as const,
  unpublishedModules: (courseId: string) => [...publishingKeys.modules(courseId), 'unpublished'] as const,
  
  // Module settings (graph-based)
  moduleSettings: (graphId: string, layerId: string) => 
    [...publishingKeys.all, 'module-settings', graphId, layerId] as const,
  
  // Available modules from graph
  availableModules: (graphId: string) => [...publishingKeys.all, 'available-modules', graphId] as const,
  
  // Lessons
  lessons: (courseId: string, moduleId: string) => [...publishingKeys.module(courseId, moduleId), 'lessons'] as const,
  lesson: (courseId: string, moduleId: string, lessonId: string) => 
    [...publishingKeys.lessons(courseId, moduleId), lessonId] as const,
  publishedLessons: (courseId: string, moduleId: string) => 
    [...publishingKeys.lessons(courseId, moduleId), 'published'] as const,
  
  // Lesson settings (graph-based)
  lessonSettings: (graphId: string, conceptId: string) => 
    [...publishingKeys.all, 'lesson-settings', graphId, conceptId] as const,
  
  // Available lessons from graph
  availableLessons: (graphId: string, moduleConceptId: string) => 
    [...publishingKeys.all, 'available-lessons', graphId, moduleConceptId] as const,
  
  // All lessons in course
  allLessonsInCourse: (courseId: string) => [...publishingKeys.course(courseId), 'all-lessons'] as const,
};

/**
 * React Query Keys for Enrollment
 */
export const enrollmentKeys = {
  // Base keys
  all: ['enrollment'] as const,
  
  // Student enrollments
  myEnrollments: (options?: { status?: string }) => 
    [...enrollmentKeys.all, 'my', options ?? {}] as const,
  
  // Single enrollment
  enrollment: (enrollmentId: string) => [...enrollmentKeys.all, 'detail', enrollmentId] as const,
  
  // Check enrollment status
  enrollmentStatus: (mentorId: string, graphId: string) => 
    [...enrollmentKeys.all, 'status', mentorId, graphId] as const,
  
  // Course students (for mentors)
  courseStudents: (graphId: string, options?: { status?: string; limit?: number }) => 
    [...enrollmentKeys.all, 'students', graphId, options ?? {}] as const,
  
  // Enrollment count
  enrollmentCount: (graphId: string, status?: string) => 
    [...enrollmentKeys.all, 'count', graphId, status ?? 'all'] as const,
};

/**
 * React Query Keys for Translation
 */
export const translationKeys = {
  // Base keys
  all: ['translation'] as const,
  
  // Supported languages
  languages: () => [...translationKeys.all, 'languages'] as const,
  
  // Cached translation
  cached: (nodeId: string, targetLanguage: string) => 
    [...translationKeys.all, 'cached', nodeId, targetLanguage] as const,
  
  // Translation staleness
  staleness: (graphId: string, nodeId: string, targetLanguage: string) => 
    [...translationKeys.all, 'stale', graphId, nodeId, targetLanguage] as const,
  
  // Lesson translation
  lesson: (graphId: string, conceptId: string, targetLanguage: string) => 
    [...translationKeys.all, 'lesson', graphId, conceptId, targetLanguage] as const,
  
  // Flashcard translation
  flashcards: (graphId: string, conceptId: string, targetLanguage: string) => 
    [...translationKeys.all, 'flashcards', graphId, conceptId, targetLanguage] as const,
};

/**
 * React Query Keys for Analytics
 */
export const analyticsKeys = {
  // Base keys
  all: ['analytics'] as const,
  
  // Course analytics
  course: (graphId: string, options?: { timeRange?: string }) => 
    [...analyticsKeys.all, 'course', graphId, options ?? {}] as const,
  
  // Lesson analytics
  lesson: (graphId: string, conceptId: string, options?: { timeRange?: string }) => 
    [...analyticsKeys.all, 'lesson', graphId, conceptId, options ?? {}] as const,
  
  // Student analytics
  student: (graphId: string, studentId: string) => 
    [...analyticsKeys.all, 'student', graphId, studentId] as const,
  
  // Language analytics
  language: (graphId: string) => [...analyticsKeys.all, 'language', graphId] as const,
};

/**
 * React Query Keys for Assessment
 */
export const assessmentKeys = {
  // Base keys
  all: ['assessment'] as const,
  
  // Assessment by concept
  byConceptId: (conceptId: string) => [...assessmentKeys.all, 'concept', conceptId] as const,
  
  // Assessment by ID
  byId: (assessmentId: string) => [...assessmentKeys.all, 'detail', assessmentId] as const,
  
  // Assessment results
  results: (enrollmentId: string) => [...assessmentKeys.all, 'results', enrollmentId] as const,
  
  // Assessment submission
  submission: (assessmentId: string, studentId: string) => 
    [...assessmentKeys.all, 'submission', assessmentId, studentId] as const,
};

// Type helper for query key
export type KnowledgeGraphQueryKey = readonly (string | Record<string, unknown>)[];
export type PublishingQueryKey = readonly (string | Record<string, unknown>)[];
export type EnrollmentQueryKey = readonly (string | Record<string, unknown>)[];
export type TranslationQueryKey = readonly (string | Record<string, unknown>)[];
export type AnalyticsQueryKey = readonly (string | Record<string, unknown>)[];
export type AssessmentQueryKey = readonly (string | Record<string, unknown>)[];
