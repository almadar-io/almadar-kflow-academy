/**
 * Smoke tests for GraphQL custom operation resolver exports.
 */

import { customOperationResolvers } from '../../../graphql/resolvers/customOperationResolvers';

jest.mock('@almadar-io/knowledge/server', () => ({
  KnowledgeGraphAccessLayer: jest.fn().mockImplementation(() => ({
    getGraph: jest.fn(),
    saveGraph: jest.fn(),
  })),
  GraphMutationService: jest.fn().mockImplementation(() => ({
    applyMutationBatchSafe: jest.fn(),
    validateMutation: jest.fn(),
  })),
  customOperation: jest.fn(),
}));

jest.mock('../../../services/graphAuthorizationService', () => ({
  GraphAuthorizationService: jest.fn().mockImplementation(() => ({
    verifyGraphAccess: jest.fn(),
  })),
}));

describe('customOperationResolvers', () => {
  it('exports expected Mutation fields', () => {
    expect(customOperationResolvers.Mutation).toBeDefined();
    expect(typeof customOperationResolvers.Mutation.customOperation).toBe('function');
  });
});
