import { Request, Response } from 'express';
import {
  createAssessment,
  updateAssessment,
  getAssessment,
  getAssessmentByLessonId,
  getAssessmentByLessonIdForStudent,
  deleteAssessment,
  submitAssessment,
  getAssessmentSubmission,
  getAssessmentSubmissions,
  evaluateSingleAnswer,
} from '../services/assessmentService';
import type { Assessment, AssessmentSubmission, AssessmentAnswer } from '../types/publishing';
import { upsertUser } from '../services/userService';

type ErrorResponse = { error: string; details?: string };

/**
 * Create an assessment for a lesson
 */
export const createAssessmentHandler = async (
  req: Request<{ courseId: string; moduleId: string; id: string }, { assessment: Assessment } | ErrorResponse, {
    title: string;
    description?: string;
    questions?: any[];
    passingScore?: number;
    maxAttempts?: number;
    timeLimit?: number;
    showResults?: boolean;
    randomizeQuestions?: boolean;
    autoGenerate?: boolean;
    numQuestions?: number;
    questionTypes?: ('multiple_choice' | 'true_false' | 'short_answer' | 'essay')[];
  }>,
  res: Response<{ assessment: Assessment } | ErrorResponse>
) => {
  try {
    const uid = req.firebaseUser?.uid;
    if (!uid) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const email = req.firebaseUser?.email;
    if (email) {
      await upsertUser(uid, email).catch((error) => {
        console.error('Error upserting user:', error);
      });
    }

    const { courseId, moduleId, id: lessonId } = req.params;
    const {
      title,
      description,
      questions,
      passingScore,
      maxAttempts,
      timeLimit,
      showResults,
      randomizeQuestions,
      autoGenerate,
      numQuestions,
      questionTypes,
    } = req.body;

    if (!title) {
      return res.status(400).json({ error: 'title is required' });
    }

    const assessment = await createAssessment(courseId, moduleId, lessonId, {
      title,
      description,
      questions,
      passingScore,
      maxAttempts,
      timeLimit,
      showResults,
      randomizeQuestions,
      autoGenerate,
      numQuestions,
      questionTypes,
    });

    return res.json({ assessment });
  } catch (error: any) {
    console.error('Failed to create assessment:', error);
    return res.status(500).json({ 
      error: error.message || 'Failed to create assessment',
      details: error.message,
    });
  }
};

/**
 * Update an assessment
 */
export const updateAssessmentHandler = async (
  req: Request<{ courseId: string; moduleId: string; id: string; assessmentId: string }, { assessment: Assessment } | ErrorResponse, Partial<Assessment>>,
  res: Response<{ assessment: Assessment } | ErrorResponse>
) => {
  try {
    const uid = req.firebaseUser?.uid;
    if (!uid) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { courseId, assessmentId } = req.params;
    const updates = req.body;

    const assessment = await updateAssessment(courseId, assessmentId, updates);

    return res.json({ assessment });
  } catch (error: any) {
    console.error('Failed to update assessment:', error);
    return res.status(500).json({ 
      error: error.message || 'Failed to update assessment',
      details: error.message,
    });
  }
};

/**
 * Get an assessment
 */
export const getAssessmentHandler = async (
  req: Request<{ courseId: string; id: string }>,
  res: Response<{ assessment: Assessment } | ErrorResponse>
) => {
  try {
    const uid = req.firebaseUser?.uid;
    if (!uid) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { courseId, id: assessmentId } = req.params;
    const assessment = await getAssessment(courseId, assessmentId);

    if (!assessment) {
      return res.status(404).json({ error: 'Assessment not found' });
    }

    return res.json({ assessment });
  } catch (error: any) {
    console.error('Failed to get assessment:', error);
    return res.status(500).json({ 
      error: error.message || 'Failed to get assessment',
      details: error.message,
    });
  }
};

/**
 * Get assessment by lesson ID (for mentors)
 */
export const getAssessmentByLessonHandler = async (
  req: Request<{ courseId: string; moduleId: string; id: string }>,
  res: Response<{ assessment: Assessment | null } | ErrorResponse>
) => {
  try {
    const uid = req.firebaseUser?.uid;
    if (!uid) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { courseId, id: lessonId } = req.params;
    const assessment = await getAssessmentByLessonId(courseId, lessonId);

    return res.json({ assessment });
  } catch (error: any) {
    console.error('Failed to get assessment by lesson:', error);
    return res.status(500).json({ 
      error: error.message || 'Failed to get assessment by lesson',
      details: error.message,
    });
  }
};

/**
 * Get assessment by lesson ID (for students)
 */
export const getAssessmentByLessonForStudentHandler = async (
  req: Request<{ courseId?: string; lessonId: string }, {}, {}, { courseId?: string }>,
  res: Response<{ assessment: Assessment | null } | ErrorResponse>
) => {
  try {
    const uid = req.firebaseUser?.uid;
    if (!uid) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Support both routes: /courses/:courseId/lessons/:lessonId/assessments and /lessons/:lessonId/assessments
    const courseId = req.params.courseId || req.query.courseId;
    const lessonId = req.params.lessonId;

    if (!courseId) {
      return res.status(400).json({ error: 'courseId is required (provide in path or query)' });
    }

    const assessment = await getAssessmentByLessonIdForStudent(courseId, lessonId);

    return res.json({ assessment });
  } catch (error: any) {
    console.error('Failed to get assessment by lesson for student:', error);
    return res.status(500).json({ 
      error: error.message || 'Failed to get assessment by lesson',
      details: error.message,
    });
  }
};

/**
 * Delete an assessment
 */
export const deleteAssessmentHandler = async (
  req: Request<{ courseId: string; id: string }>,
  res: Response<{ success: boolean } | ErrorResponse>
) => {
  try {
    const uid = req.firebaseUser?.uid;
    if (!uid) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { courseId, id: assessmentId } = req.params;
    await deleteAssessment(courseId, assessmentId);

    return res.json({ success: true });
  } catch (error: any) {
    console.error('Failed to delete assessment:', error);
    return res.status(500).json({ 
      error: error.message || 'Failed to delete assessment',
      details: error.message,
    });
  }
};

/**
 * Submit an assessment (student)
 */
export const submitAssessmentHandler = async (
  req: Request<{}, { submission: AssessmentSubmission } | ErrorResponse, {
    courseId: string;
    assessmentId: string;
    enrollmentId: string;
    lessonId: string;
    answers: AssessmentAnswer[];
  }>,
  res: Response<{ submission: AssessmentSubmission } | ErrorResponse>
) => {
  try {
    const uid = req.firebaseUser?.uid;
    if (!uid) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const {
      courseId,
      assessmentId,
      enrollmentId,
      lessonId,
      answers,
    } = req.body;

    if (!courseId || !assessmentId || !enrollmentId || !lessonId || !answers) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const submission = await submitAssessment(
      courseId,
      assessmentId,
      uid,
      enrollmentId,
      lessonId,
      answers
    );

    return res.json({ submission });
  } catch (error: any) {
    console.error('Failed to submit assessment:', error);
    return res.status(500).json({ 
      error: error.message || 'Failed to submit assessment',
      details: error.message,
    });
  }
};

/**
 * Get assessment submission
 */
export const getAssessmentSubmissionHandler = async (
  req: Request<{ courseId: string; assessmentId: string; id: string }>,
  res: Response<{ submission: AssessmentSubmission } | ErrorResponse>
) => {
  try {
    const uid = req.firebaseUser?.uid;
    if (!uid) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { courseId, assessmentId, id: submissionId } = req.params;
    const submission = await getAssessmentSubmission(courseId, assessmentId, submissionId);

    if (!submission) {
      return res.status(404).json({ error: 'Submission not found' });
    }

    return res.json({ submission });
  } catch (error: any) {
    console.error('Failed to get assessment submission:', error);
    return res.status(500).json({ 
      error: error.message || 'Failed to get assessment submission',
      details: error.message,
    });
  }
};

/**
 * Get all submissions for an assessment
 */
export const getAssessmentSubmissionsHandler = async (
  req: Request<{ courseId: string; id: string }, {}, { studentId?: string; enrollmentId?: string }>,
  res: Response<{ submissions: AssessmentSubmission[] } | ErrorResponse>
) => {
  try {
    const uid = req.firebaseUser?.uid;
    if (!uid) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { courseId, id: assessmentId } = req.params;
    const { studentId, enrollmentId } = req.query;

    const submissions = await getAssessmentSubmissions(
      courseId,
      assessmentId,
      studentId as string | undefined,
      enrollmentId as string | undefined
    );

    return res.json({ submissions });
  } catch (error: any) {
    console.error('Failed to get assessment submissions:', error);
    return res.status(500).json({ 
      error: error.message || 'Failed to get assessment submissions',
      details: error.message,
    });
  }
};

/**
 * Evaluate a single answer for immediate feedback
 */
export const evaluateAnswerHandler = async (
  req: Request<{}, {
    evaluation: {
      score: number;
      percentage: number;
      feedback: string;
      isCorrect: boolean;
      strengths: string[];
      weaknesses: string[];
    };
  } | ErrorResponse, {
    courseId: string;
    moduleId: string;
    lessonId: string;
    question: string;
    studentAnswer: string;
    correctAnswer?: string;
    maxPoints: number;
  }>,
  res: Response<{
    evaluation: {
      score: number;
      percentage: number;
      feedback: string;
      isCorrect: boolean;
      strengths: string[];
      weaknesses: string[];
    };
  } | ErrorResponse>
) => {
  try {
    const uid = req.firebaseUser?.uid;
    if (!uid) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { courseId, moduleId, lessonId, question, studentAnswer, correctAnswer, maxPoints } = req.body;

    if (!question || !studentAnswer || !courseId || !moduleId || !lessonId) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    if (maxPoints <= 0) {
      return res.status(400).json({ error: 'maxPoints must be greater than 0' });
    }

    const evaluation = await evaluateSingleAnswer(
      courseId,
      moduleId,
      lessonId,
      question,
      studentAnswer,
      correctAnswer,
      maxPoints
    );

    return res.json({ evaluation });
  } catch (error: any) {
    console.error('Failed to evaluate answer:', error);
    return res.status(500).json({ 
      error: error.message || 'Failed to evaluate answer',
      details: error.message,
    });
  }
};

