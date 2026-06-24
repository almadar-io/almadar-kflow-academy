import type { AssessmentSubmissionNodeProperties } from '@almadar-io/knowledge';
import { accessLayer } from './studentDataAccess';
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

function calculateStartingLayer(assessedLevel: 'beginner' | 'intermediate' | 'advanced'): number {
  switch (assessedLevel) {
    case 'beginner': return 1;
    case 'intermediate': return 2;
    case 'advanced': return 3;
    default: return 1;
  }
}

export function assessLevel(test: PlacementTest): PlacementTestResult {
  const beginnerScore = calculateScoreForDifficulty(test, 'beginner');
  const intermediateScore = calculateScoreForDifficulty(test, 'intermediate');
  const advancedScore = calculateScoreForDifficulty(test, 'advanced');

  let assessedLevel: 'beginner' | 'intermediate' | 'advanced';
  if (advancedScore >= 0.6) {
    assessedLevel = 'advanced';
  } else if (intermediateScore >= 0.7) {
    assessedLevel = 'intermediate';
  } else {
    assessedLevel = 'beginner';
  }

  const totalQuestions = test.questions.length;
  const correctAnswers = test.answers.filter(a => a.isCorrect).length;
  const overallScore = totalQuestions > 0 ? (correctAnswers / totalQuestions) * 100 : 0;
  const confidence = Math.min(1, test.answers.length / Math.max(1, test.questions.length));
  const recommendedStartingLayer = calculateStartingLayer(assessedLevel);

  return {
    test: { ...test, assessedLevel, score: overallScore, completedAt: Date.now() },
    assessedLevel,
    recommendedStartingLayer,
    confidence,
    beginnerScore,
    intermediateScore,
    advancedScore,
  };
}

function testToSubmissionData(test: PlacementTest, status: string): Omit<AssessmentSubmissionNodeProperties, 'id' | 'createdAt' | 'updatedAt'> {
  const correctAnswers = test.answers.filter(a => a.isCorrect).length;
  const totalQuestions = Math.max(1, test.questions.length);
  const score = correctAnswers;
  const maxScore = totalQuestions;
  const percentage = (score / maxScore) * 100;
  return {
    answers: test.answers.map(a => ({ questionId: a.questionId, answer: a.answer, isCorrect: a.isCorrect })),
    score,
    maxScore,
    percentage,
    passed: status === 'completed' && percentage >= 60,
    attempts: 1,
    submittedAt: status === 'completed' ? (test.completedAt ?? Date.now()) : Date.now(),
  };
}

function submissionNodeToTest(testId: string, node: AssessmentSubmissionNodeProperties, graphId: string): PlacementTest {
  const answers: PlacementAnswer[] = node.answers.map(a => ({
    questionId: a.questionId,
    answer: a.answer,
    isCorrect: a.isCorrect ?? false,
    answeredAt: node.submittedAt,
  }));
  return {
    id: testId,
    graphId: node.sourceGraphId ?? graphId,
    goalId: '',
    userId: '',
    topic: '',
    questions: [],
    answers,
    assessedLevel: null,
    score: node.percentage,
    completedAt: node.submittedAt,
    createdAt: node.createdAt,
    updatedAt: node.updatedAt,
  };
}

export async function createPlacementTest(options: CreatePlacementTestOptions): Promise<PlacementTest> {
  const { goalId, graphId, topic, uid } = options;
  const testId = generateConceptId();

  const test: PlacementTest = {
    id: testId,
    graphId,
    goalId,
    userId: uid,
    topic,
    questions: [],
    answers: [],
    assessedLevel: null,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  await accessLayer.recordSubmission(uid, graphId, uid, testId, {
    ...testToSubmissionData(test, 'pending'),
    sourceGraphId: graphId,
  });

  return test;
}

export async function getPlacementTestById(uid: string, testId: string, graphId: string = ''): Promise<PlacementTest | null> {
  const submissions = await accessLayer.listSubmissions(uid);
  const match = submissions.find(s => s.id === testId);
  if (!match) return null;
  return submissionNodeToTest(testId, match, graphId);
}

export async function updatePlacementTestQuestions(
  uid: string,
  testId: string,
  questions: PlacementQuestion[],
  graphId: string = ''
): Promise<PlacementTest> {
  const test = await getPlacementTestById(uid, testId, graphId);
  if (!test) throw new Error('Placement test not found after update');

  const updated: PlacementTest = { ...test, questions, updatedAt: Date.now() };
  await accessLayer.recordSubmission(uid, test.graphId, uid, testId, {
    ...testToSubmissionData(updated, 'in_progress'),
    sourceGraphId: test.graphId,
  });

  return updated;
}

export async function submitPlacementTest(options: SubmitPlacementTestOptions & { graphId?: string }): Promise<PlacementTestResult> {
  const { testId, answers, uid, graphId = '' } = options;

  const test = await getPlacementTestById(uid, testId, graphId);
  if (!test) throw new Error('Placement test not found');

  const validatedAnswers: PlacementAnswer[] = answers.map(answer => {
    const question = test.questions.find(q => q.id === answer.questionId);
    if (!question) throw new Error(`Question ${answer.questionId} not found in test`);

    let isCorrect = false;
    if (Array.isArray(question.correctAnswer)) {
      const answerArray = Array.isArray(answer.answer) ? answer.answer : [answer.answer];
      isCorrect = question.correctAnswer.every(correct =>
        answerArray.some(a => String(a).toLowerCase().trim() === String(correct).toLowerCase().trim())
      );
    } else {
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

  const updatedTest = { ...test, answers: validatedAnswers };
  const result = assessLevel(updatedTest);

  await accessLayer.recordSubmission(uid, test.graphId, uid, testId, {
    ...testToSubmissionData({ ...updatedTest, assessedLevel: result.assessedLevel, score: result.test.score, completedAt: result.test.completedAt }, 'completed'),
    sourceGraphId: test.graphId,
  });

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
  }

  return result;
}

export async function getUserPlacementTests(uid: string, graphId: string = ''): Promise<PlacementTest[]> {
  const submissions = await accessLayer.listSubmissions(uid);
  return submissions
    .map(s => submissionNodeToTest(s.id, s, graphId))
    .sort((a, b) => b.createdAt - a.createdAt);
}

export async function getPlacementTestsByGoalId(uid: string, goalId: string, graphId: string = ''): Promise<PlacementTest[]> {
  const all = await getUserPlacementTests(uid, graphId);
  return all.filter(t => t.goalId === goalId).sort((a, b) => b.createdAt - a.createdAt);
}

export async function deletePlacementTest(uid: string, testId: string, graphId: string = ''): Promise<void> {
  const existing = await getPlacementTestById(uid, testId, graphId);
  if (!existing) return;
  await accessLayer.recordSubmission(uid, existing.graphId, uid, testId, {
    answers: [],
    score: 0,
    maxScore: 0,
    percentage: 0,
    passed: false,
    submittedAt: Date.now(),
    sourceGraphId: existing.graphId,
  });
}
