/**
 * Smoke tests for graph operation deps wiring.
 * The factory handlers live in @almadar-io/knowledge/server.
 * These tests verify the deps objects satisfy the factory interfaces.
 */

import {
  generateGoalDeps,
  expansionDeps,
  explanationDeps,
  layerPracticeDeps,
  customOperationDeps,
} from '../../utils/graphHandlerDeps';

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

describe('operation deps wiring', () => {
  const sharedFields = ['accessLayer', 'mutationApplier', 'getUid', 'verifyAccess'];

  it.each(sharedFields)('generateGoalDeps has %s', field => {
    expect(generateGoalDeps).toHaveProperty(field);
  });

  it('generateGoalDeps has parseGoalContent', () => {
    expect(typeof generateGoalDeps.parseGoalContent).toBe('function');
  });

  it.each(sharedFields)('expansionDeps has %s', field => {
    expect(expansionDeps).toHaveProperty(field);
  });

  it('expansionDeps has parseExpansionContent', () => {
    expect(typeof expansionDeps.parseExpansionContent).toBe('function');
  });

  it.each(sharedFields)('explanationDeps has %s', field => {
    expect(explanationDeps).toHaveProperty(field);
  });

  it('explanationDeps has parseExplainContent and parseAnswerQuestionContent', () => {
    expect(typeof explanationDeps.parseExplainContent).toBe('function');
    expect(typeof explanationDeps.parseAnswerQuestionContent).toBe('function');
  });

  it('explanationDeps provides getAllGraphIds for V2 cross-graph (answer relatedConcepts, lesson priors, viz semantic)', () => {
    expect(typeof explanationDeps.getAllGraphIds).toBe('function');
  });

  it.each(sharedFields)('layerPracticeDeps has %s', field => {
    expect(layerPracticeDeps).toHaveProperty(field);
  });

  it('layerPracticeDeps has parseLayerPracticeContent', () => {
    expect(typeof layerPracticeDeps.parseLayerPracticeContent).toBe('function');
  });

  it.each(sharedFields)('customOperationDeps has %s', field => {
    expect(customOperationDeps).toHaveProperty(field);
  });

  it('customOperationDeps has parseCustomOperationContent', () => {
    expect(typeof customOperationDeps.parseCustomOperationContent).toBe('function');
  });

  it('getUid throws on missing uid', () => {
    const req = { firebaseUser: undefined } as unknown as import('express').Request;
    expect(() => generateGoalDeps.getUid(req)).toThrow('Unauthorized');
    expect(() => expansionDeps.getUid(req)).toThrow('Unauthorized');
    expect(() => explanationDeps.getUid(req)).toThrow('Unauthorized');
    expect(() => layerPracticeDeps.getUid(req)).toThrow('Unauthorized');
    expect(() => customOperationDeps.getUid(req)).toThrow('Unauthorized');
  });

  it('getUid returns uid when present', () => {
    const req = { firebaseUser: { uid: 'u1' } } as unknown as import('express').Request;
    expect(generateGoalDeps.getUid(req)).toBe('u1');
    expect(expansionDeps.getUid(req)).toBe('u1');
    expect(explanationDeps.getUid(req)).toBe('u1');
    expect(layerPracticeDeps.getUid(req)).toBe('u1');
    expect(customOperationDeps.getUid(req)).toBe('u1');
  });
});
