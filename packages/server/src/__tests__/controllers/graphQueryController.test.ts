/**
 * Smoke tests for graphQueryDeps wiring.
 * The factory handlers (createGetLearningPathsHandler, etc.) live in
 * @almadar-io/knowledge/server and own the full query behavior.
 */

import { graphQueryDeps } from '../../utils/graphHandlerDeps';

jest.mock('@almadar/server', () => ({
  getFirestore: jest.fn(() => ({
    collection: jest.fn(() => ({
      doc: jest.fn(() => ({
        collection: jest.fn(() => ({
          select: jest.fn(() => ({ get: jest.fn().mockResolvedValue({ docs: [] }) })),
        })),
      })),
    })),
  })),
  authenticateFirebase: jest.fn((_req: unknown, _res: unknown, next: () => void) => next()),
}));

jest.mock('@almadar-io/knowledge/server', () => ({
  KnowledgeGraphAccessLayer: jest.fn().mockImplementation(() => ({
    getGraph: jest.fn(),
    clearCache: jest.fn(),
  })),
}));

jest.mock('../../services/graphAuthorizationService', () => ({
  GraphAuthorizationService: jest.fn().mockImplementation(() => ({
    verifyGraphAccess: jest.fn(),
  })),
}));

describe('graphQueryDeps', () => {
  it('has accessLayer', () => {
    expect(graphQueryDeps.accessLayer).toBeDefined();
  });

  it('has getUid that throws when uid missing', () => {
    const req = { firebaseUser: undefined } as unknown as import('express').Request;
    expect(() => graphQueryDeps.getUid(req)).toThrow('Unauthorized');
  });

  it('has getUid returning uid when present', () => {
    const req = { firebaseUser: { uid: 'u1' } } as unknown as import('express').Request;
    expect(graphQueryDeps.getUid(req)).toBe('u1');
  });

  it('has getAllGraphIds that queries Firestore', async () => {
    expect(typeof graphQueryDeps.getAllGraphIds).toBe('function');
    const ids = await graphQueryDeps.getAllGraphIds!('u1');
    expect(Array.isArray(ids)).toBe(true);
  });
});
