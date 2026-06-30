/**
 * Smoke tests for GraphQL mutation resolver exports.
 */

import { mutationResolvers } from '../../../graphql/resolvers/mutationResolvers';

jest.mock('@almadar-io/knowledge/server', () => ({
  KnowledgeGraphAccessLayer: jest.fn().mockImplementation(() => ({
    getGraph: jest.fn(),
    saveGraph: jest.fn(),
  })),
  GraphMutationService: jest.fn().mockImplementation(() => ({
    applyMutationBatchSafe: jest.fn(),
    validateMutation: jest.fn(),
  })),
}));

jest.mock('../../../services/graphAuthorizationService', () => ({
  GraphAuthorizationService: jest.fn().mockImplementation(() => ({
    verifyGraphAccess: jest.fn(),
  })),
}));

describe('mutationResolvers', () => {
  it('exports expected Mutation fields', () => {
    expect(mutationResolvers.Mutation).toBeDefined();
    expect(typeof mutationResolvers.Mutation.applyMutations).toBe('function');
    expect(typeof mutationResolvers.Mutation.validateMutations).toBe('function');
  });
});
