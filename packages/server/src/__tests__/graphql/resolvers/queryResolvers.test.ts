/**
 * Smoke tests for GraphQL query resolver exports.
 */

import { queryResolvers } from '../../../graphql/resolvers/queryResolvers';

jest.mock('@almadar-io/knowledge/server', () => ({
  KnowledgeGraphAccessLayer: jest.fn().mockImplementation(() => ({
    getGraph: jest.fn(),
  })),
  GraphMutationService: jest.fn().mockImplementation(() => ({
    applyMutationBatchSafe: jest.fn(),
    validateMutation: jest.fn(),
  })),
  extractLearningPathSummary: jest.fn(),
  extractGraphSummary: jest.fn(),
  getConceptsByLayer: jest.fn(),
  getConceptDetail: jest.fn(),
}));

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
}));

jest.mock('../../../services/graphAuthorizationService', () => ({
  GraphAuthorizationService: jest.fn().mockImplementation(() => ({
    verifyGraphAccess: jest.fn(),
  })),
}));

describe('queryResolvers', () => {
  it('exports expected Query fields', () => {
    expect(queryResolvers.Query).toBeDefined();
    expect(typeof queryResolvers.Query.learningPaths).toBe('function');
    expect(typeof queryResolvers.Query.graphSummary).toBe('function');
    expect(typeof queryResolvers.Query.concepts).toBe('function');
    expect(typeof queryResolvers.Query.conceptDetail).toBe('function');
  });
});
