/**
 * @deprecated This controller is deprecated and will be removed in a future version.
 * Enrollment operations should use StudentManagementController instead.
 * Progress tracking endpoints will be migrated separately.
 */

import { Request, Response } from 'express';
import { EnrollmentService } from '../services/enrollment';
import { KnowledgeGraphAccessLayer } from '../services/knowledgeGraphAccess';

// Initialize services
const accessLayer = new KnowledgeGraphAccessLayer();
const enrollmentService = new EnrollmentService(accessLayer);

interface ErrorResponse {
  error: string;
  errorCode?: number;
  errorMessage?: string;
  indexLink?: string | null;
}

/**
 * Enroll student in a course
 * @deprecated Use StudentManagementController.enrollStudentHandler instead
 */
export const enrollStudentHandler = async (
  req: Request<{ id: string }, { enrollment: any } | ErrorResponse, {}>,
  res: Response<{ enrollment: any } | ErrorResponse>
) => {
  try {
    const uid = req.firebaseUser?.uid;
    const studentId = req.firebaseUser?.uid; // Student is the authenticated user

    if (!uid || !studentId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { id: graphId } = req.params;

    // Get mentorId from public course index (stores mentorId for published courses)
    const { PublicCourseIndexService } = await import('../services/publicCourse/PublicCourseIndexService');
    const publicCourseIndex = new PublicCourseIndexService(accessLayer);
    const course = await publicCourseIndex.getCourseByGraphId(graphId);
    
    if (!course || !course.mentorId) {
      return res.status(404).json({ 
        error: 'Course not found or not published. Cannot enroll in unpublished courses.' 
      });
    }

    const mentorId = course.mentorId;
    const enrollment = await enrollmentService.enrollStudent(studentId, mentorId, graphId);
    return res.json({ enrollment });
  } catch (error: any) {
    console.error('Failed to enroll student:', error);
    return res.status(500).json({ error: error.message || 'Failed to enroll student' });
  }
};

/**
 * Unenroll student from a course
 * @deprecated Use StudentManagementController.unenrollStudentHandler instead
 */
export const unenrollStudentHandler = async (
  req: Request<{ id: string }, ErrorResponse, {}>,
  res: Response<ErrorResponse | { success: boolean }>
) => {
  try {
    const uid = req.firebaseUser?.uid;
    const studentId = req.firebaseUser?.uid;

    if (!uid || !studentId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { id: enrollmentId } = req.params;

    await enrollmentService.unenrollStudent(studentId, enrollmentId);
    return res.json({ success: true });
  } catch (error: any) {
    console.error('Failed to unenroll student:', error);
    return res.status(500).json({ error: error.message || 'Failed to unenroll student' });
  }
};

/**
 * Get enrollment details
 */
export const getEnrollmentHandler = async (
  req: Request<{ id: string }, { enrollment: any } | ErrorResponse, {}>,
  res: Response<{ enrollment: any } | ErrorResponse>
) => {
  try {
    const uid = req.firebaseUser?.uid;
    const studentId = req.firebaseUser?.uid;

    if (!uid || !studentId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { id: enrollmentId } = req.params;

    const enrollment = await enrollmentService.getEnrollment(studentId, enrollmentId);
    if (!enrollment) {
      return res.status(404).json({ error: 'Enrollment not found' });
    }

    return res.json({ enrollment });
  } catch (error: any) {
    console.error('Failed to get enrollment:', error);
    return res.status(500).json({ error: error.message || 'Failed to get enrollment' });
  }
};

/**
 * Get all enrollments for a student
 */
export const getStudentEnrollmentsHandler = async (
  req: Request<{}, { enrollments: any[] } | ErrorResponse, {}>,
  res: Response<{ enrollments: any[] } | ErrorResponse>
) => {
  try {
    const uid = req.firebaseUser?.uid;
    const studentId = req.firebaseUser?.uid;

    if (!uid || !studentId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const enrollments = await enrollmentService.getStudentEnrollments(studentId);
    return res.json({ enrollments });
  } catch (error: any) {
    console.error('Failed to get student enrollments:', error);
    return res.status(500).json({ error: error.message || 'Failed to get student enrollments' });
  }
};

/**
 * Get all enrolled courses with details in bulk
 */
export const getEnrolledCoursesWithDetailsHandler = async (
  req: Request<{}, { courses: any[] } | ErrorResponse, {}>,
  res: Response<{ courses: any[] } | ErrorResponse>
) => {
  try {
    const uid = req.firebaseUser?.uid;
    const studentId = req.firebaseUser?.uid;

    if (!uid || !studentId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Get all enrollments
    const enrollments = await enrollmentService.getStudentEnrollments(studentId);
    
    // Get course details for each enrollment
    const { PublicCourseIndexService } = await import('../services/publicCourse/PublicCourseIndexService');
    const publicCourseIndex = new PublicCourseIndexService(accessLayer);
    
    const courses = await Promise.all(
      enrollments.map(async (enrollment) => {
        try {
          const course = await publicCourseIndex.getCourseByGraphId(enrollment.graphId);
          if (!course) {
            return null;
          }
          
          // Calculate progress
          const totalLessons = enrollment.progress.completedConcepts.length + enrollment.progress.completedLayers.length;
          const completedLessons = enrollment.progress.completedConcepts.length;
          const progressPercentage = enrollment.progress.overallProgress || 0;
          
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
          console.error(`Failed to load course ${enrollment.graphId}:`, error);
          return null;
        }
      })
    );
    
    return res.json({ courses: courses.filter((c): c is NonNullable<typeof c> => c !== null) });
  } catch (error: any) {
    console.error('Failed to get enrolled courses with details:', error);
    return res.status(500).json({ error: error.message || 'Failed to get enrolled courses with details' });
  }
};

/**
 * Get student's enrollment in a specific course
 */
export const getCourseEnrollmentHandler = async (
  req: Request<{ courseId: string }, { enrollment: any } | ErrorResponse, {}>,
  res: Response<{ enrollment: any | null } | ErrorResponse>
) => {
  try {
    const uid = req.firebaseUser?.uid;
    const studentId = req.firebaseUser?.uid;

    if (!uid || !studentId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { courseId: graphId } = req.params;

    // Get mentorId from public course index
    const { PublicCourseIndexService } = await import('../services/publicCourse/PublicCourseIndexService');
    const publicCourseIndex = new PublicCourseIndexService(accessLayer);
    const course = await publicCourseIndex.getCourseByGraphId(graphId);
    
    if (!course || !course.mentorId) {
      // Course not found or not published - return null enrollment (not an error)
      return res.json({ enrollment: null });
    }

    const enrollment = await enrollmentService.findEnrollment(studentId, course.mentorId, graphId);
    // Return 200 with null enrollment if not found (user is simply not enrolled, not an error)
    return res.json({ enrollment: enrollment || null });
  } catch (error: any) {
    console.error('Failed to get course enrollment:', error);
    return res.status(500).json({ error: error.message || 'Failed to get course enrollment' });
  }
};

/**
 * Update student progress
 */
export const updateProgressHandler = async (
  req: Request<{ id: string }, { enrollment: any } | ErrorResponse, { lessonId: string }>,
  res: Response<{ enrollment: any } | ErrorResponse>
) => {
  try {
    const uid = req.firebaseUser?.uid;
    const studentId = req.firebaseUser?.uid;

    if (!uid || !studentId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { id: enrollmentId } = req.params;
    const { lessonId } = req.body;

    if (!lessonId) {
      return res.status(400).json({ error: 'lessonId is required' });
    }

    // Get enrollment to find mentorId and graphId
    const enrollment = await enrollmentService.getEnrollment(studentId, enrollmentId);
    if (!enrollment) {
      return res.status(404).json({ error: 'Enrollment not found' });
    }

    const updatedEnrollment = await enrollmentService.updateProgress(studentId, enrollmentId, {
      completedConceptId: lessonId,
      currentConceptId: lessonId,
    });
    return res.json({ enrollment: updatedEnrollment });
  } catch (error: any) {
    console.error('Failed to update progress:', error);
    return res.status(500).json({ error: error.message || 'Failed to update progress' });
  }
};

/**
 * Track lesson completion
 */
export const trackLessonCompletionHandler = async (
  req: Request<{ id: string }, { enrollment: any } | ErrorResponse, { lessonId: string }>,
  res: Response<{ enrollment: any } | ErrorResponse>
) => {
  try {
    const uid = req.firebaseUser?.uid;
    const studentId = req.firebaseUser?.uid;

    if (!uid || !studentId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { id: enrollmentId } = req.params;
    const { lessonId } = req.body;

    if (!lessonId) {
      return res.status(400).json({ error: 'lessonId is required' });
    }

    // Get enrollment to find mentorId and graphId
    const enrollment = await enrollmentService.getEnrollment(studentId, enrollmentId);
    if (!enrollment) {
      return res.status(404).json({ error: 'Enrollment not found' });
    }

    // Update progress to mark lesson as completed
    const updatedEnrollment = await enrollmentService.updateProgress(studentId, enrollmentId, {
      completedConceptId: lessonId,
      currentConceptId: lessonId,
    });

    return res.json({ enrollment: updatedEnrollment });
  } catch (error: any) {
    console.error('Failed to track lesson completion:', error);
    return res.status(500).json({ error: error.message || 'Failed to track lesson completion' });
  }
};

/**
 * Check if student can advance to next lesson
 */
export const canAdvanceToNextHandler = async (
  req: Request<{ id: string }, { canAdvance: boolean; reason?: string; nextLessonId?: string } | ErrorResponse, {}>,
  res: Response<{ canAdvance: boolean; reason?: string; nextLessonId?: string } | ErrorResponse>
) => {
  try {
    const uid = req.firebaseUser?.uid;
    const studentId = req.firebaseUser?.uid;

    if (!uid || !studentId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { id: enrollmentId } = req.params;
    const { lessonId } = req.query;

    if (!lessonId || typeof lessonId !== 'string') {
      return res.status(400).json({ error: 'lessonId query parameter is required' });
    }

    // Get enrollment
    const enrollment = await enrollmentService.getEnrollment(studentId, enrollmentId);
    if (!enrollment) {
      return res.status(404).json({ error: 'Enrollment not found' });
    }

    // Get all published lessons for the course
    const allLessons = await accessLayer.getAllPublishedLessons(enrollment.mentorId, enrollment.graphId);
    
    // Find current lesson index
    const currentIndex = allLessons.findIndex(l => l.conceptId === lessonId);
    if (currentIndex === -1) {
      return res.json({ canAdvance: false, reason: 'Current lesson not found' });
    }

    // Check if lesson is completed
    const isCompleted = enrollment.progress.completedConcepts.includes(lessonId);
    if (!isCompleted) {
      return res.json({ canAdvance: false, reason: 'Current lesson not completed' });
    }

    // Check if there's a next lesson
    if (currentIndex >= allLessons.length - 1) {
      return res.json({ canAdvance: false, reason: 'No more lessons available' });
    }

    const nextLesson = allLessons[currentIndex + 1];
    return res.json({ 
      canAdvance: true, 
      nextLessonId: nextLesson.conceptId 
    });
  } catch (error: any) {
    console.error('Failed to check advancement:', error);
    return res.status(500).json({ error: error.message || 'Failed to check advancement' });
  }
};

/**
 * Get overall progress
 */
export const getProgressHandler = async (
  req: Request<{ id: string }, { progress: any } | ErrorResponse, {}>,
  res: Response<{ progress: any } | ErrorResponse>
) => {
  try {
    const uid = req.firebaseUser?.uid;
    const studentId = req.firebaseUser?.uid;

    if (!uid || !studentId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { id: enrollmentId } = req.params;

    // Get enrollment
    const enrollment = await enrollmentService.getEnrollment(studentId, enrollmentId);
    if (!enrollment) {
      return res.status(404).json({ error: 'Enrollment not found' });
    }

    // Get course structure to calculate progress
    const allLessons = await accessLayer.getAllPublishedLessons(enrollment.mentorId, enrollment.graphId);
    const allModules = await accessLayer.getPublishedModules(enrollment.mentorId, enrollment.graphId);
    
    const totalLessons = allLessons.length;
    const completedLessons = enrollment.progress.completedConcepts.length;
    const totalModules = allModules.length;
    const completedModules = enrollment.progress.completedLayers.length;
    const progressPercentage = enrollment.progress.overallProgress || 0;

    // Find current lesson
    let currentLesson = null;
    if (enrollment.progress.currentConceptId) {
      currentLesson = allLessons.find(l => l.conceptId === enrollment.progress.currentConceptId);
    }

    // Find next lesson
    let nextLesson = null;
    if (currentLesson) {
      const currentIndex = allLessons.findIndex(l => l.conceptId === currentLesson.conceptId);
      if (currentIndex >= 0 && currentIndex < allLessons.length - 1) {
        nextLesson = allLessons[currentIndex + 1];
      }
    } else if (allLessons.length > 0) {
      // If no current lesson, next is the first lesson
      nextLesson = allLessons[0];
    }

    // Find current module
    let currentModule = null;
    if (enrollment.progress.currentLayerId) {
      currentModule = allModules.find(m => m.layerId === enrollment.progress.currentLayerId);
    }

    const progress = {
      enrollment,
      totalLessons,
      completedLessons,
      totalModules,
      completedModules,
      progressPercentage,
      currentModule: currentModule ? {
        id: currentModule.layerId,
        name: currentModule.title,
      } : null,
      currentLesson: currentLesson ? {
        id: currentLesson.conceptId,
        name: currentLesson.title,
      } : null,
      nextLesson: nextLesson ? {
        id: nextLesson.conceptId,
        name: nextLesson.title,
      } : null,
    };

    return res.json({ progress });
  } catch (error: any) {
    console.error('Failed to get progress:', error);
    return res.status(500).json({ error: error.message || 'Failed to get progress' });
  }
};

/**
 * Get accessible lessons
 */
export const getAccessibleLessonsHandler = async (
  req: Request<{ id: string }, { lessons: any[] } | ErrorResponse, {}>,
  res: Response<{ lessons: any[] } | ErrorResponse>
) => {
  try {
    const uid = req.firebaseUser?.uid;
    const studentId = req.firebaseUser?.uid;

    if (!uid || !studentId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { id: enrollmentId } = req.params;

    // Get enrollment
    const enrollment = await enrollmentService.getEnrollment(studentId, enrollmentId);
    if (!enrollment) {
      return res.status(404).json({ error: 'Enrollment not found' });
    }

    // Get all published lessons
    const allLessons = await accessLayer.getAllPublishedLessons(enrollment.mentorId, enrollment.graphId);
    
    // Filter to accessible lessons (completed lessons + current lesson + next lesson)
    const completedConceptIds = new Set(enrollment.progress.completedConcepts);
    const accessibleLessons = allLessons.filter(lesson => {
      // Include completed lessons
      if (completedConceptIds.has(lesson.conceptId)) {
        return true;
      }
      
      // Include current lesson
      if (lesson.conceptId === enrollment.progress.currentConceptId) {
        return true;
      }
      
      // Include lessons up to and including the next uncompleted lesson
      const currentIndex = allLessons.findIndex(l => l.conceptId === enrollment.progress.currentConceptId);
      const lessonIndex = allLessons.findIndex(l => l.conceptId === lesson.conceptId);
      
      // If we have a current lesson, include lessons up to the next uncompleted one
      if (currentIndex >= 0 && lessonIndex <= currentIndex + 1) {
        return true;
      }
      
      // If no current lesson, include the first lesson
      if (currentIndex === -1 && lessonIndex === 0) {
        return true;
      }
      
      return false;
    });

    const lessons = accessibleLessons.map(lesson => ({
      id: lesson.conceptId,
      title: lesson.title,
      description: lesson.description,
      isCompleted: completedConceptIds.has(lesson.conceptId),
      isCurrent: lesson.conceptId === enrollment.progress.currentConceptId,
    }));

    return res.json({ lessons });
  } catch (error: any) {
    console.error('Failed to get accessible lessons:', error);
    return res.status(500).json({ error: error.message || 'Failed to get accessible lessons' });
  }
};

