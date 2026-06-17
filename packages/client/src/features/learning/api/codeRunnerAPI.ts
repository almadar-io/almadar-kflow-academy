import { apiClient } from '../../../services/apiClient';

export interface RunCodeSimulationRequest {
  language: string;
  code: string;
  testCases?: Array<{ input: string; expectedOutput: string }>;
}

export interface RunCodeSimulationTestResult {
  input: string;
  expectedOutput: string;
  actualOutput: string;
  passed: boolean;
}

export interface RunCodeSimulationResponse {
  stdout: string;
  stderr: string;
  exitCode: number;
  testResults: RunCodeSimulationTestResult[];
}

export const codeRunnerAPI = {
  runCodeSimulation: async (request: RunCodeSimulationRequest): Promise<RunCodeSimulationResponse> => {
    return apiClient.fetch('/api/run-code-simulation', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  },
};
