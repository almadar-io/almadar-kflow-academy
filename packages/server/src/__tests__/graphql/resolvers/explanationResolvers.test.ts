/**
 * Smoke tests for GraphQL explanation resolver exports.
 */

import { explanationResolvers } from '../../../graphql/resolvers/explanationResolvers';

jest.mock('@almadar-io/knowledge/server', () => ({
  KnowledgeGraphAccessLayer: jest.fn().mockImplementation(() => ({
    getGraph: jest.fn(),
    saveGraph: jest.fn(),
  })),
  GraphMutationService: jest.fn().mockImplementation(() => ({
    applyMutationBatchSafe: jest.fn(),
    validateMutation: jest.fn(),
  })),
  explain: jest.fn(),
  answerQuestion: jest.fn(),
}));

jest.mock('../../../services/graphAuthorizationService', () => ({
  GraphAuthorizationService: jest.fn().mockImplementation(() => ({
    verifyGraphAccess: jest.fn(),
  })),
}));

describe('explanationResolvers', () => {
  it('exports expected Mutation fields', () => {
    expect(explanationResolvers.Mutation).toBeDefined();
    expect(typeof explanationResolvers.Mutation.explainConcept).toBe('function');
    expect(typeof explanationResolvers.Mutation.answerQuestion).toBe('function');
  });
});
