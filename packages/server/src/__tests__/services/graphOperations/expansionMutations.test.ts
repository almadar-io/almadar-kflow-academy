/**
 * Smoke tests for graph operation parser exports.
 */

import {
  parseProgressiveExpandContent,
  parseExplainContent,
  parseAnswerQuestionContent,
  parseGenerateGoalsContent,
  parseGenerateLayerPracticeContent,
  parseCustomOperationContent,
} from '../../../utils/graphOperationParsers';

jest.mock('@almadar-io/knowledge/server', () => ({
  KnowledgeGraphAccessLayer: jest.fn().mockImplementation(() => ({
    getGraph: jest.fn(),
    saveGraph: jest.fn(),
  })),
  GraphMutationService: jest.fn().mockImplementation(() => ({
    applyMutationBatchSafe: jest.fn(),
    validateMutation: jest.fn(),
  })),
  buildExpansionMutations: jest.fn(() => ({
    mutations: { mutations: [], metadata: {} },
    parsedContent: {},
  })),
}));

jest.mock('../../../services/llm', () => ({
  extractJSONArray: jest.fn(() => []),
}));

describe('graphOperationParsers', () => {
  it('exports expected parser functions', () => {
    expect(typeof parseProgressiveExpandContent).toBe('function');
    expect(typeof parseExplainContent).toBe('function');
    expect(typeof parseAnswerQuestionContent).toBe('function');
    expect(typeof parseGenerateGoalsContent).toBe('function');
    expect(typeof parseGenerateLayerPracticeContent).toBe('function');
    expect(typeof parseCustomOperationContent).toBe('function');
  });
});
