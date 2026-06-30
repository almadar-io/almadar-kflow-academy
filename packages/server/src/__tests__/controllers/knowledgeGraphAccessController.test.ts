/**
 * Smoke tests for graphAccessDeps wiring.
 * The factory handlers (createGetGraphHandler, etc.) live in
 * @almadar-io/knowledge/server and own the full access-layer behavior.
 */

import { graphAccessDeps } from '../../utils/graphHandlerDeps';

jest.mock('@almadar/server', () => ({
  getFirestore: jest.fn(() => ({
    collection: jest.fn(() => ({ doc: jest.fn(() => ({ collection: jest.fn() })) })),
  })),
  authenticateFirebase: jest.fn((_req: unknown, _res: unknown, next: () => void) => next()),
}));

jest.mock('@almadar-io/knowledge/server', () => ({
  KnowledgeGraphAccessLayer: jest.fn().mockImplementation(() => ({
    getGraph: jest.fn(),
    saveGraph: jest.fn(),
    clearCache: jest.fn(),
    getNode: jest.fn(),
    getNodesByType: jest.fn(),
    findNodes: jest.fn(),
    createNode: jest.fn(),
    updateNode: jest.fn(),
    deleteNode: jest.fn(),
    getRelationships: jest.fn(),
    getRelationshipsByType: jest.fn(),
    createRelationship: jest.fn(),
    deleteRelationship: jest.fn(),
    findPath: jest.fn(),
    traverse: jest.fn(),
    extractSubgraph: jest.fn(),
  })),
  GraphMutationService: jest.fn().mockImplementation(() => ({
    applyMutationBatchSafe: jest.fn(),
    validateMutation: jest.fn(),
  })),
}));

describe('graphAccessDeps', () => {
  it('has accessLayer', () => {
    expect(graphAccessDeps.accessLayer).toBeDefined();
  });

  it('has getUid that throws when uid missing', () => {
    const req = { firebaseUser: undefined } as unknown as import('express').Request;
    expect(() => graphAccessDeps.getUid(req)).toThrow('Unauthorized');
  });

  it('has getUid returning uid when present', () => {
    const req = { firebaseUser: { uid: 'u1' } } as unknown as import('express').Request;
    expect(graphAccessDeps.getUid(req)).toBe('u1');
  });

  it('has invalidateCache function', () => {
    expect(typeof graphAccessDeps.invalidateCache).toBe('function');
  });
});
