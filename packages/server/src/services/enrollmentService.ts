import { getFirestore } from "../config/firebaseAdmin";
import { hybridCache, CACHE_TTL } from "./cacheService";
import { CACHE_KEYS, invalidateEnrollments } from "./cacheInvalidation";
import type { Enrollment, AssessmentStatus, PublishedCourse } from "../types/publishing";

export async function enrollStudent(courseId: string, studentId: string): Promise<Enrollment> {
  throw new Error(
    "enrollStudent requires migration to graph-based publishing. " +
      "Old Firestore course/module/lesson services have been removed."
  );
}

export async function unenrollStudent(courseId: string, enrollmentId: string): Promise<void> {
  await getFirestore()
    .collection("courses")
    .doc(courseId)
    .collection("enrollments")
    .doc(enrollmentId)
    .delete();
  await invalidateEnrollments(enrollmentId);
}

export async function getEnrollmentById(
  studentId: string,
  enrollmentId: string
): Promise<Enrollment | null> {
  try {
    const db = getFirestore();

    const snapshot = await db
      .collectionGroup("enrollments")
      .where("studentId", "==", studentId)
      .orderBy("enrolledAt", "desc")
      .get();

    const enrollmentDoc = snapshot.docs.find((doc) => doc.id === enrollmentId);

    if (!enrollmentDoc) {
      return null;
    }

    const data = enrollmentDoc.data() as any;

    return {
      id: enrollmentDoc.id,
      studentId: data.studentId,
      courseId: data.courseId,
      enrolledAt: data.enrolledAt,
      currentModuleId: data.currentModuleId || "",
      currentLessonId: data.currentLessonId || "",
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
    console.error("Error getting enrollment by ID:", error);
    throw error;
  }
}

export async function getEnrollment(courseId: string, enrollmentId: string): Promise<Enrollment | null> {
  const enrollmentDoc = await getFirestore()
    .collection("courses")
    .doc(courseId)
    .collection("enrollments")
    .doc(enrollmentId)
    .get();

  if (!enrollmentDoc.exists) {
    return null;
  }

  const data = enrollmentDoc.data() as any;

  const enrollment: Enrollment = {
    id: enrollmentDoc.id,
    ...data,
    assessmentStatus: data.assessmentStatus
      ? new Map<string, AssessmentStatus>(Object.entries(data.assessmentStatus))
      : new Map<string, AssessmentStatus>(),
  };

  return enrollment;
}

export async function getStudentEnrollments(studentId: string): Promise<Enrollment[]> {
  const cacheKey = CACHE_KEYS.enrollments(studentId);
  const cached = await hybridCache.get<Enrollment[]>(cacheKey);
  if (cached) {
    return cached;
  }

  try {
    const snapshot = await getFirestore()
      .collectionGroup("enrollments")
      .where("studentId", "==", studentId)
      .orderBy("enrolledAt", "desc")
      .get();

    const result = snapshot.docs.map((doc) => {
      const data = doc.data() as any;
      const enrollment: Enrollment = {
        id: doc.id,
        studentId: data.studentId,
        courseId: data.courseId,
        enrolledAt: data.enrolledAt,
        currentModuleId: data.currentModuleId || "",
        currentLessonId: data.currentLessonId || "",
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

    await hybridCache.set(cacheKey, result, CACHE_TTL.ENROLLMENTS);
    return result;
  } catch (error: any) {
    if (
      error.code === 9 ||
      error.message?.includes("FAILED_PRECONDITION") ||
      error.message?.includes("index")
    ) {
      console.warn("Index not found for enrollments query, falling back to alternative query");

      const snapshot = await getFirestore().collectionGroup("enrollments").get();

      const result = snapshot.docs
        .filter((doc) => {
          const data = doc.data();
          return data.studentId === studentId;
        })
        .map((doc) => {
          const data = doc.data() as any;
          const enrollment: Enrollment = {
            id: doc.id,
            studentId: data.studentId,
            courseId: data.courseId,
            enrolledAt: data.enrolledAt,
            currentModuleId: data.currentModuleId || "",
            currentLessonId: data.currentLessonId || "",
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

      await hybridCache.set(cacheKey, result, CACHE_TTL.ENROLLMENTS);
      return result;
    }
    throw error;
  }
}

export async function getEnrolledCoursesWithDetails(
  studentId: string
): Promise<
  Array<{
    enrollment: Enrollment;
    course: PublishedCourse;
    progress: {
      totalLessons: number;
      completedLessons: number;
      progressPercentage: number;
    };
  }>
> {
  const enrollments = await getStudentEnrollments(studentId);
  const db = getFirestore();

  const coursePromises = enrollments.map(async (enrollment) => {
    try {
      const courseDoc = await db.collection("courses").doc(enrollment.courseId).get();

      if (!courseDoc.exists) {
        console.warn(`Course ${enrollment.courseId} not found`);
        return null;
      }

      const course = courseDoc.data() as PublishedCourse;
      course.id = courseDoc.id;

      if (course.status !== "published") {
        console.warn(`Course ${enrollment.courseId} not published`);
        return null;
      }

      const totalLessons = enrollment.accessibleLessonIds?.length || 0;
      const completedLessons = enrollment.completedLessonIds?.length || 0;
      const progressPercentage = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;

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

export async function getCourseEnrollment(courseId: string, studentId: string): Promise<Enrollment | null> {
  const snapshot = await getFirestore()
    .collection("courses")
    .doc(courseId)
    .collection("enrollments")
    .where("studentId", "==", studentId)
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

export async function updateProgress(courseId: string, enrollmentId: string, lessonId: string): Promise<Enrollment> {
  const enrollment = await getEnrollment(courseId, enrollmentId);
  if (!enrollment) {
    throw new Error("Enrollment not found");
  }

  if (!enrollment.completedLessonIds.includes(lessonId)) {
    enrollment.completedLessonIds.push(lessonId);
  }

  enrollment.currentLessonId = lessonId;

  await getFirestore()
    .collection("courses")
    .doc(courseId)
    .collection("enrollments")
    .doc(enrollmentId)
    .update({
      completedLessonIds: enrollment.completedLessonIds,
      currentLessonId: enrollment.currentLessonId,
    });

  await invalidateEnrollments(enrollmentId);
  return enrollment;
}

export async function updateEnrollmentsForCourse(mentorId: string, courseId: string): Promise<void> {
  console.warn(
    "updateEnrollmentsForCourse is deprecated. " + "Old Firestore course/module/lesson services have been removed."
  );
}
