/**
 * Smoke tests for GraphQL expansion resolver exports.
 */

import { expansionResolvers } from '../../../graphql/resolvers/expansionResolvers';

jest.mock('@almadar-io/knowledge/server', () => ({
  KnowledgeGraphAccessLayer: jest.fn().mockImplementation(() => ({
    getGraph: jest.fn(),
    saveGraph: jest.fn(),
  })),
  GraphMutationService: jest.fn().mockImplementation(() => ({
    applyMutationBatchSafe: jest.fn(),
    validateMutation: jest.fn(),
  })),
  progressiveExpandMultipleFromText: jest.fn(),
}));

jest.mock('../../../services/graphAuthorizationService', () => ({
  GraphAuthorizationService: jest.fn().mockImplementation(() => ({
    verifyGraphAccess: jest.fn(),
  })),
}));

describe('expansionResolvers', () => {
  it('exports expected Mutation fields', () => {
    expect(expansionResolvers.Mutation).toBeDefined();
    expect(typeof expansionResolvers.Mutation.progressiveExpand).toBe('function');
  });
});
