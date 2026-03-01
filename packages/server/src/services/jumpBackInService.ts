import { getFirestore } from '../config/firebaseAdmin';
import { getStudentEnrollments } from './enrollmentService';
import { getUserGraphs } from './graphService';
import { getAllUserProgress } from './userProgressService';
import type { PublishedCourse } from '../types/publishing';

export interface JumpBackInItem {
  id: string;
  type: 'course' | 'learningPath';
  title: string;
  description?: string;
  lastAccessedAt: number;
  progress?: {
    completedLessons: number;
    totalLessons: number;
    progressPercentage: number;
  };
  metadata: {
    courseId?: string;
    enrollmentId?: string;
    graphId?: string;
    seedConceptId?: string;
    conceptCount?: number;
    levelCount?: number;
  };
}

/**
 * Get all "Jump Back In" items (courses and learning paths) sorted by lastAccessedAt
 */
export async function getJumpBackInItems(uid: string): Promise<JumpBackInItem[]> {
  const items: JumpBackInItem[] = [];
  const db = getFirestore();

  try {
    // Get all active enrollments (not completed)
    const enrollments = await getStudentEnrollments(uid);
    
    for (const enrollment of enrollments) {
      // Skip completed courses
      if (enrollment.accessibleLessonIds.length === 0) continue;
      const progressPercentage = (enrollment.completedLessonIds.length / enrollment.accessibleLessonIds.length) * 100;
      if (progressPercentage >= 100) continue;

      // Get course details
      try {
        const courseDoc = await db.collection('courses').doc(enrollment.courseId).get();
        if (courseDoc.exists) {
          const course = courseDoc.data() as PublishedCourse;
          items.push({
            id: enrollment.id,
            type: 'course',
            title: course.title || course.seedConceptName || `Course ${enrollment.courseId}`,
            description: course.description,
            lastAccessedAt: enrollment.lastAccessedAt || enrollment.enrolledAt || 0,
            progress: {
              completedLessons: enrollment.completedLessonIds.length,
              totalLessons: enrollment.accessibleLessonIds.length,
              progressPercentage: Math.round(progressPercentage),
            },
            metadata: {
              courseId: enrollment.courseId,
              enrollmentId: enrollment.id,
            },
          });
        }
      } catch (error) {
        console.warn(`Course ${enrollment.courseId} not found:`, error);
      }
    }

    // Get all user graphs (learning paths)
    const graphs = await getUserGraphs(uid);
    
    // Get user progress to find most recently accessed graphs
    const allUserProgress = await getAllUserProgress(uid);
    
    // Create a map of graphId -> lastStudied timestamp
    const graphLastAccessed = new Map<string, number>();
    for (const progress of allUserProgress) {
      if (progress.graphId) {
        const current = graphLastAccessed.get(progress.graphId) || 0;
        if (progress.lastStudied > current) {
          graphLastAccessed.set(progress.graphId, progress.lastStudied);
        }
      }
    }

    for (const graph of graphs) {
      // Find seed concept
      // graph.concepts is a Record<string, Concept> in StoredConceptGraph
      const concepts = graph.concepts || {};
      const seedConcept = Object.values(concepts).find(
        (c: any) => c.id === graph.seedConceptId || c.name === graph.seedConceptId || c.isSeed
      );
      
      if (!seedConcept) continue;

      // Get last accessed time (from userProgress or graph createdAt)
      const lastAccessed = graphLastAccessed.get(graph.id) || graph.updatedAt || graph.createdAt || 0;
      
      // Count concepts and levels
      const conceptCount = Object.keys(graph.concepts || {}).length;
      const levelCount = Math.max(
        ...Object.values(graph.concepts || {}).map((c: any) => c.level || 0),
        0
      ) + 1; // Add 1 because levels are 0-indexed

      items.push({
        id: graph.id,
        type: 'learningPath',
        title: seedConcept.name || `Learning Path ${graph.id}`,
        description: seedConcept.description,
        lastAccessedAt: lastAccessed,
        metadata: {
          graphId: graph.id,
          seedConceptId: graph.seedConceptId,
          conceptCount,
          levelCount,
        },
      });
    }

    // Sort by lastAccessedAt (most recent first)
    items.sort((a, b) => b.lastAccessedAt - a.lastAccessedAt);

    // Return only top 5 results
    return items.slice(0, 5);
  } catch (error) {
    console.error('Error getting jump back in items:', error);
    return [];
  }
}

