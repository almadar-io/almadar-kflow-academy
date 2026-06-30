import { jest, describe, beforeEach, it, expect } from '@jest/globals';
import { runCodeSimulation } from '../../operations/runCodeSimulation';
import { callLLM } from '../../services/llm';

jest.mock('../../services/llm', () => ({
  callLLM: jest.fn(),
  extractJSONArray: jest.fn((content: string) => {
    try {
      return JSON.parse(content);
    } catch {
      return [];
    }
  }),
}));

describe('runCodeSimulation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.ALMADAR_API_KEY = 'sk_test_key';
    process.env.ALMADAR_BASE_URL = 'http://localhost:3999';
  });

  it('should parse a clean JSON response', async () => {
    (callLLM as jest.Mock).mockResolvedValue({
      content: JSON.stringify({
        stdout: 'hello\n',
        stderr: '',
        exitCode: 0,
        testResults: [],
      }),
      model: 'deepseek-chat',
    });

    const result = await runCodeSimulation({
      language: 'python',
      code: 'print("hello")',
    });

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toBe('hello\n');
    expect(result.stderr).toBe('');
    expect(result.testResults).toEqual([]);
  });

  it('should extract JSON from markdown fences', async () => {
    (callLLM as jest.Mock).mockResolvedValue({
      content: '```json\n' + JSON.stringify({
        stdout: '42',
        stderr: '',
        exitCode: 0,
        testResults: [],
      }) + '\n```',
      model: 'deepseek-chat',
    });

    const result = await runCodeSimulation({
      language: 'javascript',
      code: 'console.log(42)',
    });

    expect(result.stdout).toBe('42');
    expect(result.exitCode).toBe(0);
  });

  it('should normalize test results', async () => {
    (callLLM as jest.Mock).mockResolvedValue({
      content: JSON.stringify({
        stdout: '',
        stderr: '',
        exitCode: 0,
        testResults: [
          {
            input: '[1, 2]',
            expectedOutput: '3',
            actualOutput: '3',
            passed: true,
          },
        ],
      }),
      model: 'deepseek-chat',
    });

    const result = await runCodeSimulation({
      language: 'python',
      code: 'def add(a, b): return a + b',
      testCases: [{ input: '[1, 2]', expectedOutput: '3' }],
    });

    expect(result.testResults).toHaveLength(1);
    expect(result.testResults[0].passed).toBe(true);
    expect(result.testResults[0].input).toBe('[1, 2]');
  });

  it('should throw on malformed JSON response', async () => {
    (callLLM as jest.Mock).mockResolvedValue({
      content: 'not valid json',
      model: 'deepseek-chat',
    });

    await expect(
      runCodeSimulation({ language: 'python', code: 'print(1)' }),
    ).rejects.toThrow('Could not extract valid JSON from LLM response');
  });

  it('should throw when language or code is missing', async () => {
    await expect(
      runCodeSimulation({ language: '', code: 'print(1)' }),
    ).rejects.toThrow('Language and code are required');

    await expect(
      runCodeSimulation({ language: 'python', code: '' }),
    ).rejects.toThrow('Language and code are required');
  });

});
