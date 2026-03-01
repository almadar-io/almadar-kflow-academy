/**
 * @deprecated This hook is deprecated. Use features/mentor/components/MentorGoalForm instead.
 * This hook uses the old goal API and will be removed in a future version.
 */

import { useState, useCallback } from 'react';
import {
  generateGoalQuestions,
  type GenerateGoalQuestionsRequest,
  type GenerateGoalQuestionsResponse,
} from '../goalApi';

export function useGoalQuestions() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [questions, setQuestions] = useState<GenerateGoalQuestionsResponse | null>(null);

  const generateQuestions = useCallback(async (request: GenerateGoalQuestionsRequest) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await generateGoalQuestions(request);
      setQuestions(response);
      return response;
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to generate goal questions';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const reset = useCallback(() => {
    setQuestions(null);
    setError(null);
    setIsLoading(false);
  }, []);

  return {
    questions,
    isLoading,
    error,
    generateQuestions,
    reset,
  };
}

