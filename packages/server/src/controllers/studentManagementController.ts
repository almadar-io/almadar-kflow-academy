/**
 * Student Management Controller
 * 
 * Handles student CRUD operations and enrollment management
 * using the graph-based student management service.
 */

import { Request, Response } from 'express';
import { GraphCacheManager } from '../services/knowledgeGraphAccess/core/GraphCacheManager';
import { GraphLoader } from '../services/knowledgeGraphAccess/core/GraphLoader';
import { NodeMutationService } from '../services/knowledgeGraphAccess/mutation/NodeMutationService';
import { RelationshipMutationService } from '../services/knowledgeGraphAccess/mutation/RelationshipMutationService';
import { StudentManagementService } from '../services/studentManagementService';


// Singleton instances
const cacheManager = new GraphCacheManager();
const loader = new GraphLoader(cacheManager);
const nodeMutation = new NodeMutationService(loader);
const relMutation = new RelationshipMutationService(loader);
const studentService = new StudentManagementService(loader, nodeMutation, relMutation);

// ============================================================================
// Student CRUD Endpoints
// ============================================================================

/**
 * GET /api/students?courseId=:courseId
 * Get all students for an instructor (optionally filtered by course)
 */
export const getStudentsHandler = async (
  req: Request<{}, {}, {}, { courseId?: string }>,
  res: Response
) => {
  try {
    const uid = req.firebaseUser?.uid;
    if (!uid) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { courseId } = req.query;

    if (courseId) {
      // Get students for a specific course
      const students = await studentService.getEnrolledStudents(uid, courseId);
      return res.json({ students });
    } else {
      // Get all students across all courses (would need to aggregate)
      // For now, return empty array - this would require a different service method
      return res.json({ students: [] });
    }
  } catch (error: any) {
    console.error('Failed to get students:', error);
    return res.status(500).json({ error: error.message || 'Failed to get students' });
  }
};

/**
 * POST /api/students
 * Create a new student
 */
export const createStudentHandler = async (
  req: Request<{}, {}, { courseId: string; userId: string; name: string; email: string; phone?: string }>,
  res: Response
) => {
  try {
    const uid = req.firebaseUser?.uid;
    if (!uid) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { courseId, userId, name, email, phone } = req.body;

    if (!courseId || !userId || !name || !email) {
      return res.status(400).json({ error: 'Missing required fields: courseId, userId, name, email' });
    }

    const student = await studentService.createStudent(uid, courseId, {
      userId,
      name,
      email,
      phone,
    });

    return res.status(201).json({ student });
  } catch (error: any) {
    console.error('Failed to create student:', error);
    return res.status(500).json({ error: error.message || 'Failed to create student' });
  }
};

/**
 * PUT /api/students/:studentUserId
 * Update a student
 */
export const updateStudentHandler = async (
  req: Request<{ studentUserId: string }, {}, { courseId: string; name?: string; email?: string; phone?: string }>,
  res: Response
) => {
  try {
    const uid = req.firebaseUser?.uid;
    if (!uid) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { studentUserId } = req.params;
    const { courseId, ...updates } = req.body;

    if (!courseId) {
      return res.status(400).json({ error: 'Missing required field: courseId' });
    }

    const student = await studentService.updateStudent(uid, courseId, studentUserId, updates);

    return res.json({ student });
  } catch (error: any) {
    console.error('Failed to update student:', error);
    return res.status(500).json({ error: error.message || 'Failed to update student' });
  }
};

/**
 * DELETE /api/students/:studentUserId
 * Delete a student
 */
export const deleteStudentHandler = async (
  req: Request<{ studentUserId: string }, {}, {}, { courseId: string }>,
  res: Response
) => {
  try {
    const uid = req.firebaseUser?.uid;
    if (!uid) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { studentUserId } = req.params;
    const { courseId } = req.query;

    if (!courseId) {
      return res.status(400).json({ error: 'Missing required query parameter: courseId' });
    }

    await studentService.deleteStudent(uid, courseId, studentUserId);

    return res.status(204).send();
  } catch (error: any) {
    console.error('Failed to delete student:', error);
    return res.status(500).json({ error: error.message || 'Failed to delete student' });
  }
};

/**
 * GET /api/students/:studentUserId
 * Get a single student
 */
export const getStudentHandler = async (
  req: Request<{ studentUserId: string }, {}, {}, { courseId: string }>,
  res: Response
) => {
  try {
    const uid = req.firebaseUser?.uid;
    if (!uid) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { studentUserId } = req.params;
    const { courseId } = req.query;

    if (!courseId) {
      return res.status(400).json({ error: 'Missing required query parameter: courseId' });
    }

    const student = await studentService.getStudent(uid, courseId, studentUserId);

    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    return res.json({ student });
  } catch (error: any) {
    console.error('Failed to get student:', error);
    return res.status(500).json({ error: error.message || 'Failed to get student' });
  }
};

// ============================================================================
// Enrollment Endpoints
// ============================================================================

/**
 * POST /api/courses/:courseId/enroll
 * Enroll a student in a course
 */
export const enrollStudentHandler = async (
  req: Request<{ courseId: string }, {}, { studentUserId: string; name?: string; email?: string; phone?: string }>,
  res: Response
) => {
  try {
    const uid = req.firebaseUser?.uid;
    if (!uid) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { courseId } = req.params;
    const { studentUserId, name, email, phone } = req.body;

    if (!studentUserId) {
      return res.status(400).json({ error: 'Missing required field: studentUserId' });
    }

    const studentData = name && email ? { userId: studentUserId, name, email, phone } : undefined;

    await studentService.enrollStudentInCourse(uid, courseId, studentUserId, studentData);

    return res.status(201).json({ message: 'Student enrolled successfully' });
  } catch (error: any) {
    console.error('Failed to enroll student:', error);
    return res.status(500).json({ error: error.message || 'Failed to enroll student' });
  }
};

/**
 * DELETE /api/courses/:courseId/enroll/:studentUserId
 * Unenroll a student from a course
 */
export const unenrollStudentHandler = async (
  req: Request<{ courseId: string; studentUserId: string }>,
  res: Response
) => {
  try {
    const uid = req.firebaseUser?.uid;
    if (!uid) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { courseId, studentUserId } = req.params;

    await studentService.unenrollStudentFromCourse(uid, courseId, studentUserId);

    return res.status(204).send();
  } catch (error: any) {
    console.error('Failed to unenroll student:', error);
    return res.status(500).json({ error: error.message || 'Failed to unenroll student' });
  }
};

/**
 * POST /api/student/courses/:courseId/enroll
 * Student self-enrollment endpoint (replaces old enrollment API)
 * Gets mentorId from course and enrolls the authenticated student
 */
export const enrollStudentSelfHandler = async (
  req: Request<{ courseId: string }>,
  res: Response
) => {
  try {
    const uid = req.firebaseUser?.uid;
    if (!uid) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { courseId } = req.params;

    // Get mentorId from public course index
    const { PublicCourseIndexService } = await import('../services/publicCourse/PublicCourseIndexService');
    const { KnowledgeGraphAccessLayer } = await import('../services/knowledgeGraphAccess');
    const accessLayer = new KnowledgeGraphAccessLayer();
    const publicCourseIndex = new PublicCourseIndexService(accessLayer);
    const course = await publicCourseIndex.getCourseByGraphId(courseId);
    
    if (!course || !course.mentorId) {
      return res.status(404).json({ 
        error: 'Course not found or not published. Cannot enroll in unpublished courses.' 
      });
    }

    const mentorId = course.mentorId;

    // Get user info from Firebase Auth token (available in req.firebaseUser)
    // Firebase token has email, but name might not be available
    // If not available, enroll without student data (service will handle it)
    let studentData;
    if (req.firebaseUser?.email) {
      studentData = {
        userId: uid,
        name: (req.firebaseUser as any).name || (req.firebaseUser as any).displayName || 'Student',
        email: req.firebaseUser.email,
      };
    }

    // Enroll student using the new service
    await studentService.enrollStudentInCourse(mentorId, courseId, uid, studentData);

    return res.status(201).json({ 
      message: 'Successfully enrolled in course',
      courseId,
    });
  } catch (error: any) {
    console.error('Failed to enroll student:', error);
    return res.status(500).json({ error: error.message || 'Failed to enroll student' });
  }
};

/**
 * DELETE /api/student/courses/:courseId/enroll
 * Student self-unenrollment endpoint (replaces old enrollment API)
 */
export const unenrollStudentSelfHandler = async (
  req: Request<{ courseId: string }>,
  res: Response
) => {
  try {
    const uid = req.firebaseUser?.uid;
    if (!uid) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { courseId } = req.params;

    // Get mentorId from public course index
    const { PublicCourseIndexService } = await import('../services/publicCourse/PublicCourseIndexService');
    const { KnowledgeGraphAccessLayer } = await import('../services/knowledgeGraphAccess');
    const accessLayer = new KnowledgeGraphAccessLayer();
    const publicCourseIndex = new PublicCourseIndexService(accessLayer);
    const course = await publicCourseIndex.getCourseByGraphId(courseId);
    
    if (!course || !course.mentorId) {
      return res.status(404).json({ error: 'Course not found' });
    }

    const mentorId = course.mentorId;

    await studentService.unenrollStudentFromCourse(mentorId, courseId, uid);

    return res.status(204).send();
  } catch (error: any) {
    console.error('Failed to unenroll student:', error);
    return res.status(500).json({ error: error.message || 'Failed to unenroll student' });
  }
};
