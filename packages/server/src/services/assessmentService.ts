import { getFirestore } from '../config/firebaseAdmin';
import { randomUUID } from 'crypto';
import { getUserGraphById } from './graphService';
import type {
  Assessment,
  AssessmentQuestion,
  AssessmentSubmission,
  AssessmentAnswer,
  PublishedLesson,
} from '../types/publishing';
import { generateAssessmentQuestions, evaluateFreeTextAnswer } from '../operations';

/**
 * Get a lesson directly from Firestore (internal helper)
 */
async function getLessonFromFirestore(
  courseId: string,
  moduleId: string,
  lessonId: string
): Promise<PublishedLesson | null> {
  const lessonDoc = await getFirestore()
    .collection('courses').doc(courseId)
    .collection('modules').doc(moduleId)
    .collection('lessons').doc(lessonId)
    .get();

  if (!lessonDoc.exists) {
    return null;
  }

  const lesson = lessonDoc.data() as PublishedLesson;
  lesson.id = lessonDoc.id;
  return lesson;
}

/**
 * Create an assessment for a lesson
 */
export async function createAssessment(
  courseId: string,
  moduleId: string,
  lessonId: string,
  assessmentData: {
    title: string;
    description?: string;
    questions?: AssessmentQuestion[];
    passingScore?: number;
    maxAttempts?: number;
    timeLimit?: number;
    showResults?: boolean;
    randomizeQuestions?: boolean;
    autoGenerate?: boolean; // If true, generate questions using LLM
    numQuestions?: number;
    questionTypes?: ('multiple_choice' | 'true_false' | 'short_answer' | 'essay')[];
  }
): Promise<Assessment> {
  const {
    title,
    description,
    questions = [],
    passingScore = 70,
    maxAttempts,
    timeLimit,
    showResults = true,
    randomizeQuestions = false,
    autoGenerate = false,
    numQuestions = 5,
    questionTypes = ['multiple_choice', 'true_false', 'short_answer'],
  } = assessmentData;

  // Get lesson to access content and mentorId
  const lesson = await getLessonFromFirestore(courseId, moduleId, lessonId);
  if (!lesson) {
    throw new Error('Lesson not found');
  }

  // If auto-generate, fetch lesson content and generate questions
  let finalQuestions = questions;
  if (autoGenerate && questions.length === 0) {
    // Get the concept from the graph to access lesson content
    const graph = await getUserGraphById(lesson.mentorId, lesson.graphId);
    if (!graph || !graph.concepts) {
      throw new Error('Graph not found');
    }

    const concept = Object.values(graph.concepts).find(
      c => c.id === lesson.conceptId || c.name === lesson.conceptId
    );

    if (!concept || !concept.lesson) {
      throw new Error('Lesson content not found in concept');
    }

    // Get flash cards from lesson (which may have been enriched from concept) or fall back to concept
    const flashCards = lesson.flashCards || concept.flash || [];

    // Generate questions using LLM
    const generated = await generateAssessmentQuestions(concept, {
      numQuestions,
      questionTypes,
      specialInstructions: description, // Use description as special instructions for LLM
      flashCards: flashCards.map(fc => ({
        front: fc.front || '',
        back: fc.back || '',
      })),
    });

    finalQuestions = generated.questions.map((q, index) => ({
      ...q,
      id: q.id || `q${index + 1}`,
    }));
  }

  // Validate questions
  if (finalQuestions.length === 0) {
    throw new Error('Assessment must have at least one question');
  }

  const assessment: Assessment = {
    id: randomUUID(),
    courseId,
    moduleId,
    lessonId,
    mentorId: lesson.mentorId,
    title,
    description,
    questions: finalQuestions,
    passingScore,
    maxAttempts,
    timeLimit,
    showResults,
    randomizeQuestions,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  // Save to Firestore: courses/{courseId}/assessments/{assessmentId}
  await getFirestore()
    .collection('courses').doc(courseId)
    .collection('assessments').doc(assessment.id)
    .set(assessment);

  return assessment;
}

/**
 * Update an assessment
 */
export async function updateAssessment(
  courseId: string,
  assessmentId: string,
  updates: Partial<Assessment>
): Promise<Assessment> {
  const assessmentDoc = await getFirestore()
    .collection('courses').doc(courseId)
    .collection('assessments').doc(assessmentId)
    .get();

  if (!assessmentDoc.exists) {
    throw new Error('Assessment not found');
  }

  const assessment = assessmentDoc.data() as Assessment;

  const updatedAssessment: Assessment = {
    ...assessment,
    ...updates,
    updatedAt: Date.now(),
  };

  await getFirestore()
    .collection('courses').doc(courseId)
    .collection('assessments').doc(assessmentId)
    .set(updatedAssessment, { merge: true });

  return updatedAssessment;
}

/**
 * Get an assessment
 */
export async function getAssessment(
  courseId: string,
  assessmentId: string
): Promise<Assessment | null> {
  const assessmentDoc = await getFirestore()
    .collection('courses').doc(courseId)
    .collection('assessments').doc(assessmentId)
    .get();

  if (!assessmentDoc.exists) {
    return null;
  }

  const assessment = assessmentDoc.data() as Assessment;
  assessment.id = assessmentDoc.id;
  return assessment;
}

/**
 * Get assessment by lesson ID
 */
export async function getAssessmentByLessonId(
  courseId: string,
  lessonId: string
): Promise<Assessment | null> {
  const snapshot = await getFirestore()
    .collection('courses').doc(courseId)
    .collection('assessments')
    .where('lessonId', '==', lessonId)
    .limit(1)
    .get();

  if (snapshot.empty) {
    return null;
  }

  const assessment = snapshot.docs[0].data() as Assessment;
  assessment.id = snapshot.docs[0].id;
  return assessment;
}

/**
 * Delete an assessment
 */
export async function deleteAssessment(
  courseId: string,
  assessmentId: string
): Promise<void> {
  await getFirestore()
    .collection('courses').doc(courseId)
    .collection('assessments').doc(assessmentId)
    .delete();
}

/**
 * Get assessment by lesson ID (for students)
 */
export async function getAssessmentByLessonIdForStudent(
  courseId: string,
  lessonId: string
): Promise<Assessment | null> {
  return getAssessmentByLessonId(courseId, lessonId);
}

/**
 * Submit an assessment (student)
 */
export async function submitAssessment(
  courseId: string,
  assessmentId: string,
  studentUid: string,
  enrollmentId: string,
  lessonId: string,
  answers: AssessmentAnswer[]
): Promise<AssessmentSubmission> {
  // Get assessment
  const assessment = await getAssessment(courseId, assessmentId);
  
  if (!assessment) {
    throw new Error('Assessment not found');
  }

  // Check max attempts
  if (assessment.maxAttempts) {
    const previousSubmissions = await getFirestore()
      .collection('courses').doc(courseId)
      .collection('assessments').doc(assessmentId)
      .collection('submissions')
      .where('studentId', '==', studentUid)
      .where('enrollmentId', '==', enrollmentId)
      .get();

    if (previousSubmissions.size >= assessment.maxAttempts) {
      throw new Error(`Maximum attempts (${assessment.maxAttempts}) reached`);
    }
  }

  // Grade the assessment
  const gradedAnswers = await gradeAssessment(assessment, answers, courseId, assessment.moduleId, lessonId);

  // Calculate scores
  const totalPoints = assessment.questions.reduce((sum, q) => sum + q.points, 0);
  const earnedPoints = gradedAnswers.reduce((sum, a) => sum + (a.pointsEarned || 0), 0);
  const percentage = totalPoints > 0 ? (earnedPoints / totalPoints) * 100 : 0;
  const passed = percentage >= assessment.passingScore;

  const submission: AssessmentSubmission = {
    id: randomUUID(),
    assessmentId,
    enrollmentId,
    studentId: studentUid,
    lessonId,
    answers: gradedAnswers,
    score: earnedPoints,
    maxScore: totalPoints,
    percentage: Math.round(percentage * 10) / 10,
    passed,
    submittedAt: Date.now(),
    gradedAt: Date.now(),
  };

  // Save to Firestore: courses/{courseId}/assessments/{assessmentId}/submissions/{submissionId}
  await getFirestore()
    .collection('courses').doc(courseId)
    .collection('assessments').doc(assessmentId)
    .collection('submissions').doc(submission.id)
    .set(submission);

  return submission;
}

/**
 * Grade an assessment (internal function)
 */
async function gradeAssessment(
  assessment: Assessment,
  answers: AssessmentAnswer[],
  courseId: string,
  moduleId: string,
  lessonId: string
): Promise<AssessmentAnswer[]> {
  const gradedAnswers: AssessmentAnswer[] = [];

  // Get lesson content for context in essay evaluation
  let lessonContent = '';
  try {
    const lesson = await getLessonFromFirestore(courseId, moduleId, lessonId);
    if (lesson) {
      lessonContent = lesson.lessonContent || '';
    }
  } catch (error) {
    console.error('Error fetching lesson content for assessment:', error);
    // Continue without context
  }

  for (const answer of answers) {
    const question = assessment.questions.find(q => q.id === answer.questionId);
    
    if (!question) {
      // Question not found, mark as incorrect
      gradedAnswers.push({
        ...answer,
        isCorrect: false,
        pointsEarned: 0,
      });
      continue;
    }

    let isCorrect = false;
    let pointsEarned = 0;
    let feedback = '';

    // Grade based on question type
    if (question.type === 'multiple_choice' || question.type === 'true_false') {
      // Auto-grade multiple choice and true/false
      const studentAnswer = Array.isArray(answer.answer) 
        ? answer.answer[0] 
        : answer.answer;
      
      if (question.correctAnswers && Array.isArray(answer.answer)) {
        // Multiple correct answers
        const correctSet = new Set(question.correctAnswers.map(a => a.toLowerCase().trim()));
        const studentSet = new Set(answer.answer.map(a => String(a).toLowerCase().trim()));
        isCorrect = correctSet.size === studentSet.size && 
                   Array.from(correctSet).every(a => studentSet.has(a));
      } else {
        // Single correct answer
        const correct = (question.correctAnswer || '').toLowerCase().trim();
        const student = String(studentAnswer).toLowerCase().trim();
        isCorrect = correct === student;
      }

      pointsEarned = isCorrect ? question.points : 0;
      feedback = question.explanation || (isCorrect ? 'Correct!' : 'Incorrect.');
    } else if (question.type === 'short_answer' || question.type === 'essay') {
      // Use LLM to evaluate free-text answers
      const studentAnswerText = Array.isArray(answer.answer)
        ? answer.answer.join(' ')
        : String(answer.answer);

      try {
        const evaluation = await evaluateFreeTextAnswer({
          question: question.question,
          studentAnswer: studentAnswerText,
          correctAnswer: question.correctAnswer,
          maxPoints: question.points,
          context: lessonContent,
        });

        isCorrect = evaluation.isCorrect;
        pointsEarned = evaluation.score;
        feedback = evaluation.feedback;
      } catch (error) {
        console.error('Error evaluating free-text answer:', error);
        // Fallback: basic comparison
        const correct = (question.correctAnswer || '').toLowerCase().trim();
        const student = studentAnswerText.toLowerCase().trim();
        isCorrect = student.includes(correct) || correct.includes(student);
        pointsEarned = isCorrect ? question.points * 0.5 : 0; // Partial credit
        feedback = 'Automatic evaluation failed. Please review manually.';
      }
    }

    gradedAnswers.push({
      ...answer,
      isCorrect,
      pointsEarned,
      feedback,
    });
  }

  return gradedAnswers;
}

/**
 * Get assessment submission
 */
export async function getAssessmentSubmission(
  courseId: string,
  assessmentId: string,
  submissionId: string
): Promise<AssessmentSubmission | null> {
  const submissionDoc = await getFirestore()
    .collection('courses').doc(courseId)
    .collection('assessments').doc(assessmentId)
    .collection('submissions').doc(submissionId)
    .get();

  if (!submissionDoc.exists) {
    return null;
  }

  const submission = submissionDoc.data() as AssessmentSubmission;
  submission.id = submissionDoc.id;
  return submission;
}

/**
 * Get all submissions for an assessment
 */
export async function getAssessmentSubmissions(
  courseId: string,
  assessmentId: string,
  studentId?: string,
  enrollmentId?: string
): Promise<AssessmentSubmission[]> {
  let query = getFirestore()
    .collection('courses').doc(courseId)
    .collection('assessments').doc(assessmentId)
    .collection('submissions') as any;

  if (studentId) {
    query = query.where('studentId', '==', studentId);
  }

  if (enrollmentId) {
    query = query.where('enrollmentId', '==', enrollmentId);
  }

  const snapshot = await query.orderBy('submittedAt', 'desc').get();

  return snapshot.docs.map((doc: any) => {
    const submission = doc.data() as AssessmentSubmission;
    submission.id = doc.id;
    return submission;
  });
}

/**
 * Evaluate a single free-text answer (for immediate feedback)
 */
export async function evaluateSingleAnswer(
  courseId: string,
  moduleId: string,
  lessonId: string,
  question: string,
  studentAnswer: string,
  correctAnswer: string | undefined,
  maxPoints: number
): Promise<{
  score: number;
  percentage: number;
  feedback: string;
  isCorrect: boolean;
  strengths: string[];
  weaknesses: string[];
}> {
  // Get lesson content for context
  let lessonContent = '';
  try {
    const lesson = await getLessonFromFirestore(courseId, moduleId, lessonId);
    if (lesson) {
      lessonContent = lesson.lessonContent || '';
    }
  } catch (error) {
    console.error('Error fetching lesson content for evaluation:', error);
    // Continue without context
  }

  const evaluation = await evaluateFreeTextAnswer({
    question,
    studentAnswer,
    correctAnswer,
    maxPoints,
    context: lessonContent,
  });

  return {
    score: evaluation.score,
    percentage: evaluation.percentage,
    feedback: evaluation.feedback,
    isCorrect: evaluation.isCorrect,
    strengths: evaluation.strengths,
    weaknesses: evaluation.weaknesses,
  };
}

