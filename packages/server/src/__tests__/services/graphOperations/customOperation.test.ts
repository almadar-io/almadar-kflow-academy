/**
 * Smoke tests for operations/customOperation export.
 */

import { customOperation } from '../../../operations/customOperation';

jest.mock('../../../services/llm', () => ({
  callLLM: jest.fn(),
  extractJSONArray: jest.fn((content: string) => {
    try {
      return JSON.parse(content);
    } catch {
      return [];
    }
  }),
}));

describe('customOperation', () => {
  it('is exported as a function', () => {
    expect(typeof customOperation).toBe('function');
  });
});
