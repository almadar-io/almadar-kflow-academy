/**
 * Smoke tests for GraphQL resolver exports.
 */

import { resolvers } from '../../graphql/resolvers';

jest.mock('@almadar-io/knowledge/server', () => ({
  KnowledgeGraphAccessLayer: jest.fn().mockImplementation(() => ({
    getGraph: jest.fn(),
    saveGraph: jest.fn(),
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
    clearCache: jest.fn(),
  })),
  GraphMutationService: jest.fn().mockImplementation(() => ({
    applyMutationBatchSafe: jest.fn(),
    validateMutation: jest.fn(),
  })),
  progressiveExpandMultipleFromText: jest.fn(),
  explain: jest.fn(),
  answerQuestion: jest.fn(),
  generateGoals: jest.fn(),
  generateLayerPractice: jest.fn(),
  customOperation: jest.fn(),
}));

jest.mock('../../services/graphAuthorizationService', () => ({
  GraphAuthorizationService: jest.fn().mockImplementation(() => ({
    verifyGraphAccess: jest.fn(),
  })),
}));

describe('GraphQL resolvers', () => {
  it('exports expected Query and Mutation fields', () => {
    expect(resolvers.Query).toBeDefined();
    expect(typeof resolvers.Query.graph).toBe('function');
    expect(typeof resolvers.Query.node).toBe('function');
    expect(typeof resolvers.Query.nodes).toBe('function');
    expect(typeof resolvers.Query.findNodes).toBe('function');
    expect(typeof resolvers.Query.relationships).toBe('function');
    expect(typeof resolvers.Query.nodeRelationships).toBe('function');
    expect(typeof resolvers.Query.path).toBe('function');
    expect(typeof resolvers.Query.traverse).toBe('function');
    expect(typeof resolvers.Query.subgraph).toBe('function');
    expect(typeof resolvers.Query.learningPaths).toBe('function');
    expect(typeof resolvers.Query.graphSummary).toBe('function');
    expect(typeof resolvers.Query.concepts).toBe('function');
    expect(typeof resolvers.Query.conceptDetail).toBe('function');

    expect(resolvers.Mutation).toBeDefined();
    expect(typeof resolvers.Mutation.saveGraph).toBe('function');
    expect(typeof resolvers.Mutation.createNode).toBe('function');
    expect(typeof resolvers.Mutation.updateNode).toBe('function');
    expect(typeof resolvers.Mutation.deleteNode).toBe('function');
    expect(typeof resolvers.Mutation.createRelationship).toBe('function');
    expect(typeof resolvers.Mutation.deleteRelationship).toBe('function');
    expect(typeof resolvers.Mutation.applyMutations).toBe('function');
    expect(typeof resolvers.Mutation.validateMutations).toBe('function');
    expect(typeof resolvers.Mutation.progressiveExpand).toBe('function');
    expect(typeof resolvers.Mutation.explainConcept).toBe('function');
    expect(typeof resolvers.Mutation.answerQuestion).toBe('function');
    expect(typeof resolvers.Mutation.generateGoals).toBe('function');
    expect(typeof resolvers.Mutation.generateLayerPractice).toBe('function');
    expect(typeof resolvers.Mutation.customOperation).toBe('function');
  });
});
