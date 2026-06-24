import { getFirestore } from '@almadar/server';
import type { EnrollmentNodeProperties } from '@almadar-io/knowledge';
import { hybridCache, CACHE_TTL } from "./cacheService";
import { CACHE_KEYS } from "./cacheInvalidation";
import { accessLayer } from "./studentDataAccess";
import type { PublishedCourse } from "../types/publishing";
import type { Enrollment, AssessmentStatus } from "@kflow-academy/shared";

function enrollmentNodeToEnrollment(graphId: string, node: EnrollmentNodeProperties): Enrollment {
  return {
    id: node.id,
    studentId: '',
    courseId: graphId,
    enrolledAt: node.enrolledAt,
    currentModuleId: node.currentLayerId ?? '',
    currentLessonId: node.currentConceptId ?? '',
    completedModuleIds: node.completedLayerIds,
    completedLessonIds: node.completedConceptIds,
    startedAt: node.createdAt,
    lastAccessedAt: node.updatedAt,
    accessibleModuleIds: [],
    accessibleLessonIds: [],
    lockedModuleIds: [],
    lockedLessonIds: [],
    assessmentStatus: new Map<string, AssessmentStatus>(),
    canSkipAhead: false,
    notificationEnabled: true,
  };
}

export async function getEnrollmentById(
  studentId: string,
  courseSettingsNodeId: string
): Promise<Enrollment | null> {
  const node = await accessLayer.getEnrollment(studentId, courseSettingsNodeId, studentId);
  if (!node) return null;
  return enrollmentNodeToEnrollment(courseSettingsNodeId, node);
}

export async function getEnrollment(courseId: string, enrollmentId: string): Promise<Enrollment | null> {
  return getEnrollmentById(enrollmentId, enrollmentId);
}

export async function getStudentEnrollments(studentId: string): Promise<Enrollment[]> {
  const cacheKey = CACHE_KEYS.enrollments(studentId);
  const cached = await hybridCache.get<Enrollment[]>(cacheKey);
  if (cached) return cached;

  const nodes = await accessLayer.listEnrollments(studentId);
  const result = nodes.map((node) => enrollmentNodeToEnrollment(node.id, node));

  await hybridCache.set(cacheKey, result, CACHE_TTL.ENROLLMENTS);
  return result;
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
      if (!courseDoc.exists) return null;

      const course = courseDoc.data() as PublishedCourse;
      course.id = courseDoc.id;
      if (course.status !== "published") return null;

      const totalLessons = enrollment.accessibleLessonIds?.length ?? 0;
      const completedLessons = enrollment.completedLessonIds?.length ?? 0;
      const progressPercentage = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;

      return {
        enrollment,
        course,
        progress: { totalLessons, completedLessons, progressPercentage },
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
  const enrollments = await getStudentEnrollments(studentId);
  return enrollments.find((e) => e.courseId === courseId) ?? null;
}

export async function updateEnrollmentsForCourse(mentorId: string, courseId: string): Promise<void> {
  console.warn(
    "updateEnrollmentsForCourse is deprecated. " + "Old Firestore course/module/lesson services have been removed."
  );
}
