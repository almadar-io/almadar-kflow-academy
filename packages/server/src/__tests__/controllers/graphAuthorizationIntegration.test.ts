/**
 * Smoke tests for authorization wiring via graphHandlerDeps.
 * The authorization logic lives inside the package factory handlers,
 * routed via verifyAccess in each deps object.
 */

import {
  graphMutationDeps,
  generateGoalDeps,
  expansionDeps,
  explanationDeps,
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

jest.mock('../../services/graphAuthorizationService', () => {
  const mockVerifyGraphAccess = jest.fn();
  return {
    GraphAuthorizationService: jest.fn().mockImplementation(() => ({
      verifyGraphAccess: mockVerifyGraphAccess,
    })),
    __mockVerifyGraphAccess: mockVerifyGraphAccess,
  };
});

const mockVerifyGraphAccess = jest.requireMock('../../services/graphAuthorizationService').__mockVerifyGraphAccess;

describe('authorization wiring', () => {
  it('graphMutationDeps.verifyAccess delegates to GraphAuthorizationService', async () => {
    mockVerifyGraphAccess.mockResolvedValueOnce(undefined);
    await graphMutationDeps.verifyAccess!('uid1', 'graph1', 'write');
    expect(mockVerifyGraphAccess).toHaveBeenCalledWith('uid1', 'graph1', 'write');
  });

  it('generateGoalDeps.verifyAccess delegates to GraphAuthorizationService', async () => {
    mockVerifyGraphAccess.mockResolvedValueOnce(undefined);
    await generateGoalDeps.verifyAccess!('uid1', 'graph1', 'write');
    expect(mockVerifyGraphAccess).toHaveBeenCalledWith('uid1', 'graph1', 'write');
  });

  it('expansionDeps.verifyAccess delegates to GraphAuthorizationService', async () => {
    mockVerifyGraphAccess.mockResolvedValueOnce(undefined);
    await expansionDeps.verifyAccess!('uid1', 'graph1', 'write');
    expect(mockVerifyGraphAccess).toHaveBeenCalledWith('uid1', 'graph1', 'write');
  });

  it('explanationDeps.verifyAccess delegates to GraphAuthorizationService', async () => {
    mockVerifyGraphAccess.mockResolvedValueOnce(undefined);
    await explanationDeps.verifyAccess!('uid1', 'graph1', 'write');
    expect(mockVerifyGraphAccess).toHaveBeenCalledWith('uid1', 'graph1', 'write');
  });
});
