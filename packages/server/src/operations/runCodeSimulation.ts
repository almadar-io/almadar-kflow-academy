import { callLLM } from '../services/llm';
import { systemPrompt, buildUserPrompt } from '../prompts/templates/runCodeSimulation';
import type {
  RunCodeSimulationRequest,
  RunCodeSimulationResponse,
  RunCodeSimulationTestResult,
} from '../types';

export interface RunCodeSimulationOptions {
  uid?: string;
}

interface SimulationJson {
  stdout?: string;
  stderr?: string;
  exitCode?: number;
  testResults?: Array<{ input?: string; expectedOutput?: string; actualOutput?: string; passed?: boolean }>;
}

function extractJson(content: string): SimulationJson {
  const trimmed = content.trim();

  // Try to find a JSON object wrapped in markdown code fences.
  const fencedMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fencedMatch) {
    try {
      return JSON.parse(fencedMatch[1].trim()) as SimulationJson;
    } catch {
      // Fall through to direct parse attempt.
    }
  }

  // Try to find the first JSON object in the text.
  const objectMatch = trimmed.match(/\{[\s\S]*\}/);
  if (objectMatch) {
    try {
      return JSON.parse(objectMatch[0]) as SimulationJson;
    } catch {
      // Fall through.
    }
  }

  throw new Error('Could not extract valid JSON from LLM response');
}

function normalizeTestResults(
  raw: SimulationJson['testResults'],
  testCases: RunCodeSimulationRequest['testCases'],
): RunCodeSimulationTestResult[] {
  if (!Array.isArray(raw)) {
    return [];
  }

  return raw.map((item, index) => {
    const provided = testCases?.[index];
    return {
      input: typeof item?.input === 'string' ? item.input : provided?.input ?? '',
      expectedOutput:
        typeof item?.expectedOutput === 'string'
          ? item.expectedOutput
          : provided?.expectedOutput ?? '',
      actualOutput: typeof item?.actualOutput === 'string' ? item.actualOutput : '',
      passed: item?.passed === true,
    };
  });
}

export async function runCodeSimulation(
  request: RunCodeSimulationRequest,
  options: RunCodeSimulationOptions = {},
): Promise<RunCodeSimulationResponse> {
  const { language, code, testCases = [] } = request;

  if (!language || !code) {
    throw new Error('Language and code are required');
  }

  const userPrompt = buildUserPrompt(language, code, testCases);

  const response = await callLLM({
    systemPrompt,
    userPrompt,
    provider: 'deepseek',
    model: 'deepseek-chat',
    uid: options.uid,
  });

  const parsed = extractJson(response.content);

  return {
    stdout: typeof parsed.stdout === 'string' ? parsed.stdout : '',
    stderr: typeof parsed.stderr === 'string' ? parsed.stderr : '',
    exitCode: typeof parsed.exitCode === 'number' ? parsed.exitCode : 1,
    testResults: normalizeTestResults(parsed.testResults, testCases),
  };
}
