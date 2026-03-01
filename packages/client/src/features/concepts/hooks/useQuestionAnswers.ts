import { useCallback } from 'react';
import { useAppDispatch } from '../../../app/hooks';
import { Concept, QuestionAnswer } from '../types';
import { updateConcept } from '../conceptSlice';

interface UseQuestionAnswersParams {
  concept: Concept | null | undefined;
}

interface UseQuestionAnswersReturn {
  questions: QuestionAnswer[];
  addQuestionAnswer: (
    question: string,
    answer: string,
    selectedText?: string,
    selectedTextChunks?: string[]
  ) => void;
}

/**
 * Hook for managing questions and answers on a concept
 * Handles adding new Q&A pairs
 */
export const useQuestionAnswers = ({
  concept,
}: UseQuestionAnswersParams): UseQuestionAnswersReturn => {
  const dispatch = useAppDispatch();

  const questions = concept?.questions || [];

  const addQuestionAnswer = useCallback(
    (
      question: string,
      answer: string,
      selectedText?: string,
      selectedTextChunks?: string[]
    ) => {
      if (!concept || !question.trim() || !answer.trim()) return;

      const newQuestionAnswer: QuestionAnswer = {
        question: question.trim(),
        answer: answer.trim(),
        selectedText,
        selectedTextChunks,
        highlightId: `q_${Date.now()}`, // Generate highlightId for questions
        timestamp: Date.now(),
      };

      const updatedQuestions = [...questions, newQuestionAnswer];
      const updatedConcept: Concept = {
        ...concept,
        questions: updatedQuestions,
      };

      dispatch(updateConcept(updatedConcept));
    },
    [concept, questions, dispatch]
  );

  return {
    questions,
    addQuestionAnswer,
  };
};

