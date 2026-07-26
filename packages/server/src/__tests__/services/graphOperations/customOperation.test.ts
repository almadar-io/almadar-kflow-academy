/**
 * Smoke tests for operations/customOperation export.
 */

import { customOperation } from '../../../operations/customOperation';

jest.mock('../../../services/llm', () => ({
  callLLM: jest.fn(),
  callLLMJson: jest.fn(),
}));

describe('customOperation', () => {
  it('is exported as a function', () => {
    expect(typeof customOperation).toBe('function');
  });
});
