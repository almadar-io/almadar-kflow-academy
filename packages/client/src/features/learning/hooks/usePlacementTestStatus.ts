/**
 * Hook for checking placement test status for a learning goal
 */

import { useState, useEffect } from 'react';
import { getUserGoals, getGoalById } from '../goalApi';
import { placementTestApi } from '../placementTestApi';
import type { LearningGoal } from '../goalApi';
import { createLogger } from '@almadar/logger';

const log = createLogger('kflow:client:learning:usePlacementTestStatus');

interface UsePlacementTestStatusOptions {
  graphId?: string;
  goalId?: string; // Optional: if you already have the goal ID
}

interface UsePlacementTestStatusResult {
  goal: LearningGoal | null;
  hasCompletedPlacementTest: boolean;
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

/**
 * Hook to check placement test completion status for a learning goal
 * Can be used with either graphId or goalId
 */
export function usePlacementTestStatus(
  options: UsePlacementTestStatusOptions
): UsePlacementTestStatusResult {
  const { graphId, goalId } = options;
  const [goal, setGoal] = useState<LearningGoal | null>(null);
  const [hasCompletedPlacementTest, setHasCompletedPlacementTest] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const checkPlacementTest = async () => {
    setIsLoading(true);
    setError(null);

    try {
      let primaryGoal: LearningGoal | null = null;

      if (goalId) {
        // If goalId is provided, fetch goal directly
        const response = await getGoalById(goalId);
        primaryGoal = response.goal;
      } else if (graphId) {
        // If graphId is provided, fetch goals for that graph
        const goalsResponse = await getUserGoals(graphId);
        const goals = goalsResponse.goals;
        if (goals.length > 0) {
          primaryGoal = goals[0];
        }
      }

      if (!primaryGoal) {
        setGoal(null);
        setHasCompletedPlacementTest(false);
        setIsLoading(false);
        return;
      }

      setGoal(primaryGoal);

      // Check if placement test is completed
      if (primaryGoal.placementTestId) {
        try {
          const testsResponse = await placementTestApi.getTestsByGoal(primaryGoal.id);
          const completedTest = testsResponse.tests.find(t => t.completedAt);
          setHasCompletedPlacementTest(!!completedTest);
        } catch (testError) {
          log.error('Error checking placement test', { error: testError instanceof Error ? testError.message : String(testError) });
          // If we can't check the test, assume it's not completed
          setHasCompletedPlacementTest(false);
        }
      } else {
        // No placement test ID means test hasn't been taken
        setHasCompletedPlacementTest(false);
      }
    } catch (err) {
      log.error('Error fetching goals', { error: err instanceof Error ? err.message : String(err) });
      setError(err instanceof Error ? err.message : 'Failed to check placement test status');
      setGoal(null);
      setHasCompletedPlacementTest(false);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (graphId || goalId) {
      checkPlacementTest();
    } else {
      setIsLoading(false);
    }
  }, [graphId, goalId]);

  return {
    goal,
    hasCompletedPlacementTest,
    isLoading,
    error,
    refresh: checkPlacementTest,
  };
}

