import { getFirestore } from '../config/firebaseAdmin';
import type { Enrollment, AssessmentStatus, PublishedCourse } from '../types/publishing';

/**
 * @deprecated Old Firestore-based enrollment service.
 * TODO: Migrate to graph-based enrollment when ready.
 * 
 * Note: This service previously depended on courseService, moduleService, and lessonService
 * which have been removed as part of the graph-based publishing migration.
 * 
 * Functions that depended on those services will throw errors indicating migration is needed.
 */

/**
 * Enroll a student in a course
 * @deprecated This function requires migration to graph-based publishing.
 */
export async function enrollStudent(
  courseId: string,
  studentId: string
): Promise<Enrollment> {
  throw new Error(
    'enrollStudent requires migration to graph-based publishing. ' +
    'Old Firestore course/module/lesson services have been removed.'
  );
}

export async function unenrollStudent(
  courseId: string,
  enrollmentId: string
): Promise<void> {
  await getFirestore()
    .collection('courses').doc(courseId)
    .collection('enrollments').doc(enrollmentId)
    .delete();
}

/**
 * Get enrollment details
 */
/**
 * Get enrollment by ID using collectionGroup query (efficient lookup)
 * Uses studentId to query (indexed) and filters by enrollmentId in memory
 * This is more efficient than fetching all enrollments across all students
 */
export async function getEnrollmentById(
  studentId: string,
  enrollmentId: string
): Promise<Enrollment | null> {
  try {
    const db = getFirestore();
    
    // Query enrollments by studentId (indexed query)
    const snapshot = await db
      .collectionGroup('enrollments')
      .where('studentId', '==', studentId)
      .orderBy('enrolledAt', 'desc')
      .get();
    
    // Filter by enrollmentId in memory (typically only a few enrollments per student)
    const enrollmentDoc = snapshot.docs.find(doc => doc.id === enrollmentId);
    
    if (!enrollmentDoc) {
      return null;
    }
    
    const data = enrollmentDoc.data() as any;
    
    return {
      id: enrollmentDoc.id,
      studentId: data.studentId,
      courseId: data.courseId,
      enrolledAt: data.enrolledAt,
      currentModuleId: data.currentModuleId || '',
      currentLessonId: data.currentLessonId || '',
      completedModuleIds: data.completedModuleIds || [],
      completedLessonIds: data.completedLessonIds || [],
      startedAt: data.startedAt || data.enrolledAt,
      lastAccessedAt: data.lastAccessedAt || data.enrolledAt,
      accessibleModuleIds: data.accessibleModuleIds || [],
      accessibleLessonIds: data.accessibleLessonIds || [],
      lockedModuleIds: data.lockedModuleIds || [],
      lockedLessonIds: data.lockedLessonIds || [],
      assessmentStatus: data.assessmentStatus 
        ? new Map<string, AssessmentStatus>(Object.entries(data.assessmentStatus))
        : new Map<string, AssessmentStatus>(),
      canSkipAhead: data.canSkipAhead || false,
      notificationEnabled: data.notificationEnabled !== false,
      nextNotificationAt: data.nextNotificationAt,
    } as Enrollment;
  } catch (error: any) {
    console.error('Error getting enrollment by ID:', error);
    throw error;
  }
}

export async function getEnrollment(
  courseId: string,
  enrollmentId: string
): Promise<Enrollment | null> {
  const enrollmentDoc = await getFirestore()
    .collection('courses').doc(courseId)
    .collection('enrollments').doc(enrollmentId)
    .get();
  
  if (!enrollmentDoc.exists) {
    return null;
  }

  const data = enrollmentDoc.data() as any;
  
  // Convert assessmentStatus object back to Map
  const enrollment: Enrollment = {
    id: enrollmentDoc.id,
    ...data,
    assessmentStatus: data.assessmentStatus 
      ? new Map<string, AssessmentStatus>(Object.entries(data.assessmentStatus))
      : new Map<string, AssessmentStatus>(),
  };

  return enrollment;
}

/**
 * Get all course enrollments for a student
 * Uses collectionGroup query (acceptable per design - only one collectionGroup needed)
 */
export async function getStudentEnrollments(
  studentId: string
): Promise<Enrollment[]> {
  try {
    // Try indexed query first
    const snapshot = await getFirestore()
      .collectionGroup('enrollments')
      .where('studentId', '==', studentId)
      .orderBy('enrolledAt', 'desc')
      .get();

    return snapshot.docs.map(doc => {
      const data = doc.data() as any;
      const enrollment: Enrollment = {
        id: doc.id,
        studentId: data.studentId,
        courseId: data.courseId,
        enrolledAt: data.enrolledAt,
        currentModuleId: data.currentModuleId || '',
        currentLessonId: data.currentLessonId || '',
        completedModuleIds: data.completedModuleIds || [],
        completedLessonIds: data.completedLessonIds || [],
        startedAt: data.startedAt || data.enrolledAt,
        lastAccessedAt: data.lastAccessedAt || data.enrolledAt,
        accessibleModuleIds: data.accessibleModuleIds || [],
        accessibleLessonIds: data.accessibleLessonIds || [],
        lockedModuleIds: data.lockedModuleIds || [],
        lockedLessonIds: data.lockedLessonIds || [],
        assessmentStatus: data.assessmentStatus 
          ? new Map<string, AssessmentStatus>(Object.entries(data.assessmentStatus))
          : new Map<string, AssessmentStatus>(),
        canSkipAhead: data.canSkipAhead || false,
        notificationEnabled: data.notificationEnabled !== false,
        nextNotificationAt: data.nextNotificationAt,
      };
      return enrollment;
    });
  } catch (error: any) {
    // Fallback: Query all enrollments and filter in memory if index is missing
    if (error.code === 9 || error.message?.includes('FAILED_PRECONDITION') || error.message?.includes('index')) {
      console.warn('Index not found for enrollments query, falling back to alternative query');
      
      // Query all enrollments without filter
      const snapshot = await getFirestore()
        .collectionGroup('enrollments')
        .get();

      // Filter in memory
      return snapshot.docs
        .filter(doc => {
          const data = doc.data();
          return data.studentId === studentId;
        })
        .map(doc => {
          const data = doc.data() as any;
          const enrollment: Enrollment = {
            id: doc.id,
            studentId: data.studentId,
            courseId: data.courseId,
            enrolledAt: data.enrolledAt,
            currentModuleId: data.currentModuleId || '',
            currentLessonId: data.currentLessonId || '',
            completedModuleIds: data.completedModuleIds || [],
            completedLessonIds: data.completedLessonIds || [],
            startedAt: data.startedAt || data.enrolledAt,
            lastAccessedAt: data.lastAccessedAt || data.enrolledAt,
            accessibleModuleIds: data.accessibleModuleIds || [],
            accessibleLessonIds: data.accessibleLessonIds || [],
            lockedModuleIds: data.lockedModuleIds || [],
            lockedLessonIds: data.lockedLessonIds || [],
            assessmentStatus: data.assessmentStatus 
              ? new Map<string, AssessmentStatus>(Object.entries(data.assessmentStatus))
              : new Map<string, AssessmentStatus>(),
            canSkipAhead: data.canSkipAhead || false,
            notificationEnabled: data.notificationEnabled !== false,
            nextNotificationAt: data.nextNotificationAt,
          };
          return enrollment;
        });
    }
    // Re-throw if it's not an index error
    throw error;
  }
}

/**
 * Get all enrolled courses with their details in bulk
 * Returns enrollments with full course information
 */
export async function getEnrolledCoursesWithDetails(
  studentId: string
): Promise<Array<{
  enrollment: Enrollment;
  course: PublishedCourse;
  progress: {
    totalLessons: number;
    completedLessons: number;
    progressPercentage: number;
  };
}>> {
  // Get all enrollments
  const enrollments = await getStudentEnrollments(studentId);
  const db = getFirestore();

  // Fetch courses in parallel from Firestore directly
  const coursePromises = enrollments.map(async (enrollment) => {
    try {
      // Get course directly from courses collection
      const courseDoc = await db.collection('courses').doc(enrollment.courseId).get();
      
      if (!courseDoc.exists) {
        console.warn(`Course ${enrollment.courseId} not found`);
        return null;
      }
      
      const course = courseDoc.data() as PublishedCourse;
      course.id = courseDoc.id;
      
      if (course.status !== 'published') {
        console.warn(`Course ${enrollment.courseId} not published`);
        return null;
      }
      
      const totalLessons = enrollment.accessibleLessonIds?.length || 0;
      const completedLessons = enrollment.completedLessonIds?.length || 0;
      const progressPercentage = totalLessons > 0 
        ? Math.round((completedLessons / totalLessons) * 100) 
        : 0;

      return {
        enrollment,
        course,
        progress: {
          totalLessons,
          completedLessons,
          progressPercentage,
        },
      };
    } catch (error) {
      console.error(`Failed to load course ${enrollment.courseId}:`, error);
      return null;
    }
  });

  const results = await Promise.all(coursePromises);
  return results.filter((r): r is NonNullable<typeof r> => r !== null);
}

/**
 * Get student's enrollment in a specific course
 */
export async function getCourseEnrollment(
  courseId: string,
  studentId: string
): Promise<Enrollment | null> {
  const snapshot = await getFirestore()
    .collection('courses').doc(courseId)
    .collection('enrollments')
    .where('studentId', '==', studentId)
    .limit(1)
    .get();

  if (snapshot.empty) {
    return null;
  }

  const data = snapshot.docs[0].data() as any;
  return {
    id: snapshot.docs[0].id,
    ...data,
    assessmentStatus: data.assessmentStatus 
      ? new Map<string, AssessmentStatus>(Object.entries(data.assessmentStatus))
      : new Map<string, AssessmentStatus>(),
  } as Enrollment;
}

/**
 * Update student progress within course
 */
export async function updateProgress(
  courseId: string,
  enrollmentId: string,
  lessonId: string
): Promise<Enrollment> {
  const enrollment = await getEnrollment(courseId, enrollmentId);
  if (!enrollment) {
    throw new Error('Enrollment not found');
  }

  // Add lesson to completed if not already
  if (!enrollment.completedLessonIds.includes(lessonId)) {
    enrollment.completedLessonIds.push(lessonId);
  }

  // Update current lesson to next available lesson
  // This is simplified - in a real implementation, you'd find the next lesson
  enrollment.currentLessonId = lessonId;

  await getFirestore()
    .collection('courses').doc(courseId)
    .collection('enrollments').doc(enrollmentId)
    .update({
      completedLessonIds: enrollment.completedLessonIds,
      currentLessonId: enrollment.currentLessonId,
    });

  return enrollment;
}

/**
 * Update enrollments for a course when modules/lessons are published
 * @deprecated This function requires migration to graph-based publishing.
 */
export async function updateEnrollmentsForCourse(
  mentorId: string,
  courseId: string
): Promise<void> {
  console.warn(
    'updateEnrollmentsForCourse is deprecated. ' +
    'Old Firestore course/module/lesson services have been removed.'
  );
  // No-op - this function is deprecated
}
