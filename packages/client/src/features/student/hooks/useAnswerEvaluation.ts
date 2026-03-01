import { useState } from 'react';
import { enrollmentApi } from '../enrollmentApi';

export interface AnswerEvaluation {
  score: number;
  percentage: number;
  feedback: string;
  isCorrect: boolean;
  strengths: string[];
  weaknesses: string[];
  isLoading: boolean;
}

interface UseAnswerEvaluationOptions {
  courseId: string;
  moduleId: string;
  lessonId: string;
}

export function useAnswerEvaluation({ courseId, moduleId, lessonId }: UseAnswerEvaluationOptions) {
  const [evaluations, setEvaluations] = useState<Record<string, AnswerEvaluation>>({});

  const evaluateAnswer = async (
    questionId: string,
    question: string,
    studentAnswer: string,
    correctAnswer: string | undefined,
    maxPoints: number
  ) => {
    // Set loading state
    setEvaluations(prev => ({
      ...prev,
      [questionId]: {
        score: 0,
        percentage: 0,
        feedback: '',
        isCorrect: false,
        strengths: [],
        weaknesses: [],
        isLoading: true,
      },
    }));

    try {
      const result = await enrollmentApi.evaluateAnswer(
        courseId,
        moduleId,
        lessonId,
        question,
        studentAnswer,
        correctAnswer,
        maxPoints
      );

      if (result.evaluation) {
        setEvaluations(prev => ({
          ...prev,
          [questionId]: {
            ...result.evaluation,
            isLoading: false,
          },
        }));
      }
    } catch (error: any) {
      console.error('Failed to evaluate answer:', error);
      setEvaluations(prev => ({
        ...prev,
        [questionId]: {
          score: 0,
          percentage: 0,
          feedback: 'Failed to evaluate answer. Please try again.',
          isCorrect: false,
          strengths: [],
          weaknesses: [],
          isLoading: false,
        },
      }));
    }
  };

  const clearEvaluation = (questionId: string) => {
    setEvaluations(prev => {
      const next = { ...prev };
      delete next[questionId];
      return next;
    });
  };

  return {
    evaluations,
    evaluateAnswer,
    clearEvaluation,
  };
}

