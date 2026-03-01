/**
 * Recommendation Service
 * 
 * @deprecated Old Firestore-based recommendation service.
 * TODO: Migrate to graph-based recommendations when ready.
 * 
 * Note: This service previously depended on courseService which has been removed
 * as part of the graph-based publishing migration.
 */

import { getFirestore } from '../config/firebaseAdmin';
import { getStudentEnrollments } from './enrollmentService';
import type { PublishedCourse } from '../types/publishing';

/**
 * Get recommended courses for a user
 * Simple MVP algorithm: Popular courses that user hasn't enrolled in
 * @deprecated Requires migration to graph-based data
 */
export async function getRecommendedCourses(
  uid: string,
  limit: number = 5
): Promise<PublishedCourse[]> {
  try {
    // Get user's enrollments to exclude already enrolled courses
    const enrollments = await getStudentEnrollments(uid);
    const enrolledCourseIds = new Set(enrollments.map(e => e.courseId));

    // Get all public courses directly from Firestore
    const db = getFirestore();
    const snapshot = await db
      .collection('courses')
      .where('status', '==', 'published')
      .where('isPublic', '==', true)
      .get();

    const publicCourses = snapshot.docs.map(doc => {
      const course = doc.data() as PublishedCourse;
      course.id = doc.id;
      return course;
    });

    // Filter out already enrolled courses
    const availableCourses = publicCourses.filter(
      course => !enrolledCourseIds.has(course.id)
    );

    // Sort by popularity (enrollment count) - for MVP, we'll use a simple metric
    availableCourses.sort((a, b) => {
      const aSize = a.moduleIds?.length || 0;
      const bSize = b.moduleIds?.length || 0;
      
      if (aSize !== bSize) {
        return bSize - aSize;
      }
      
      const aCreated = a.createdAt || 0;
      const bCreated = b.createdAt || 0;
      return bCreated - aCreated;
    });

    return availableCourses.slice(0, limit);
  } catch (error) {
    console.error('Error getting recommended courses:', error);
    return [];
  }
}

/**
 * Get courses user is enrolled in but hasn't completed (for "Continue Learning")
 */
export async function getContinueLearningCourses(
  uid: string,
  limit: number = 5
): Promise<PublishedCourse[]> {
  try {
    const enrollments = await getStudentEnrollments(uid);
    const db = getFirestore();

    const continueCourses: PublishedCourse[] = [];

    for (const enrollment of enrollments) {
      if (enrollment.accessibleLessonIds.length === 0) continue;
      
      const progressPercentage = (enrollment.completedLessonIds.length / enrollment.accessibleLessonIds.length) * 100;
      if (progressPercentage >= 100) continue;

      try {
        const courseDoc = await db.collection('courses').doc(enrollment.courseId).get();
        if (courseDoc.exists) {
          const course = courseDoc.data() as PublishedCourse;
          course.id = courseDoc.id;
          continueCourses.push(course);
        }
      } catch (error) {
        console.warn(`Course ${enrollment.courseId} not found:`, error);
      }
    }

    continueCourses.sort((a, b) => {
      const aEnrollment = enrollments.find(e => e.courseId === a.id);
      const bEnrollment = enrollments.find(e => e.courseId === b.id);
      const aLastAccess = aEnrollment?.lastAccessedAt || 0;
      const bLastAccess = bEnrollment?.lastAccessedAt || 0;
      return bLastAccess - aLastAccess;
    });

    return continueCourses.slice(0, limit);
  } catch (error) {
    console.error('Error getting continue learning courses:', error);
    return [];
  }
}
