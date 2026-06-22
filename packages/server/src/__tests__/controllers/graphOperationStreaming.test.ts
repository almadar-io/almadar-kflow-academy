/**
 * Smoke tests for streaming via graphHandlerDeps.
 * The streaming logic lives inside the package factory handlers.
 * These tests verify that the deps parser functions exist and are callable.
 */

import { expansionDeps, explanationDeps, generateGoalDeps } from '../../utils/graphHandlerDeps';

jest.mock('@almadar/server', () => ({
  getFirestore: jest.fn(() => ({
    collection: jest.fn(() => ({ doc: jest.fn(() => ({ collection: jest.fn() })) })),
  })),
  authenticateFirebase: jest.fn((_req: unknown, _res: unknown, next: () => void) => next()),
}));

jest.mock('@almadar-io/knowledge/server', () => ({
  ...jest.requireActual('@almadar-io/knowledge/server'),
  KnowledgeGraphAccessLayer: jest.fn().mockImplementation(() => ({
    getGraph: jest.fn(),
    saveGraph: jest.fn(),
    clearCache: jest.fn(),
  })),
  GraphMutationService: jest.fn().mockImplementation(() => ({
    applyMutationBatchSafe: jest.fn(),
    validateMutation: jest.fn(),
  })),
}));

jest.mock('../../services/graphAuthorizationService', () => ({
  GraphAuthorizationService: jest.fn().mockImplementation(() => ({
    verifyGraphAccess: jest.fn(),
  })),
}));

describe('streaming deps parsers', () => {
  it('expansionDeps.parseExpansionContent is a function', () => {
    expect(typeof expansionDeps.parseExpansionContent).toBe('function');
  });

  it('explanationDeps.parseExplainContent is a function', () => {
    expect(typeof explanationDeps.parseExplainContent).toBe('function');
  });

  it('explanationDeps.parseAnswerQuestionContent is a function', () => {
    expect(typeof explanationDeps.parseAnswerQuestionContent).toBe('function');
  });

  it('generateGoalDeps.parseGoalContent is a function', () => {
    expect(typeof generateGoalDeps.parseGoalContent).toBe('function');
  });
});
