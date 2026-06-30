/**
 * Smoke tests for GraphQL layer practice resolver exports.
 */

import { layerPracticeResolvers } from '../../../graphql/resolvers/layerPracticeResolvers';

jest.mock('@almadar-io/knowledge/server', () => ({
  KnowledgeGraphAccessLayer: jest.fn().mockImplementation(() => ({
    getGraph: jest.fn(),
    saveGraph: jest.fn(),
  })),
  GraphMutationService: jest.fn().mockImplementation(() => ({
    applyMutationBatchSafe: jest.fn(),
    validateMutation: jest.fn(),
  })),
  generateLayerPractice: jest.fn(),
}));

jest.mock('../../../services/graphAuthorizationService', () => ({
  GraphAuthorizationService: jest.fn().mockImplementation(() => ({
    verifyGraphAccess: jest.fn(),
  })),
}));

describe('layerPracticeResolvers', () => {
  it('exports expected Mutation fields', () => {
    expect(layerPracticeResolvers.Mutation).toBeDefined();
    expect(typeof layerPracticeResolvers.Mutation.generateLayerPractice).toBe('function');
  });
});
