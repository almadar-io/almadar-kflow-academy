/**
 * Smoke tests for graph mutation handler deps wiring.
 * The factory functions (createApplyMutationsHandler, createValidateMutationsHandler)
 * live in @almadar-io/knowledge/server and own the full behavior including error
 * handling — these tests simply verify the deps object satisfies the factory
 * interface and that the handlers mount correctly in graphHandlerDeps.
 */

import { graphMutationDeps } from '../../utils/graphHandlerDeps';

jest.mock('@almadar/server', () => ({
  getFirestore: jest.fn(() => ({
    collection: jest.fn(() => ({ doc: jest.fn(() => ({ collection: jest.fn(() => ({ select: jest.fn(() => ({ get: jest.fn() })) })) })) }),
  })),
  authenticateFirebase: jest.fn((_req: unknown, _res: unknown, next: () => void) => next()),
}));

jest.mock('@almadar-io/knowledge/server', () => ({
  KnowledgeGraphAccessLayer: jest.fn().mockImplementation(() => ({
    getGraph: jest.fn(),
    saveGraph: jest.fn(),
    clearCache: jest.fn(),
  })),
}));

jest.mock('../../services/graphMutationService', () => ({
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

describe('graphMutationDeps', () => {
  it('has accessLayer', () => {
    expect(graphMutationDeps.accessLayer).toBeDefined();
  });

  it('has mutationApplier with applyMutationBatchSafe and validateMutation', () => {
    expect(typeof graphMutationDeps.mutationApplier.applyMutationBatchSafe).toBe('function');
    expect(typeof graphMutationDeps.mutationApplier.validateMutation).toBe('function');
  });

  it('has getUid that throws on missing uid', () => {
    const req = { firebaseUser: undefined } as unknown as import('express').Request;
    expect(() => graphMutationDeps.getUid(req)).toThrow('Unauthorized');
  });

  it('has getUid that returns uid when present', () => {
    const req = { firebaseUser: { uid: 'user-123' } } as unknown as import('express').Request;
    expect(graphMutationDeps.getUid(req)).toBe('user-123');
  });
});
