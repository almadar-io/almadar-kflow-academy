import { useState, useCallback } from 'react';
import { codeRunnerAPI, type RunCodeSimulationResponse } from '../api/codeRunnerAPI';

export interface UseRunCodeSimulationReturn {
  output: RunCodeSimulationResponse | null;
  isRunning: boolean;
  error: string | null;
  run: (language: string, code: string, testCases?: Array<{ input: string; expectedOutput: string }>) => Promise<RunCodeSimulationResponse>;
  reset: () => void;
}

export const useRunCodeSimulation = (): UseRunCodeSimulationReturn => {
  const [output, setOutput] = useState<RunCodeSimulationResponse | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = useCallback(async (
    language: string,
    code: string,
    testCases?: Array<{ input: string; expectedOutput: string }>,
  ): Promise<RunCodeSimulationResponse> => {
    setIsRunning(true);
    setError(null);
    setOutput(null);

    try {
      const result = await codeRunnerAPI.runCodeSimulation({ language, code, testCases });
      setOutput(result);
      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to run code simulation';
      setError(message);
      throw err;
    } finally {
      setIsRunning(false);
    }
  }, []);

  const reset = useCallback(() => {
    setOutput(null);
    setError(null);
    setIsRunning(false);
  }, []);

  return {
    output,
    isRunning,
    error,
    run,
    reset,
  };
};
