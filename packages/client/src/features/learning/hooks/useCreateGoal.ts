/**
 * @deprecated This hook is deprecated. Use features/mentor/components/MentorGoalForm instead.
 * This hook uses the old goal API and will be removed in a future version.
 */

import { useState, useCallback } from 'react';
import {
  createGraphWithGoal,
  type CreateGraphWithGoalRequest,
  type CreateGoalResponse,
  type CreateGraphWithGoalResponse,
  type LearningGoal,
} from '../goalApi';

type PartialGoal = Partial<LearningGoal>;

export function useCreateGoal() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [goal, setGoal] = useState<CreateGoalResponse | null>(null);
  const [streamingContent, setStreamingContent] = useState('');
  const [partialGoal, setPartialGoal] = useState<PartialGoal | null>(null);

  const createWithGraph = useCallback(async (
    request: CreateGraphWithGoalRequest,
    onStream?: (chunk: string, partialGoal: PartialGoal) => void
  ) => {
    setIsLoading(true);
    setError(null);
    setStreamingContent('');
    setPartialGoal(null);

    try {
      const response = await createGraphWithGoal(
        { ...request, stream: !!onStream },
        (chunk: string, partial: PartialGoal) => {
          setStreamingContent(prev => prev + chunk);
          setPartialGoal(partial);
          onStream?.(chunk, partial);
        }
      );
      setGoal({ goal: response.goal, model: undefined });
      setStreamingContent('');
      setPartialGoal(null);
      return response;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create graph with goal';
      setError(errorMessage);
      setStreamingContent('');
      setPartialGoal(null);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const reset = useCallback(() => {
    setGoal(null);
    setError(null);
    setIsLoading(false);
    setStreamingContent('');
    setPartialGoal(null);
  }, []);

  return {
    goal,
    isLoading,
    error,
    streamingContent,
    partialGoal,
    createWithGraph,
    reset,
  };
}

