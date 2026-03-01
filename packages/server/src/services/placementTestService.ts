/**
 * Service for managing placement tests and level assessment
 */

import { getFirestore } from '../config/firebaseAdmin';
import type {
  PlacementTest,
  PlacementQuestion,
  PlacementAnswer,
  PlacementTestResult,
  CreatePlacementTestOptions,
  SubmitPlacementTestOptions,
} from '../types/placementTest';
import { generateConceptId } from '../utils/uuid';
import { getGoalById, updateGoal } from './goalService';
import type { LearningGoal } from '../types/goal';

/**
 * Calculate score for a specific difficulty level
 */
function calculateScoreForDifficulty(
  test: PlacementTest,
  difficulty: 'beginner' | 'intermediate' | 'advanced'
): number {
  const difficultyQuestions = test.questions.filter(q => q.difficulty === difficulty);
  if (difficultyQuestions.length === 0) return 0;

  const difficultyAnswers = test.answers.filter(a => {
    const question = test.questions.find(q => q.id === a.questionId);
    return question?.difficulty === difficulty;
  });

  if (difficultyAnswers.length === 0) return 0;

  const correctCount = difficultyAnswers.filter(a => a.isCorrect).length;
  return correctCount / difficultyQuestions.length;
}

/**
 * Calculate recommended starting layer based on assessed level
 */
function calculateStartingLayer(
  assessedLevel: 'beginner' | 'intermediate' | 'advanced'
): number {
  // Simple logic: beginner starts at 1, intermediate at 2, advanced at 3
  switch (assessedLevel) {
    case 'beginner':
      return 1;
    case 'intermediate':
      return 2;
    case 'advanced':
      return 3;
    default:
      return 1;
  }
}

/**
 * Assess learner's level based on placement test results
 */
export function assessLevel(test: PlacementTest): PlacementTestResult {
  const beginnerScore = calculateScoreForDifficulty(test, 'beginner');
  const intermediateScore = calculateScoreForDifficulty(test, 'intermediate');
  const advancedScore = calculateScoreForDifficulty(test, 'advanced');

  // Determine level based on scores
  let assessedLevel: 'beginner' | 'intermediate' | 'advanced';
  if (advancedScore >= 0.6) {
    assessedLevel = 'advanced';
  } else if (intermediateScore >= 0.7) {
    assessedLevel = 'intermediate';
  } else if (beginnerScore >= 0.8) {
    assessedLevel = 'beginner';
  } else {
    assessedLevel = 'beginner'; // Default to beginner if scores are low
  }

  // Calculate overall score
  const totalQuestions = test.questions.length;
  const correctAnswers = test.answers.filter(a => a.isCorrect).length;
  const overallScore = totalQuestions > 0 ? (correctAnswers / totalQuestions) * 100 : 0;

  // Calculate confidence based on number of questions answered
  const confidence = Math.min(1, test.answers.length / Math.max(1, test.questions.length));

  // Calculate recommended starting layer
  const recommendedStartingLayer = calculateStartingLayer(assessedLevel);

  return {
    test: {
      ...test,
      assessedLevel,
      score: overallScore,
      completedAt: Date.now(),
    },
    assessedLevel,
    recommendedStartingLayer,
    confidence,
    beginnerScore,
    intermediateScore,
    advancedScore,
  };
}

/**
 * Create a new placement test
 */
export async function createPlacementTest(
  options: CreatePlacementTestOptions
): Promise<PlacementTest> {
  const { goalId, graphId, topic, uid } = options;

  const db = getFirestore();
  const testId = generateConceptId();

  const test: PlacementTest = {
    id: testId,
    graphId,
    goalId,
    userId: uid,
    topic,
    questions: [], // Will be populated by generatePlacementQuestions
    answers: [],
    assessedLevel: null,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  const testRef = db
    .collection('placementTests')
    .doc(uid)
    .collection('tests')
    .doc(testId);

  await testRef.set(test);

  return test;
}

/**
 * Get a placement test by ID
 */
export async function getPlacementTestById(
  uid: string,
  testId: string
): Promise<PlacementTest | null> {
  const db = getFirestore();
  const testDoc = await db
    .collection('placementTests')
    .doc(uid)
    .collection('tests')
    .doc(testId)
    .get();

  if (!testDoc.exists) {
    return null;
  }

  return {
    id: testDoc.id,
    ...testDoc.data(),
  } as PlacementTest;
}

/**
 * Update placement test with questions
 */
export async function updatePlacementTestQuestions(
  uid: string,
  testId: string,
  questions: PlacementQuestion[]
): Promise<PlacementTest> {
  const db = getFirestore();
  const testRef = db
    .collection('placementTests')
    .doc(uid)
    .collection('tests')
    .doc(testId);

  await testRef.update({
    questions,
    updatedAt: Date.now(),
  });

  const updatedTest = await getPlacementTestById(uid, testId);
  if (!updatedTest) {
    throw new Error('Placement test not found after update');
  }

  return updatedTest;
}

/**
 * Submit placement test answers and get assessment results
 */
export async function submitPlacementTest(
  options: SubmitPlacementTestOptions
): Promise<PlacementTestResult> {
  const { testId, answers, uid } = options;

  // Get the test
  const test = await getPlacementTestById(uid, testId);
  if (!test) {
    throw new Error('Placement test not found');
  }

  // Validate answers against questions
  const validatedAnswers: PlacementAnswer[] = answers.map(answer => {
    const question = test.questions.find(q => q.id === answer.questionId);
    if (!question) {
      throw new Error(`Question ${answer.questionId} not found in test`);
    }

    // Check if answer is correct
    let isCorrect = false;
    if (Array.isArray(question.correctAnswer)) {
      // Multiple correct answers
      const answerArray = Array.isArray(answer.answer) ? answer.answer : [answer.answer];
      isCorrect = question.correctAnswer.every(correct =>
        answerArray.some(a => String(a).toLowerCase().trim() === String(correct).toLowerCase().trim())
      );
    } else {
      // Single correct answer
      const answerStr = Array.isArray(answer.answer) ? answer.answer[0] : answer.answer;
      isCorrect = String(answerStr).toLowerCase().trim() === String(question.correctAnswer).toLowerCase().trim();
    }

    return {
      questionId: answer.questionId,
      answer: answer.answer,
      isCorrect,
      answeredAt: answer.answeredAt || Date.now(),
    };
  });

  // Update test with answers
  const db = getFirestore();
  const testRef = db
    .collection('placementTests')
    .doc(uid)
    .collection('tests')
    .doc(testId);

  await testRef.update({
    answers: validatedAnswers,
    updatedAt: Date.now(),
  });

  // Assess the test
  const updatedTest = {
    ...test,
    answers: validatedAnswers,
  };
  const result = assessLevel(updatedTest);

  // Update the test with assessment results
  await testRef.update({
    assessedLevel: result.assessedLevel,
    score: result.test.score,
    completedAt: result.test.completedAt,
    updatedAt: Date.now(),
  });

  // Update learning goal with assessment results
  try {
    const goal = await getGoalById(uid, test.goalId);
    if (goal) {
      const updatedGoal: Partial<LearningGoal> = {
        assessedLevel: result.assessedLevel,
        placementTestId: testId,
        updatedAt: Date.now(),
      };
      await updateGoal(uid, test.goalId, updatedGoal);
    }
  } catch (error) {
    console.error('Error updating goal with assessment results:', error);
    // Don't fail the test submission if goal update fails
  }

  return result;
}

/**
 * Get all placement tests for a user
 */
export async function getUserPlacementTests(uid: string): Promise<PlacementTest[]> {
  const db = getFirestore();
  const snapshot = await db
    .collection('placementTests')
    .doc(uid)
    .collection('tests')
    .orderBy('createdAt', 'desc')
    .get();

  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
  })) as PlacementTest[];
}

/**
 * Get placement tests for a specific goal
 */
export async function getPlacementTestsByGoalId(
  uid: string,
  goalId: string
): Promise<PlacementTest[]> {
  const db = getFirestore();
  const snapshot = await db
    .collection('placementTests')
    .doc(uid)
    .collection('tests')
    .where('goalId', '==', goalId)
    .orderBy('createdAt', 'desc')
    .get();

  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
  })) as PlacementTest[];
}

/**
 * Delete a placement test
 */
export async function deletePlacementTest(uid: string, testId: string): Promise<void> {
  const db = getFirestore();
  await db
    .collection('placementTests')
    .doc(uid)
    .collection('tests')
    .doc(testId)
    .delete();
}

