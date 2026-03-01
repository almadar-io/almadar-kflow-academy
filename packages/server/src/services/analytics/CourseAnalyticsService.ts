/**
 * Course Analytics Service
 * 
 * Provides analytics and reporting for courses, lessons, students, and language usage.
 */

import { getFirestore } from '../../config/firebaseAdmin';
import type { KnowledgeGraphAccessLayer } from '../knowledgeGraphAccess/KnowledgeGraphAccessLayer';
import type { EnrollmentService } from '../enrollment/EnrollmentService';
import type { CourseEnrollment } from '../../types/enrollment';
import {
  type CourseAnalytics,
  type LessonAnalytics,
  type StudentAnalytics,
  type LanguageAnalytics,
  type ProgressDistribution,
  type AssessmentOverview,
  type LessonAssessmentStats,
  type LanguageUsageStats,
  type TranslationStats,
  type AnalyticsQueryOptions,
  createEmptyProgressDistribution,
  categorizeProgress,
} from '../../types/analytics';

export class CourseAnalyticsService {
  constructor(
    private accessLayer: KnowledgeGraphAccessLayer,
    private enrollmentService: EnrollmentService
  ) {}

  /**
   * Get comprehensive course analytics
   */
  async getCourseAnalytics(
    mentorId: string,
    graphId: string,
    options?: AnalyticsQueryOptions
  ): Promise<CourseAnalytics> {
    const now = Date.now();

    // Get course info
    const courseSettings = await this.accessLayer.getCourseSettings(mentorId, graphId);
    const seedData = await this.accessLayer.getSeedConceptForPublishing(mentorId, graphId);
    
    if (!seedData) {
      throw new Error('Course not found');
    }

    // Get enrollment documents for detailed analysis
    const enrollments = await this.getAllCourseEnrollments(mentorId, graphId);

    // Calculate enrollment stats
    const totalEnrollments = enrollments.length;
    const activeEnrollments = enrollments.filter(e => e.status === 'active').length;
    const completedEnrollments = enrollments.filter(e => e.status === 'completed').length;
    const droppedEnrollments = enrollments.filter(e => e.status === 'dropped').length;

    // Calculate progress stats
    const progressValues = enrollments.map(e => e.progress.overallProgress);
    const averageProgress = this.calculateAverage(progressValues);
    const medianProgress = this.calculateMedian(progressValues);
    const progressDistribution = this.calculateProgressDistribution(progressValues);

    // Calculate completion stats
    const completionRate = totalEnrollments > 0 
      ? (completedEnrollments / totalEnrollments) * 100 
      : 0;
    
    const completedEnrollmentData = enrollments.filter(e => e.status === 'completed');
    const completionTimes = completedEnrollmentData.map(e => {
      const completionTime = (e.updatedAt - e.enrolledAt) / (1000 * 60 * 60 * 24); // days
      return completionTime;
    });
    const averageCompletionTime = this.calculateAverage(completionTimes);

    // Calculate engagement stats
    const timeSpentValues = enrollments.map(e => e.progress.totalTimeSpent);
    const averageTimeSpent = this.calculateAverage(timeSpentValues);
    const totalTimeSpent = timeSpentValues.reduce((sum, t) => sum + t, 0);
    
    const lastActivities = enrollments
      .map(e => e.progress.lastAccessedAt)
      .filter(t => t > 0);
    const lastActivityAt = lastActivities.length > 0 
      ? Math.max(...lastActivities) 
      : undefined;

    // Calculate assessment stats
    const assessmentStats = this.calculateAssessmentOverview(enrollments);

    // Get content stats
    const publishedModules = await this.accessLayer.getPublishedModules(mentorId, graphId);
    const allLessons = await this.accessLayer.getAllPublishedLessons(mentorId, graphId);

    return {
      mentorId,
      graphId,
      courseName: courseSettings?.title || seedData.name,
      totalEnrollments,
      activeEnrollments,
      completedEnrollments,
      droppedEnrollments,
      averageProgress: Math.round(averageProgress),
      medianProgress: Math.round(medianProgress),
      progressDistribution,
      completionRate: Math.round(completionRate),
      averageCompletionTime: Math.round(averageCompletionTime * 10) / 10,
      averageTimeSpent: Math.round(averageTimeSpent),
      totalTimeSpent: Math.round(totalTimeSpent),
      lastActivityAt,
      assessmentStats,
      totalModules: seedData.modules.length,
      totalLessons: seedData.modules.reduce((sum, m) => sum + m.conceptCount, 0),
      publishedModules: publishedModules.length,
      publishedLessons: allLessons.length,
      periodStart: options?.periodStart,
      periodEnd: options?.periodEnd,
      generatedAt: now,
    };
  }

  /**
   * Get analytics for a specific lesson
   */
  async getLessonAnalytics(
    mentorId: string,
    graphId: string,
    conceptId: string,
    options?: AnalyticsQueryOptions
  ): Promise<LessonAnalytics> {
    const now = Date.now();

    // Get lesson info
    const lessonSettings = await this.accessLayer.getLessonSettings(mentorId, graphId, conceptId);
    
    // Get the concept node to find its layer
    const node = await this.accessLayer.getNode(mentorId, graphId, conceptId);
    if (!node) {
      throw new Error('Lesson not found');
    }

    const layerNumber = node.properties?.layer ?? 0;
    
    // Find the layer
    const seedData = await this.accessLayer.getSeedConceptForPublishing(mentorId, graphId);
    const module = seedData?.modules.find(m => m.layerNumber === layerNumber);

    // Get all enrollments for this course
    const enrollments = await this.getAllCourseEnrollments(mentorId, graphId);

    // Calculate view/completion stats
    const studentsWhoViewed = enrollments.filter(e => {
      // Student viewed if they've progressed past this lesson or it's their current lesson
      return e.progress.completedConcepts.includes(conceptId) ||
             e.progress.currentConceptId === conceptId;
    });

    const studentsWhoCompleted = enrollments.filter(e => 
      e.progress.completedConcepts.includes(conceptId)
    );

    const totalViews = studentsWhoViewed.length;
    const uniqueViewers = studentsWhoViewed.length;
    const completionCount = studentsWhoCompleted.length;
    const completionRate = totalViews > 0 ? (completionCount / totalViews) * 100 : 0;
    const dropOffRate = totalViews > 0 ? ((totalViews - completionCount) / totalViews) * 100 : 0;

    // Calculate assessment stats if applicable
    let assessmentStats: LessonAssessmentStats | undefined;
    const hasAssessment = lessonSettings?.hasAssessment ?? false;

    if (hasAssessment) {
      const assessmentResults = enrollments
        .map(e => e.progress.assessmentResults[conceptId])
        .filter(r => r !== undefined);

      if (assessmentResults.length > 0) {
        const scores = assessmentResults.map(r => r.percentage);
        const attempts = assessmentResults.map(r => r.attempts);
        const passed = assessmentResults.filter(r => r.passed).length;

        assessmentStats = {
          totalAttempts: attempts.reduce((sum, a) => sum + a, 0),
          uniqueStudents: assessmentResults.length,
          passRate: (passed / assessmentResults.length) * 100,
          averageScore: this.calculateAverage(scores),
          highestScore: Math.max(...scores),
          lowestScore: Math.min(...scores),
          averageAttempts: this.calculateAverage(attempts),
          firstAttemptPassRate: 0, // Would need more data to calculate
        };
      }
    }

    // Calculate difficulty score based on completion rate and assessment scores
    let difficultyScore = 100 - completionRate; // Lower completion = higher difficulty
    if (assessmentStats) {
      // Factor in assessment difficulty
      const assessmentDifficulty = 100 - assessmentStats.passRate;
      difficultyScore = (difficultyScore + assessmentDifficulty) / 2;
    }

    return {
      conceptId,
      lessonName: lessonSettings?.title || node.properties?.name || conceptId,
      moduleName: module?.name || `Layer ${layerNumber}`,
      layerId: module?.id || '',
      totalViews,
      uniqueViewers,
      completionCount,
      completionRate: Math.round(completionRate),
      averageTimeToComplete: 0, // Would need time tracking per lesson
      hasAssessment,
      assessmentStats,
      dropOffRate: Math.round(dropOffRate),
      averageTimeSpent: 0, // Would need time tracking per lesson
      difficultyScore: Math.round(difficultyScore),
      generatedAt: now,
    };
  }

  /**
   * Get analytics for a specific student in a course
   */
  async getStudentAnalytics(
    mentorId: string,
    graphId: string,
    studentId: string
  ): Promise<StudentAnalytics> {
    const now = Date.now();

    // Find the student's enrollment
    const enrollment = await this.enrollmentService.findEnrollment(studentId, mentorId, graphId);
    if (!enrollment) {
      throw new Error('Student not enrolled in this course');
    }

    // Get course structure
    const publishedModules = await this.accessLayer.getPublishedModules(mentorId, graphId);
    const allLessons = await this.accessLayer.getAllPublishedLessons(mentorId, graphId);

    const totalModules = publishedModules.length;
    const totalLessons = allLessons.length;
    const completedLessons = enrollment.progress.completedConcepts.length;
    const completedModules = enrollment.progress.completedLayers.length;

    // Calculate assessment stats
    const assessmentResults = Object.values(enrollment.progress.assessmentResults);
    const assessmentsCompleted = assessmentResults.length;
    const assessmentsPassed = assessmentResults.filter(r => r.passed).length;
    const assessmentsFailed = assessmentResults.filter(r => !r.passed && r.attempts > 0).length;
    const assessmentScores = assessmentResults.map(r => r.percentage);
    const averageAssessmentScore = this.calculateAverage(assessmentScores);

    // Calculate time stats
    const totalTimeSpent = enrollment.progress.totalTimeSpent;
    const daysSinceLastAccess = enrollment.progress.lastAccessedAt
      ? Math.floor((now - enrollment.progress.lastAccessedAt) / (1000 * 60 * 60 * 24))
      : 999;

    // Calculate engagement score (composite of multiple factors)
    const progressFactor = enrollment.progress.overallProgress;
    const recencyFactor = Math.max(0, 100 - daysSinceLastAccess * 5); // -5 points per day inactive
    const assessmentFactor = assessmentsCompleted > 0 ? averageAssessmentScore : 50;
    const engagementScore = Math.round((progressFactor + recencyFactor + assessmentFactor) / 3);

    // Predict completion (simple linear projection)
    let predictedCompletionDate: number | undefined;
    if (enrollment.progress.overallProgress > 0 && enrollment.progress.overallProgress < 100) {
      const daysSinceEnroll = (now - enrollment.enrolledAt) / (1000 * 60 * 60 * 24);
      const progressPerDay = enrollment.progress.overallProgress / daysSinceEnroll;
      if (progressPerDay > 0) {
        const daysRemaining = (100 - enrollment.progress.overallProgress) / progressPerDay;
        predictedCompletionDate = now + daysRemaining * 24 * 60 * 60 * 1000;
      }
    }

    // Determine if at risk
    const atRiskOfDropping = 
      (daysSinceLastAccess > 14 && enrollment.progress.overallProgress < 50) ||
      (daysSinceLastAccess > 30) ||
      (engagementScore < 30);

    return {
      studentId,
      enrollmentId: enrollment.id,
      enrolledAt: enrollment.enrolledAt,
      status: enrollment.status,
      overallProgress: enrollment.progress.overallProgress,
      currentModule: enrollment.progress.currentLayerId,
      currentLesson: enrollment.progress.currentConceptId,
      completedModules,
      totalModules,
      completedLessons,
      totalLessons,
      totalTimeSpent,
      averageSessionDuration: 0, // Would need session tracking
      lastAccessedAt: enrollment.progress.lastAccessedAt,
      daysSinceLastAccess,
      assessmentsCompleted,
      assessmentsPassed,
      assessmentsFailed,
      averageAssessmentScore: Math.round(averageAssessmentScore),
      engagementScore,
      predictedCompletionDate,
      atRiskOfDropping,
      generatedAt: now,
    };
  }

  /**
   * Get language usage analytics
   */
  async getLanguageAnalytics(
    mentorId: string,
    graphId: string
  ): Promise<LanguageAnalytics> {
    const now = Date.now();

    // Get course settings for primary language
    const courseSettings = await this.accessLayer.getCourseSettings(mentorId, graphId);
    const primaryLanguage = courseSettings?.defaultLanguage || 'en';

    // Get all enrollments
    const enrollments = await this.getAllCourseEnrollments(mentorId, graphId);

    // Count language usage
    const languageCounts = new Map<string, { count: number; progressSum: number; scoreSum: number; scoreCount: number }>();

    for (const enrollment of enrollments) {
      const lang = enrollment.settings.preferredLanguage || 'en';
      const existing = languageCounts.get(lang) || { count: 0, progressSum: 0, scoreSum: 0, scoreCount: 0 };
      
      existing.count++;
      existing.progressSum += enrollment.progress.overallProgress;
      
      // Add assessment scores
      const results = Object.values(enrollment.progress.assessmentResults);
      for (const result of results) {
        existing.scoreSum += result.percentage;
        existing.scoreCount++;
      }
      
      languageCounts.set(lang, existing);
    }

    // Build language usage stats
    const totalStudents = enrollments.length;
    const languageUsage: LanguageUsageStats[] = [];
    const languageNames: Record<string, string> = {
      en: 'English',
      es: 'Spanish',
      ar: 'Arabic',
      zh: 'Chinese',
      fr: 'French',
      de: 'German',
      pt: 'Portuguese',
      ja: 'Japanese',
      ko: 'Korean',
      hi: 'Hindi',
      ru: 'Russian',
    };

    for (const [lang, stats] of languageCounts) {
      languageUsage.push({
        language: lang,
        languageName: languageNames[lang] || lang,
        studentCount: stats.count,
        percentage: totalStudents > 0 ? Math.round((stats.count / totalStudents) * 100) : 0,
        averageProgress: stats.count > 0 ? Math.round(stats.progressSum / stats.count) : 0,
        averageAssessmentScore: stats.scoreCount > 0 ? Math.round(stats.scoreSum / stats.scoreCount) : 0,
      });
    }

    // Sort by student count
    languageUsage.sort((a, b) => b.studentCount - a.studentCount);

    // Calculate bilingual mode usage
    const bilingualUsers = enrollments.filter(e => e.settings.showBilingualMode).length;
    const bilingualModeUsage = totalStudents > 0 
      ? Math.round((bilingualUsers / totalStudents) * 100) 
      : 0;

    // Get translation stats (would need to query Translation nodes)
    const allLessons = await this.accessLayer.getAllPublishedLessons(mentorId, graphId);
    const translationStats: TranslationStats = {
      totalTranslations: 0, // Would need to query Translation nodes
      translatedLessons: 0,
      totalLessons: allLessons.length,
      coveragePercentage: 0,
      languagesCovered: [],
      staleTranslations: 0,
    };

    return {
      mentorId,
      graphId,
      primaryLanguage,
      languageUsage,
      translationStats,
      bilingualModeUsage,
      generatedAt: now,
    };
  }

  // ==================== Helper Methods ====================

  /**
   * Get all enrollments for a course
   */
  private async getAllCourseEnrollments(
    mentorId: string,
    graphId: string
  ): Promise<CourseEnrollment[]> {
    const snapshot = await getFirestore()
      .collectionGroup('courseEnrollments')
      .where('mentorId', '==', mentorId)
      .where('graphId', '==', graphId)
      .get();

    return snapshot.docs.map(doc => doc.data() as CourseEnrollment);
  }

  /**
   * Calculate average of an array of numbers
   */
  private calculateAverage(values: number[]): number {
    if (values.length === 0) return 0;
    return values.reduce((sum, v) => sum + v, 0) / values.length;
  }

  /**
   * Calculate median of an array of numbers
   */
  private calculateMedian(values: number[]): number {
    if (values.length === 0) return 0;
    
    const sorted = [...values].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    
    if (sorted.length % 2 === 0) {
      return (sorted[mid - 1] + sorted[mid]) / 2;
    }
    return sorted[mid];
  }

  /**
   * Calculate progress distribution
   */
  private calculateProgressDistribution(progressValues: number[]): ProgressDistribution {
    const distribution = createEmptyProgressDistribution();
    
    for (const progress of progressValues) {
      const bucket = categorizeProgress(progress);
      distribution[bucket]++;
    }
    
    return distribution;
  }

  /**
   * Calculate assessment overview stats
   */
  private calculateAssessmentOverview(enrollments: CourseEnrollment[]): AssessmentOverview {
    let totalAttempts = 0;
    let totalPassed = 0;
    let totalResults = 0;
    let scoreSum = 0;
    let attemptsSum = 0;
    const lessonsWithResults = new Set<string>();

    for (const enrollment of enrollments) {
      const results = Object.values(enrollment.progress.assessmentResults);
      
      for (const result of results) {
        totalResults++;
        totalAttempts += result.attempts;
        attemptsSum += result.attempts;
        scoreSum += result.percentage;
        lessonsWithResults.add(result.conceptId);
        
        if (result.passed) {
          totalPassed++;
        }
      }
    }

    return {
      totalAttempts,
      passRate: totalResults > 0 ? Math.round((totalPassed / totalResults) * 100) : 0,
      averageScore: totalResults > 0 ? Math.round(scoreSum / totalResults) : 0,
      averageAttempts: totalResults > 0 ? Math.round((attemptsSum / totalResults) * 10) / 10 : 0,
      lessonsWithAssessments: lessonsWithResults.size,
    };
  }
}
