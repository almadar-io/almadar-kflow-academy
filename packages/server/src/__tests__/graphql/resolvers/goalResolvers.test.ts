/**
 * Smoke tests for GraphQL goal resolver exports.
 */

import { goalResolvers } from '../../../graphql/resolvers/goalResolvers';

jest.mock('@almadar-io/knowledge/server', () => ({
  KnowledgeGraphAccessLayer: jest.fn().mockImplementation(() => ({
    getGraph: jest.fn(),
    saveGraph: jest.fn(),
  })),
  GraphMutationService: jest.fn().mockImplementation(() => ({
    applyMutationBatchSafe: jest.fn(),
    validateMutation: jest.fn(),
  })),
  generateGoals: jest.fn(),
}));

jest.mock('../../../services/graphAuthorizationService', () => ({
  GraphAuthorizationService: jest.fn().mockImplementation(() => ({
    verifyGraphAccess: jest.fn(),
  })),
}));

describe('goalResolvers', () => {
  it('exports expected Mutation fields', () => {
    expect(goalResolvers.Mutation).toBeDefined();
    expect(typeof goalResolvers.Mutation.generateGoals).toBe('function');
  });
});
