/**
 * Publishing types for Course, Module, and Lesson publishing feature
 */

export interface PublishedCourse {
  id: string;
  graphId: string;
  seedConceptId: string; // ID of the seed concept
  seedConceptName: string;
  mentorId: string; // User ID of the mentor
  mentorName: string;
  
  // Course metadata
  title: string; // Course title (can be different from seed concept name)
  description: string;
  thumbnailUrl?: string; // Default thumbnail for all modules and lessons
  estimatedDuration?: number; // Total duration in minutes (sum of all modules and lessons)
  
  // Publishing settings (default for all modules and lessons)
  // These settings are automatically applied to all modules and lessons in the course
  isPublic: boolean; // true = public, false = private (default for all modules and lessons)
  privateLink?: string; // Generated link for private access (shared by all modules and lessons)
  publishedAt: number; // Timestamp when course was published
  
  // Module management
  moduleIds: string[]; // IDs of all modules in the course (ordered by sequence)
  moduleSequence: string[]; // Ordered list of module IDs by sequence (from concept.sequence)
  
  // Notification settings (course-level defaults for all modules and lessons)
  // All modules and lessons inherit these settings unless overridden
  notificationInterval?: number; // days between notifications (default for all modules and lessons)
  notificationType: 'email' | 'push' | 'both'; // Default notification type for all modules and lessons
  
  // Status
  status: 'draft' | 'published' | 'archived';
  version: number; // Track updates to published course
  
  // Course settings
  allowSkipAhead: boolean; // If all lessons published, students can skip ahead
  requireSequentialProgress: boolean; // Must complete lessons in order
  
  // Settings propagation
  propagateSettingsToModules: boolean; // If true, course setting changes update all modules
  propagateSettingsToLessons: boolean; // If true, course setting changes update all lessons
  
  createdAt: number;
  updatedAt: number;
}

export interface PublishedModule {
  id: string;
  courseId: string; // Reference to the published course (required)
  graphId: string;
  conceptId: string; // ID of the concept that represents this module (direct child of seedConcept)
  conceptName: string;
  mentorId: string; // User ID of the mentor (inherited from course)
  mentorName: string; // Inherited from course
  
  // Sequence in course
  sequence: number; // Sequence order in the course (from concept.sequence)
  position: number; // Position in published modules list
  
  // Publishing settings (inherit from course by default)
  // These settings are automatically inherited from PublishedCourse
  // Can be overridden per module if needed
  isPublic?: boolean; // Inherits from course.isPublic if not set
  privateLink?: string; // Inherits from course.privateLink if not set
  publishedAt: number; // Timestamp when this specific module was published
  
  // Module metadata
  title: string; // Module title (can be different from concept name)
  description: string;
  thumbnailUrl?: string; // Can override course thumbnail
  estimatedDuration?: number; // Total duration in minutes (sum of all lessons in module)
  
  // Lesson management
  availableLessons: string[]; // Concept IDs of all children concepts (available to publish)
  // Order is determined by the module concept's children array order
  publishedLessonIds: string[]; // Concept IDs of published lessons in this module
  lessonSequence: string[]; // Ordered list of lesson concept IDs (matches module concept's children array order)
  
  // Notification settings (inherit from course by default)
  notificationInterval?: number; // Inherits from course.notificationInterval if not set
  notificationType?: 'email' | 'push' | 'both'; // Inherits from course.notificationType if not set
  
  // Status
  status: 'draft' | 'published' | 'archived';
  version: number; // Track updates to published module
  
  // Settings override flags
  overridesCourseSettings: boolean; // True if module has custom settings that override course defaults
  
  createdAt: number;
  updatedAt: number;
}

export interface PublishedLesson {
  id: string;
  courseId: string; // Reference to the published course (required)
  moduleId: string; // Reference to the published module (required)
  graphId: string;
  conceptId: string; // ID of the concept being published (child of module's concept)
  conceptName: string;
  mentorId: string; // User ID of the mentor (inherited from course)
  mentorName: string; // Inherited from course
  
  // Sequence in module and course
  sequence: number; // Sequence order within the module (from position in module concept's children array)
  position: number; // Position in published lessons list within module (matches children array order)
  moduleSequence: number; // Sequence of parent module in course (from module concept.sequence)
  
  // Publishing settings (inherit from module or course by default)
  // These settings are automatically inherited from PublishedModule (or PublishedCourse if module doesn't override)
  // Can be overridden per lesson if needed
  isPublic?: boolean; // Inherits from module.isPublic (or course.isPublic) if not set
  privateLink?: string; // Inherits from module.privateLink (or course.privateLink) if not set
  publishedAt: number; // Timestamp when this specific lesson was published
  
  // Lesson metadata
  title: string; // Can be different from concept name
  description: string;
  thumbnailUrl?: string; // Can override module or course thumbnail
  estimatedDuration?: number; // in minutes
  
  // Notification settings (inherit from module or course by default)
  notificationInterval?: number; // Inherits from module.notificationInterval (or course) if not set
  notificationType?: 'email' | 'push' | 'both'; // Inherits from module.notificationType (or course) if not set
  
  // Assessment settings (lesson-specific)
  hasAssessment: boolean;
  assessmentRequired: boolean; // true = must pass, false = optional
  assessmentId?: string; // Reference to assessment
  
  // Status
  status: 'draft' | 'published' | 'archived';
  version: number; // Track updates to published lesson
  
  // Parent/child relationships (for nested lessons)
  parentLessonId?: string; // If this is a child of another lesson
  childLessonIds: string[]; // Direct children lessons
  
  // Auto-publish settings
  autoPublishParent: boolean; // Auto-publish parent when child is published
  
  // Settings override flags
  overridesModuleSettings: boolean; // True if lesson has custom settings that override module defaults
  overridesCourseSettings: boolean; // True if lesson has custom settings that override course defaults
  
  // Lesson content (from concept)
  lessonContent?: string; // Markdown lesson content
  flashCards?: Array<{ front: string; back: string }>; // Array of flash cards
  
  createdAt: number;
  updatedAt: number;
}

export interface CoursePublishSettings {
  title?: string;
  description?: string;
  thumbnailUrl?: string;
  isPublic?: boolean;
  notificationInterval?: number;
  notificationType?: 'email' | 'push' | 'both';
  allowSkipAhead?: boolean;
  requireSequentialProgress?: boolean;
  propagateSettingsToModules?: boolean;
  propagateSettingsToLessons?: boolean;
}

export interface ModulePublishSettings {
  title?: string;
  description?: string;
  thumbnailUrl?: string;
  isPublic?: boolean;
  privateLink?: string;
  notificationInterval?: number;
  notificationType?: 'email' | 'push' | 'both';
  inheritFromCourse?: boolean; // If true, resets to inherit from course
}

export interface LessonPublishSettings {
  title?: string;
  description?: string;
  thumbnailUrl?: string;
  isPublic?: boolean;
  privateLink?: string;
  notificationInterval?: number;
  notificationType?: 'email' | 'push' | 'both';
  inheritFromModule?: boolean; // If true, resets to inherit from module/course
  hasAssessment?: boolean;
  assessmentRequired?: boolean;
}

// --- Enrollment & Assessment Interfaces ---

export interface Enrollment {
  id: string;
  studentId: string;
  courseId: string; // Enrolled in the course
  enrolledAt: number;
  
  // Progress tracking
  currentModuleId: string; // Current module student is on
  currentLessonId: string; // Current lesson student is on (from published lessons)
  completedModuleIds: string[]; // Completed module IDs
  completedLessonIds: string[]; // Completed lesson IDs
  startedAt: number;
  lastAccessedAt: number;
  
  // Module and lesson access
  accessibleModuleIds: string[]; // Modules student can access (published modules)
  accessibleLessonIds: string[]; // Lessons student can access (published lessons)
  lockedModuleIds: string[]; // Modules not yet published or locked
  lockedLessonIds: string[]; // Lessons not yet published or locked
  
  // Assessment status
  assessmentStatus: Map<string, AssessmentStatus>; // lessonId -> status
  canSkipAhead: boolean; // If all lessons published, can skip
  
  // Notification preferences
  notificationEnabled: boolean;
  nextNotificationAt?: number;
}

export interface AssessmentStatus {
  lessonId: string;
  status: 'not_started' | 'in_progress' | 'passed' | 'failed' | 'skipped';
  score?: number;
  maxScore?: number;
  attempts: number;
  lastAttemptAt?: number;
  canAdvance: boolean;
}

export interface Assessment {
  id: string;
  courseId: string; // Reference to course (required for new structure)
  moduleId: string; // Reference to module (required for new structure)
  lessonId: string; // Reference to lesson
  mentorId: string; // User ID of the mentor (can be derived from course, but kept for convenience)
  title: string;
  description?: string;
  questions: AssessmentQuestion[];
  
  // Scoring
  passingScore: number; // Percentage (0-100)
  maxAttempts?: number; // null = unlimited
  
  // Settings
  timeLimit?: number; // in minutes, null = no limit
  showResults: boolean; // Show results after completion
  randomizeQuestions: boolean;
  
  createdAt: number;
  updatedAt: number;
}

export interface AssessmentQuestion {
  id: string;
  type: 'multiple_choice' | 'true_false' | 'short_answer' | 'essay';
  question: string;
  options?: string[]; // For multiple_choice
  correctAnswer?: string; // For true_false, short_answer, or single correct option
  correctAnswers?: string[]; // For multiple correct options
  points: number;
  explanation?: string; // Shown after answering
}

export interface AssessmentSubmission {
  id: string;
  assessmentId: string;
  enrollmentId: string;
  studentId: string;
  lessonId: string;
  answers: AssessmentAnswer[];
  score?: number;
  maxScore: number;
  percentage?: number;
  passed: boolean;
  submittedAt: number;
  gradedAt?: number;
}

export interface AssessmentAnswer {
  questionId: string;
  answer: string | string[]; // Can be string for short_answer/essay, or array for multiple_choice
  isCorrect?: boolean; // For auto-graded questions
  pointsEarned?: number;
  feedback?: string; // LLM-generated feedback for essay/long form answers
}

