/**
 * Enrollment Service
 * 
 * @deprecated This service is deprecated and will be removed in a future version.
 * Please use StudentManagementService instead for enrollment operations.
 * 
 * User-centric enrollment service that stores enrollments under user profiles.
 * Path: users/{studentId}/courseEnrollments/{enrollmentId}
 * 
 * This approach allows efficient querying of a student's enrollments without
 * needing expensive collectionGroup queries.
 * 
 * Migration path:
 * - Enrollment: Use StudentManagementService.enrollStudentInCourse() instead
 * - Progress tracking: Will be migrated to graph-based progress tracking
 */

import { randomUUID } from 'crypto';
import { getFirestore } from '../../config/firebaseAdmin';
import type { KnowledgeGraphAccessLayer } from '../knowledgeGraphAccess/KnowledgeGraphAccessLayer';
import {
  type CourseEnrollment,
  type StudentProgress,
  type StudentEnrollmentSettings,
  type EnrollOptions,
  type EnrollmentQueryOptions,
  type ProgressUpdate,
  type AssessmentAttempt,
  type EnrolledStudent,
  type CourseStudentsQueryOptions,
  type EnrollmentStatus,
  createDefaultProgress,
  createDefaultSettings,
} from '../../types/enrollment';

export class EnrollmentService {
  constructor(private accessLayer: KnowledgeGraphAccessLayer) {}

  /**
   * Enroll a student in a course
   * Creates enrollment document under users/{studentId}/courseEnrollments/
   */
  async enrollStudent(
    studentId: string,
    mentorId: string,
    graphId: string,
    options?: EnrollOptions
  ): Promise<CourseEnrollment> {
    // Check if already enrolled
    const existing = await this.findEnrollment(studentId, mentorId, graphId);
    if (existing) {
      // Reactivate if dropped/expired
      if (existing.status === 'dropped' || existing.status === 'expired') {
        return this.updateEnrollmentStatus(studentId, existing.id, 'active');
      }
      return existing;
    }

    // Verify course is published
    const isPublished = await this.accessLayer.isCoursePublished(mentorId, graphId);
    if (!isPublished) {
      throw new Error('Course is not published');
    }

    // Get course structure to set initial position
    const seedData = await this.accessLayer.getSeedConceptForPublishing(mentorId, graphId);
    if (!seedData) {
      throw new Error('Course structure not found');
    }

    // Find first published module and lesson
    const publishedModules = await this.accessLayer.getPublishedModules(mentorId, graphId);
    const firstModule = publishedModules[0];
    
    let firstLesson = null;
    if (firstModule) {
      const publishedLessons = await this.accessLayer.getPublishedLessons(
        mentorId,
        graphId,
        firstModule.layerId
      );
      firstLesson = publishedLessons[0];
    }

    const now = Date.now();
    const enrollmentId = randomUUID();

    const enrollment: CourseEnrollment = {
      id: enrollmentId,
      mentorId,
      graphId,
      enrolledAt: now,
      enrolledVia: options?.enrolledVia || 'direct',
      progress: {
        ...createDefaultProgress(),
        currentLayerId: firstModule?.layerId,
        currentConceptId: firstLesson?.conceptId,
        lastAccessedAt: now,
      },
      settings: createDefaultSettings({
        preferredLanguage: options?.preferredLanguage,
        notificationsEnabled: options?.notificationsEnabled,
      }),
      status: 'active',
      createdAt: now,
      updatedAt: now,
    };

    // Save to Firestore under user profile
    await getFirestore()
      .collection('users')
      .doc(studentId)
      .collection('courseEnrollments')
      .doc(enrollmentId)
      .set(enrollment);

    return enrollment;
  }

  /**
   * Unenroll a student from a course
   */
  async unenrollStudent(studentId: string, enrollmentId: string): Promise<void> {
    await getFirestore()
      .collection('users')
      .doc(studentId)
      .collection('courseEnrollments')
      .doc(enrollmentId)
      .delete();
  }

  /**
   * Get student's enrollments
   */
  async getStudentEnrollments(
    studentId: string,
    options?: EnrollmentQueryOptions
  ): Promise<CourseEnrollment[]> {
    let query = getFirestore()
      .collection('users')
      .doc(studentId)
      .collection('courseEnrollments')
      .orderBy(options?.orderBy || 'enrolledAt', options?.orderDirection || 'desc');

    // Apply status filter
    if (options?.status) {
      const statuses = Array.isArray(options.status) ? options.status : [options.status];
      query = query.where('status', 'in', statuses) as typeof query;
    }

    // Apply pagination
    if (options?.limit) {
      query = query.limit(options.limit);
    }

    const snapshot = await query.get();

    return snapshot.docs.map(doc => doc.data() as CourseEnrollment);
  }

  /**
   * Get a specific enrollment
   */
  async getEnrollment(
    studentId: string,
    enrollmentId: string
  ): Promise<CourseEnrollment | null> {
    const doc = await getFirestore()
      .collection('users')
      .doc(studentId)
      .collection('courseEnrollments')
      .doc(enrollmentId)
      .get();

    if (!doc.exists) {
      return null;
    }

    return doc.data() as CourseEnrollment;
  }

  /**
   * Find enrollment by mentor and graph
   */
  async findEnrollment(
    studentId: string,
    mentorId: string,
    graphId: string
  ): Promise<CourseEnrollment | null> {
    const snapshot = await getFirestore()
      .collection('users')
      .doc(studentId)
      .collection('courseEnrollments')
      .where('mentorId', '==', mentorId)
      .where('graphId', '==', graphId)
      .limit(1)
      .get();

    if (snapshot.empty) {
      return null;
    }

    return snapshot.docs[0].data() as CourseEnrollment;
  }

  /**
   * Update student progress
   */
  async updateProgress(
    studentId: string,
    enrollmentId: string,
    update: ProgressUpdate
  ): Promise<CourseEnrollment> {
    const enrollment = await this.getEnrollment(studentId, enrollmentId);
    if (!enrollment) {
      throw new Error('Enrollment not found');
    }

    const progress = { ...enrollment.progress };
    const now = Date.now();

    // Update current position
    if (update.currentLayerId !== undefined) {
      progress.currentLayerId = update.currentLayerId;
    }
    if (update.currentConceptId !== undefined) {
      progress.currentConceptId = update.currentConceptId;
    }

    // Add completed concept
    if (update.completedConceptId && !progress.completedConcepts.includes(update.completedConceptId)) {
      progress.completedConcepts.push(update.completedConceptId);
    }

    // Add completed layer
    if (update.completedLayerId && !progress.completedLayers.includes(update.completedLayerId)) {
      progress.completedLayers.push(update.completedLayerId);
    }

    // Update time spent
    if (update.timeSpent) {
      progress.totalTimeSpent += update.timeSpent;
    }

    progress.lastAccessedAt = now;

    // Calculate overall progress
    progress.overallProgress = await this.calculateOverallProgress(
      enrollment.mentorId,
      enrollment.graphId,
      progress
    );

    // Check if completed
    let status = enrollment.status;
    if (progress.overallProgress >= 100) {
      status = 'completed';
    }

    // Update in Firestore
    await getFirestore()
      .collection('users')
      .doc(studentId)
      .collection('courseEnrollments')
      .doc(enrollmentId)
      .update({
        progress,
        status,
        updatedAt: now,
      });

    return {
      ...enrollment,
      progress,
      status,
      updatedAt: now,
    };
  }

  /**
   * Record an assessment attempt
   */
  async recordAssessmentAttempt(
    studentId: string,
    enrollmentId: string,
    attempt: AssessmentAttempt
  ): Promise<CourseEnrollment> {
    const enrollment = await this.getEnrollment(studentId, enrollmentId);
    if (!enrollment) {
      throw new Error('Enrollment not found');
    }

    const progress = { ...enrollment.progress };
    const now = Date.now();
    const percentage = (attempt.score / attempt.maxScore) * 100;

    // Get existing result or create new
    const existingResult = progress.assessmentResults[attempt.conceptId];
    const attempts = (existingResult?.attempts || 0) + 1;
    const bestScore = existingResult?.bestScore
      ? Math.max(existingResult.bestScore, attempt.score)
      : attempt.score;

    // Get passing score from lesson settings
    const lessonSettings = await this.accessLayer.getLessonSettings(
      enrollment.mentorId,
      enrollment.graphId,
      attempt.conceptId
    );
    const passingScore = lessonSettings?.passingScore ?? 70;
    const passed = percentage >= passingScore;

    progress.assessmentResults[attempt.conceptId] = {
      assessmentId: attempt.assessmentId,
      conceptId: attempt.conceptId,
      score: attempt.score,
      maxScore: attempt.maxScore,
      percentage,
      passed,
      attempts,
      lastAttemptAt: now,
      bestScore,
      answers: attempt.answers,
    };

    progress.lastAccessedAt = now;

    // Update in Firestore
    await getFirestore()
      .collection('users')
      .doc(studentId)
      .collection('courseEnrollments')
      .doc(enrollmentId)
      .update({
        progress,
        updatedAt: now,
      });

    return {
      ...enrollment,
      progress,
      updatedAt: now,
    };
  }

  /**
   * Get all students enrolled in a course (for mentors)
   */
  async getCourseStudents(
    mentorId: string,
    graphId: string,
    options?: CourseStudentsQueryOptions
  ): Promise<EnrolledStudent[]> {
    // Use collectionGroup query to find all enrollments for this course
    // This is acceptable as it's mentor-initiated and infrequent
    let query = getFirestore()
      .collectionGroup('courseEnrollments')
      .where('mentorId', '==', mentorId)
      .where('graphId', '==', graphId);

    // Apply status filter
    if (options?.status) {
      const statuses = Array.isArray(options.status) ? options.status : [options.status];
      query = query.where('status', 'in', statuses);
    }

    const snapshot = await query.get();

    // Get total lessons for progress calculation
    const allLessons = await this.accessLayer.getAllPublishedLessons(mentorId, graphId);
    const totalLessons = allLessons.length;

    const students: EnrolledStudent[] = [];

    for (const doc of snapshot.docs) {
      const enrollment = doc.data() as CourseEnrollment;
      const studentId = doc.ref.parent.parent?.id;

      if (!studentId) continue;

      // Calculate assessment summary
      const assessmentResults = Object.values(enrollment.progress.assessmentResults || {});
      const passed = assessmentResults.filter(r => r.passed).length;
      const failed = assessmentResults.filter(r => !r.passed && r.attempts > 0).length;
      const totalScores = assessmentResults.reduce((sum, r) => sum + r.percentage, 0);
      const avgScore = assessmentResults.length > 0 ? totalScores / assessmentResults.length : undefined;

      students.push({
        enrollmentId: enrollment.id,
        studentId,
        enrolledAt: enrollment.enrolledAt,
        status: enrollment.status,
        overallProgress: enrollment.progress.overallProgress,
        completedLessons: enrollment.progress.completedConcepts.length,
        totalLessons,
        lastAccessedAt: enrollment.progress.lastAccessedAt,
        assessmentsPassed: passed,
        assessmentsFailed: failed,
        averageScore: avgScore,
      });
    }

    // Sort results
    if (options?.orderBy) {
      const direction = options.orderDirection === 'asc' ? 1 : -1;
      students.sort((a, b) => {
        const aVal = a[options.orderBy as keyof EnrolledStudent] as number;
        const bVal = b[options.orderBy as keyof EnrolledStudent] as number;
        return (aVal - bVal) * direction;
      });
    }

    // Apply pagination
    if (options?.offset || options?.limit) {
      const start = options.offset || 0;
      const end = options.limit ? start + options.limit : undefined;
      return students.slice(start, end);
    }

    return students;
  }

  /**
   * Update enrollment status
   */
  async updateEnrollmentStatus(
    studentId: string,
    enrollmentId: string,
    status: EnrollmentStatus
  ): Promise<CourseEnrollment> {
    const now = Date.now();

    await getFirestore()
      .collection('users')
      .doc(studentId)
      .collection('courseEnrollments')
      .doc(enrollmentId)
      .update({
        status,
        updatedAt: now,
      });

    const enrollment = await this.getEnrollment(studentId, enrollmentId);
    if (!enrollment) {
      throw new Error('Enrollment not found after update');
    }

    return enrollment;
  }

  /**
   * Update enrollment settings
   */
  async updateEnrollmentSettings(
    studentId: string,
    enrollmentId: string,
    settings: Partial<StudentEnrollmentSettings>
  ): Promise<CourseEnrollment> {
    const enrollment = await this.getEnrollment(studentId, enrollmentId);
    if (!enrollment) {
      throw new Error('Enrollment not found');
    }

    const now = Date.now();
    const updatedSettings = {
      ...enrollment.settings,
      ...settings,
    };

    await getFirestore()
      .collection('users')
      .doc(studentId)
      .collection('courseEnrollments')
      .doc(enrollmentId)
      .update({
        settings: updatedSettings,
        updatedAt: now,
      });

    return {
      ...enrollment,
      settings: updatedSettings,
      updatedAt: now,
    };
  }

  /**
   * Get enrollment count for a course
   */
  async getCourseEnrollmentCount(
    mentorId: string,
    graphId: string,
    status?: EnrollmentStatus | EnrollmentStatus[]
  ): Promise<number> {
    let query = getFirestore()
      .collectionGroup('courseEnrollments')
      .where('mentorId', '==', mentorId)
      .where('graphId', '==', graphId);

    if (status) {
      const statuses = Array.isArray(status) ? status : [status];
      query = query.where('status', 'in', statuses);
    }

    const snapshot = await query.count().get();
    return snapshot.data().count;
  }

  /**
   * Calculate overall progress percentage
   */
  private async calculateOverallProgress(
    mentorId: string,
    graphId: string,
    progress: StudentProgress
  ): Promise<number> {
    try {
      const allLessons = await this.accessLayer.getAllPublishedLessons(mentorId, graphId);
      if (allLessons.length === 0) {
        return 0;
      }

      const completedCount = progress.completedConcepts.length;
      return Math.round((completedCount / allLessons.length) * 100);
    } catch {
      return progress.overallProgress;
    }
  }
}
