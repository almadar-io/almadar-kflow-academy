/**
 * Hook for managing placement test state and operations
 */

import { useState } from 'react';
import { placementTestApi } from '../placementTestApi';
import type {
  PlacementTest,
  PlacementQuestion,
  PlacementAnswer,
  PlacementTestResult,
} from '@/types/server/placementTest';

interface UsePlacementTestOptions {
  goalId?: string;
  graphId?: string;
  topic?: string;
}

export function usePlacementTest(options: UsePlacementTestOptions = {}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [test, setTest] = useState<PlacementTest | null>(null);
  const [questions, setQuestions] = useState<PlacementQuestion[]>([]);
  const [result, setResult] = useState<PlacementTestResult | null>(null);

  /**
   * Generate placement test questions
   */
  const generateQuestions = async () => {
    if (!options.goalId || !options.graphId || !options.topic) {
      setError('goalId, graphId, and topic are required');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await placementTestApi.generateQuestions({
        goalId: options.goalId,
        graphId: options.graphId,
        topic: options.topic,
      });
      setQuestions(response.questions);
      return response.questions;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to generate questions';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Create a new placement test
   */
  const createTest = async () => {
    if (!options.goalId || !options.graphId || !options.topic) {
      setError('goalId, graphId, and topic are required');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await placementTestApi.createTest({
        goalId: options.goalId,
        graphId: options.graphId,
        topic: options.topic,
      });
      setTest(response.test);
      return response.test;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create test';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Update test with generated questions
   * @param testQuestions - Questions to add to the test
   * @param testId - Optional test ID (if not provided, uses test from state)
   */
  const updateTestQuestions = async (testQuestions: PlacementQuestion[], testId?: string) => {
    const targetTestId = testId || test?.id;
    if (!targetTestId) {
      setError('Test not created yet');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await placementTestApi.updateTestQuestions(targetTestId, testQuestions);
      setTest(response.test);
      setQuestions(testQuestions);
      return response.test;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update test questions';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Submit test answers and get results
   */
  const submitTest = async (answers: PlacementAnswer[]) => {
    if (!test?.id) {
      setError('Test not created yet');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await placementTestApi.submitTest(test.id, answers);
      setResult(response.result);
      setTest(response.result.test);
      return response.result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to submit test';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Load an existing test
   */
  const loadTest = async (testId: string) => {
    setLoading(true);
    setError(null);

    try {
      const response = await placementTestApi.getTest(testId);
      setTest(response.test);
      setQuestions(response.test.questions);
      if (response.test.assessedLevel) {
        // Test was already completed, create result object
        const result: PlacementTestResult = {
          test: response.test,
          assessedLevel: response.test.assessedLevel,
          recommendedStartingLayer: undefined, // Would need to recalculate from test
          confidence: response.test.answers.length / Math.max(1, response.test.questions.length),
          beginnerScore: 0, // Would need to recalculate
          intermediateScore: 0,
          advancedScore: 0,
        };
        setResult(result);
      }
      return response.test;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load test';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return {
    test,
    questions,
    result,
    loading,
    error,
    generateQuestions,
    createTest,
    updateTestQuestions,
    submitTest,
    loadTest,
  };
}

