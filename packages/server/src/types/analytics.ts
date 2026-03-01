/**
 * Analytics types for course analytics and reporting
 */

/**
 * Course-level analytics
 */
export interface CourseAnalytics {
  // Course identification
  mentorId: string;
  graphId: string;
  courseName: string;
  
  // Enrollment stats
  totalEnrollments: number;
  activeEnrollments: number;
  completedEnrollments: number;
  droppedEnrollments: number;
  
  // Progress stats
  averageProgress: number;        // 0-100
  medianProgress: number;         // 0-100
  progressDistribution: ProgressDistribution;
  
  // Completion stats
  completionRate: number;         // 0-100
  averageCompletionTime: number;  // days
  
  // Engagement stats
  averageTimeSpent: number;       // minutes
  totalTimeSpent: number;         // minutes
  lastActivityAt?: number;
  
  // Assessment stats
  assessmentStats: AssessmentOverview;
  
  // Content stats
  totalModules: number;
  totalLessons: number;
  publishedModules: number;
  publishedLessons: number;
  
  // Time period
  periodStart?: number;
  periodEnd?: number;
  generatedAt: number;
}

/**
 * Progress distribution buckets
 */
export interface ProgressDistribution {
  notStarted: number;      // 0%
  justStarted: number;     // 1-25%
  inProgress: number;      // 26-50%
  almostDone: number;      // 51-75%
  nearComplete: number;    // 76-99%
  completed: number;       // 100%
}

/**
 * Assessment overview stats
 */
export interface AssessmentOverview {
  totalAttempts: number;
  passRate: number;              // 0-100
  averageScore: number;          // 0-100
  averageAttempts: number;
  lessonsWithAssessments: number;
}

/**
 * Lesson-level analytics
 */
export interface LessonAnalytics {
  // Lesson identification
  conceptId: string;
  lessonName: string;
  moduleName: string;
  layerId: string;
  
  // View stats
  totalViews: number;
  uniqueViewers: number;
  
  // Completion stats
  completionCount: number;
  completionRate: number;        // 0-100
  averageTimeToComplete: number; // minutes
  
  // Assessment stats (if applicable)
  hasAssessment: boolean;
  assessmentStats?: LessonAssessmentStats;
  
  // Drop-off stats
  dropOffRate: number;           // Students who viewed but didn't complete
  
  // Time stats
  averageTimeSpent: number;      // minutes
  
  // Difficulty indicator (based on completion rate and assessment scores)
  difficultyScore: number;       // 0-100 (higher = harder)
  
  generatedAt: number;
}

/**
 * Assessment stats for a specific lesson
 */
export interface LessonAssessmentStats {
  totalAttempts: number;
  uniqueStudents: number;
  passRate: number;              // 0-100
  averageScore: number;          // 0-100
  highestScore: number;
  lowestScore: number;
  averageAttempts: number;
  firstAttemptPassRate: number;  // 0-100
}

/**
 * Student-level analytics (for a specific course)
 */
export interface StudentAnalytics {
  // Student identification
  studentId: string;
  enrollmentId: string;
  
  // Enrollment info
  enrolledAt: number;
  status: string;
  
  // Progress
  overallProgress: number;       // 0-100
  currentModule?: string;
  currentLesson?: string;
  
  // Completion stats
  completedModules: number;
  totalModules: number;
  completedLessons: number;
  totalLessons: number;
  
  // Time stats
  totalTimeSpent: number;        // minutes
  averageSessionDuration: number; // minutes
  lastAccessedAt?: number;
  daysSinceLastAccess: number;
  
  // Assessment stats
  assessmentsCompleted: number;
  assessmentsPassed: number;
  assessmentsFailed: number;
  averageAssessmentScore: number; // 0-100
  
  // Engagement score (composite)
  engagementScore: number;       // 0-100
  
  // Prediction
  predictedCompletionDate?: number;
  atRiskOfDropping: boolean;
  
  generatedAt: number;
}

/**
 * Language usage analytics
 */
export interface LanguageAnalytics {
  // Course identification
  mentorId: string;
  graphId: string;
  
  // Primary language
  primaryLanguage: string;
  
  // Language usage
  languageUsage: LanguageUsageStats[];
  
  // Translation stats
  translationStats: TranslationStats;
  
  // Bilingual mode stats
  bilingualModeUsage: number;    // percentage of students using bilingual mode
  
  generatedAt: number;
}

/**
 * Usage stats per language
 */
export interface LanguageUsageStats {
  language: string;
  languageName: string;
  studentCount: number;
  percentage: number;            // 0-100
  averageProgress: number;       // 0-100
  averageAssessmentScore: number; // 0-100
}

/**
 * Translation statistics
 */
export interface TranslationStats {
  totalTranslations: number;
  translatedLessons: number;
  totalLessons: number;
  coveragePercentage: number;    // 0-100
  languagesCovered: string[];
  staleTranslations: number;
}

/**
 * Analytics query options
 */
export interface AnalyticsQueryOptions {
  periodStart?: number;
  periodEnd?: number;
  includeInactive?: boolean;
}

/**
 * Helper to create empty progress distribution
 */
export function createEmptyProgressDistribution(): ProgressDistribution {
  return {
    notStarted: 0,
    justStarted: 0,
    inProgress: 0,
    almostDone: 0,
    nearComplete: 0,
    completed: 0,
  };
}

/**
 * Categorize progress percentage into distribution bucket
 */
export function categorizeProgress(progress: number): keyof ProgressDistribution {
  if (progress === 0) return 'notStarted';
  if (progress <= 25) return 'justStarted';
  if (progress <= 50) return 'inProgress';
  if (progress <= 75) return 'almostDone';
  if (progress < 100) return 'nearComplete';
  return 'completed';
}
