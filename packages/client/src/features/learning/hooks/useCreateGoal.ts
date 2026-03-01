/**
 * @deprecated This hook is deprecated. Use features/mentor/components/MentorGoalForm instead.
 * This hook uses the old goal API and will be removed in a future version.
 */

import { useState, useCallback } from 'react';
import {
  createGoal,
  createGraphWithGoal,
  type CreateGoalRequest,
  type CreateGraphWithGoalRequest,
  type CreateGoalResponse,
  type CreateGraphWithGoalResponse,
} from '../goalApi';

export function useCreateGoal() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [goal, setGoal] = useState<CreateGoalResponse | null>(null);
  const [streamingContent, setStreamingContent] = useState('');
  const [partialGoal, setPartialGoal] = useState<any>(null);

  const create = useCallback(async (
    request: CreateGoalRequest,
    onStream?: (chunk: string, partialGoal: any) => void
  ) => {
    setIsLoading(true);
    setError(null);
    setStreamingContent('');
    setPartialGoal(null);

    try {
      const response = await createGoal(
        { ...request, stream: !!onStream },
        (chunk: string, partial: any) => {
          setStreamingContent(prev => prev + chunk);
          setPartialGoal(partial);
          onStream?.(chunk, partial);
        }
      );
      setGoal(response);
      setStreamingContent('');
      setPartialGoal(null);
      return response;
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to create goal';
      setError(errorMessage);
      setStreamingContent('');
      setPartialGoal(null);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const createWithGraph = useCallback(async (
    request: CreateGraphWithGoalRequest,
    onStream?: (chunk: string, partialGoal: any) => void
  ) => {
    setIsLoading(true);
    setError(null);
    setStreamingContent('');
    setPartialGoal(null);

    try {
      const response = await createGraphWithGoal(
        { ...request, stream: !!onStream },
        (chunk: string, partial: any) => {
          setStreamingContent(prev => prev + chunk);
          setPartialGoal(partial);
          onStream?.(chunk, partial);
        }
      );
      setGoal({ goal: response.goal, model: undefined });
      setStreamingContent('');
      setPartialGoal(null);
      return response;
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to create graph with goal';
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
    create,
    createWithGraph,
    reset,
  };
}

