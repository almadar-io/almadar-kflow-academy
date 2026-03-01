/**
 * Integration Tests for GraphQL Resolvers
 * 
 * Tests all GraphQL queries and mutations for the Knowledge Graph Access API
 */

import { ApolloServer } from 'apollo-server-express';
import { typeDefs } from '../../graphql/schema';
import { resolvers } from '../../graphql/resolvers';
import type { NodeBasedKnowledgeGraph, GraphNode, Relationship } from '../../types/nodeBasedKnowledgeGraph';
import { createGraphNode, createRelationship } from '../../types/nodeBasedKnowledgeGraph';
import { createMockDecodedToken } from '../testUtils.helper';

// Mock the KnowledgeGraphAccessLayer module
jest.mock('../../services/knowledgeGraphAccess/KnowledgeGraphAccessLayer', () => {
  const mockGetGraph = jest.fn();
  const mockSaveGraph = jest.fn();
  const mockGetNode = jest.fn();
  const mockGetNodesByType = jest.fn();
  const mockFindNodes = jest.fn();
  const mockCreateNode = jest.fn();
  const mockUpdateNode = jest.fn();
  const mockDeleteNode = jest.fn();
  const mockGetRelationships = jest.fn();
  const mockGetRelationshipsByType = jest.fn();
  const mockCreateRelationship = jest.fn();
  const mockDeleteRelationship = jest.fn();
  const mockFindPath = jest.fn();
  const mockTraverse = jest.fn();
  const mockExtractSubgraph = jest.fn();

  return {
    KnowledgeGraphAccessLayer: jest.fn().mockImplementation(() => ({
      getGraph: mockGetGraph,
      saveGraph: mockSaveGraph,
      getNode: mockGetNode,
      getNodesByType: mockGetNodesByType,
      findNodes: mockFindNodes,
      createNode: mockCreateNode,
      updateNode: mockUpdateNode,
      deleteNode: mockDeleteNode,
      getRelationships: mockGetRelationships,
      getRelationshipsByType: mockGetRelationshipsByType,
      createRelationship: mockCreateRelationship,
      deleteRelationship: mockDeleteRelationship,
      findPath: mockFindPath,
      traverse: mockTraverse,
      extractSubgraph: mockExtractSubgraph,
      clearCache: jest.fn(),
      clearAllCache: jest.fn(),
    })),
    __mocks: {
      mockGetGraph,
      mockSaveGraph,
      mockGetNode,
      mockGetNodesByType,
      mockFindNodes,
      mockCreateNode,
      mockUpdateNode,
      mockDeleteNode,
      mockGetRelationships,
      mockGetRelationshipsByType,
      mockCreateRelationship,
      mockDeleteRelationship,
      mockFindPath,
      mockTraverse,
      mockExtractSubgraph,
    },
  };
});

// Import mocks for use in tests
const {
  mockGetGraph,
  mockSaveGraph,
  mockGetNode,
  mockGetNodesByType,
  mockFindNodes,
  mockCreateNode,
  mockUpdateNode,
  mockDeleteNode,
  mockGetRelationships,
  mockGetRelationshipsByType,
  mockCreateRelationship,
  mockDeleteRelationship,
  mockFindPath,
  mockTraverse,
  mockExtractSubgraph,
} = require('../../services/knowledgeGraphAccess/KnowledgeGraphAccessLayer').__mocks;

describe('GraphQL Resolvers - Integration Tests', () => {
  let apolloServer: ApolloServer;
  const uid = 'test-user-1';
  const graphId = 'test-graph-1';
  const nodeId1 = 'concept-1';
  const nodeId2 = 'concept-2';
  const relId = 'rel-1';

  let sampleGraph: NodeBasedKnowledgeGraph;
  let sampleNode1: GraphNode;
  let sampleNode2: GraphNode;
  let sampleRelationship: Relationship;
  let context: any;

  beforeEach(() => {
    jest.clearAllMocks();

    // Create sample nodes
    sampleNode1 = createGraphNode(nodeId1, 'Concept', {
      id: nodeId1,
      name: 'React',
      description: 'A JavaScript library',
    });
    sampleNode2 = createGraphNode(nodeId2, 'Concept', {
      id: nodeId2,
      name: 'JavaScript',
      description: 'Programming language',
    });

    // Create sample relationship
    sampleRelationship = createRelationship(
      nodeId1,
      nodeId2,
      'hasPrerequisite',
      'forward',
      0.9
    );

    // Create sample graph
    sampleGraph = {
      id: graphId,
      seedConceptId: nodeId1,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      nodes: {
        [graphId]: createGraphNode(graphId, 'Graph', {
          id: graphId,
          name: 'Test Graph',
          seedConceptId: nodeId1,
        }),
        [nodeId1]: sampleNode1,
        [nodeId2]: sampleNode2,
      },
      nodeTypes: {
        Graph: [graphId],
        Concept: [nodeId1, nodeId2],
        Layer: [],
        LearningGoal: [],
        Milestone: [],
        PracticeExercise: [],
        Lesson: [],
        ConceptMetadata: [],
        GraphMetadata: [],
        FlashCard: [],
      },
      relationships: [
        createRelationship(graphId, nodeId1, 'containsConcept', 'forward', 1.0),
        createRelationship(graphId, nodeId2, 'containsConcept', 'forward', 1.0),
        sampleRelationship,
      ],
    };

    // Setup context with authenticated user
    const decodedToken = createMockDecodedToken({ uid });
    context = {
      firebaseUser: decodedToken,
    };

    // Setup default mocks
    mockGetGraph.mockResolvedValue(sampleGraph);
    mockGetNode.mockResolvedValue(sampleNode1);
    mockGetNodesByType.mockResolvedValue([sampleNode1, sampleNode2]);
    mockFindNodes.mockResolvedValue([sampleNode1, sampleNode2]);
    mockGetRelationships.mockResolvedValue([sampleRelationship]);
    mockGetRelationshipsByType.mockResolvedValue([sampleRelationship]);
    mockFindPath.mockResolvedValue([sampleNode1, sampleNode2]);
    mockTraverse.mockResolvedValue({
      nodes: [sampleNode2],
      relationships: [sampleRelationship],
      depth: 1,
      visited: [nodeId1, nodeId2],
    });
    mockExtractSubgraph.mockResolvedValue(sampleGraph);
    mockCreateNode.mockResolvedValue(sampleNode1);
    mockUpdateNode.mockResolvedValue(sampleNode1);
    mockCreateRelationship.mockResolvedValue(sampleRelationship);

    // Create Apollo Server instance
    apolloServer = new ApolloServer({
      typeDefs,
      resolvers,
      context: () => context,
    });
  });

  describe('Queries', () => {
    describe('graph', () => {
      it('should return the graph', async () => {
        const query = `
          query GetGraph($graphId: ID!) {
            graph(graphId: $graphId) {
              id
              seedConceptId
              nodes {
                id
                type
              }
            }
          }
        `;

        const result = await apolloServer.executeOperation({
          query,
          variables: { graphId },
        });

        expect(result.errors).toBeUndefined();
        expect(result.data?.graph).toBeDefined();
        expect(result.data?.graph.id).toBe(graphId);
        expect(mockGetGraph).toHaveBeenCalledWith(uid, graphId);
      });

      it('should return error if unauthorized', async () => {
        context.firebaseUser = undefined;

        const query = `
          query GetGraph($graphId: ID!) {
            graph(graphId: $graphId) {
              id
            }
          }
        `;

        const result = await apolloServer.executeOperation({
          query,
          variables: { graphId },
        });

        expect(result.errors).toBeDefined();
        expect(result.errors?.[0].message).toContain('Unauthorized');
      });
    });

    describe('node', () => {
      it('should return a single node', async () => {
        const query = `
          query GetNode($graphId: ID!, $nodeId: ID!) {
            node(graphId: $graphId, nodeId: $nodeId) {
              id
              type
              properties
            }
          }
        `;

        const result = await apolloServer.executeOperation({
          query,
          variables: { graphId, nodeId: nodeId1 },
        });

        expect(result.errors).toBeUndefined();
        expect(result.data?.node).toBeDefined();
        expect(result.data?.node.id).toBe(nodeId1);
        expect(mockGetNode).toHaveBeenCalledWith(uid, graphId, nodeId1);
      });
    });

    describe('nodes', () => {
      it('should return all nodes', async () => {
        const query = `
          query GetNodes($graphId: ID!) {
            nodes(graphId: $graphId) {
              nodes {
                id
                type
              }
              count
            }
          }
        `;

        const result = await apolloServer.executeOperation({
          query,
          variables: { graphId },
        });

        expect(result.errors).toBeUndefined();
        expect(result.data?.nodes).toBeDefined();
        expect(result.data?.nodes.count).toBeGreaterThan(0);
        expect(mockGetGraph).toHaveBeenCalledWith(uid, graphId);
      });

      it('should filter nodes by type', async () => {
        const query = `
          query GetNodesByType($graphId: ID!, $type: NodeType!) {
            nodes(graphId: $graphId, type: $type) {
              nodes {
                id
                type
              }
              count
            }
          }
        `;

        const result = await apolloServer.executeOperation({
          query,
          variables: { graphId, type: 'Concept' },
        });

        expect(result.errors).toBeUndefined();
        expect(result.data?.nodes).toBeDefined();
        expect(mockGetNodesByType).toHaveBeenCalledWith(uid, graphId, 'Concept');
      });
    });

    describe('findNodes', () => {
      it('should find nodes with filter', async () => {
        const query = `
          query FindNodes($graphId: ID!, $filter: NodeFilter!) {
            findNodes(graphId: $graphId, filter: $filter) {
              nodes {
                id
                type
              }
              count
            }
          }
        `;

        const result = await apolloServer.executeOperation({
          query,
          variables: {
            graphId,
            filter: { type: 'Concept' },
          },
        });

        expect(result.errors).toBeUndefined();
        expect(result.data?.findNodes).toBeDefined();
        expect(mockFindNodes).toHaveBeenCalled();
      });
    });

    describe('relationships', () => {
      it('should return all relationships', async () => {
        const query = `
          query GetRelationships($graphId: ID!) {
            relationships(graphId: $graphId) {
              relationships {
                id
                source
                target
                type
              }
              count
            }
          }
        `;

        const result = await apolloServer.executeOperation({
          query,
          variables: { graphId },
        });

        expect(result.errors).toBeUndefined();
        expect(result.data?.relationships).toBeDefined();
        expect(mockGetRelationships).toHaveBeenCalled();
      });

      it('should filter relationships by type', async () => {
        const query = `
          query GetRelationshipsByType($graphId: ID!, $filter: RelationshipFilter!) {
            relationships(graphId: $graphId, filter: $filter) {
              relationships {
                id
                type
              }
              count
            }
          }
        `;

        const result = await apolloServer.executeOperation({
          query,
          variables: {
            graphId,
            filter: { type: 'hasPrerequisite' },
          },
        });

        expect(result.errors).toBeUndefined();
        expect(result.data?.relationships).toBeDefined();
        expect(mockGetRelationshipsByType).toHaveBeenCalled();
      });
    });

    describe('nodeRelationships', () => {
      it('should return node relationships', async () => {
        const query = `
          query GetNodeRelationships($graphId: ID!, $nodeId: ID!) {
            nodeRelationships(graphId: $graphId, nodeId: $nodeId) {
              relationships {
                id
                source
                target
              }
              count
            }
          }
        `;

        const result = await apolloServer.executeOperation({
          query,
          variables: { graphId, nodeId: nodeId1 },
        });

        expect(result.errors).toBeUndefined();
        expect(result.data?.nodeRelationships).toBeDefined();
        expect(mockGetRelationships).toHaveBeenCalled();
      });
    });

    describe('path', () => {
      it('should find path between nodes', async () => {
        const query = `
          query FindPath($graphId: ID!, $from: ID!, $to: ID!) {
            path(graphId: $graphId, from: $from, to: $to) {
              path {
                id
                type
              }
              length
            }
          }
        `;

        const result = await apolloServer.executeOperation({
          query,
          variables: { graphId, from: nodeId1, to: nodeId2 },
        });

        expect(result.errors).toBeUndefined();
        expect(result.data?.path).toBeDefined();
        expect(result.data?.path.length).toBe(2);
        expect(mockFindPath).toHaveBeenCalledWith(uid, graphId, nodeId1, nodeId2, undefined);
      });

      it('should support maxDepth parameter', async () => {
        const query = `
          query FindPathWithDepth($graphId: ID!, $from: ID!, $to: ID!, $maxDepth: Int) {
            path(graphId: $graphId, from: $from, to: $to, maxDepth: $maxDepth) {
              path {
                id
              }
              length
            }
          }
        `;

        const result = await apolloServer.executeOperation({
          query,
          variables: { graphId, from: nodeId1, to: nodeId2, maxDepth: 5 },
        });

        expect(result.errors).toBeUndefined();
        expect(mockFindPath).toHaveBeenCalledWith(uid, graphId, nodeId1, nodeId2, 5);
      });
    });

    describe('traverse', () => {
      it('should traverse graph from a node', async () => {
        const query = `
          query Traverse($graphId: ID!, $startNodeId: ID!, $options: TraverseOptions) {
            traverse(graphId: $graphId, startNodeId: $startNodeId, options: $options) {
              nodes {
                id
                type
              }
              relationships {
                id
                type
              }
              depth
              visited
            }
          }
        `;

        const result = await apolloServer.executeOperation({
          query,
          variables: {
            graphId,
            startNodeId: nodeId1,
            options: {
              relationshipTypes: ['hasPrerequisite'],
              direction: 'forward',
              maxDepth: 3,
            },
          },
        });

        expect(result.errors).toBeUndefined();
        expect(result.data?.traverse).toBeDefined();
        expect(result.data?.traverse.depth).toBe(1);
        expect(mockTraverse).toHaveBeenCalled();
      });
    });

    describe('subgraph', () => {
      it('should extract subgraph', async () => {
        const query = `
          query ExtractSubgraph($graphId: ID!, $nodeIds: [ID!]!, $depth: Int) {
            subgraph(graphId: $graphId, nodeIds: $nodeIds, depth: $depth) {
              id
              nodes {
                id
                type
              }
            }
          }
        `;

        const result = await apolloServer.executeOperation({
          query,
          variables: {
            graphId,
            nodeIds: [nodeId1, nodeId2],
            depth: 2,
          },
        });

        expect(result.errors).toBeUndefined();
        expect(result.data?.subgraph).toBeDefined();
        expect(mockExtractSubgraph).toHaveBeenCalledWith(uid, graphId, [nodeId1, nodeId2], 2);
      });
    });
  });

  describe('Mutations', () => {
    describe('saveGraph', () => {
      it('should save the graph', async () => {
        const mutation = `
          mutation SaveGraph($graphId: ID!, $graph: JSON!) {
            saveGraph(graphId: $graphId, graph: $graph) {
              id
              seedConceptId
            }
          }
        `;

        const result = await apolloServer.executeOperation({
          query: mutation,
          variables: {
            graphId,
            graph: sampleGraph,
          },
        });

        expect(result.errors).toBeUndefined();
        expect(result.data?.saveGraph).toBeDefined();
        expect(mockSaveGraph).toHaveBeenCalledWith(uid, sampleGraph);
      });
    });

    describe('createNode', () => {
      it('should create a node', async () => {
        const mutation = `
          mutation CreateNode($graphId: ID!, $input: CreateNodeInput!) {
            createNode(graphId: $graphId, input: $input) {
              id
              type
              properties
            }
          }
        `;

        const result = await apolloServer.executeOperation({
          query: mutation,
          variables: {
            graphId,
            input: {
              type: 'Concept',
              properties: {
                name: 'New Concept',
                description: 'A new concept',
              },
            },
          },
        });

        expect(result.errors).toBeUndefined();
        expect(result.data?.createNode).toBeDefined();
        expect(mockCreateNode).toHaveBeenCalled();
      });
    });

    describe('updateNode', () => {
      it('should update a node', async () => {
        const mutation = `
          mutation UpdateNode($graphId: ID!, $nodeId: ID!, $input: UpdateNodeInput!) {
            updateNode(graphId: $graphId, nodeId: $nodeId, input: $input) {
              id
              properties
            }
          }
        `;

        const result = await apolloServer.executeOperation({
          query: mutation,
          variables: {
            graphId,
            nodeId: nodeId1,
            input: {
              properties: {
                description: 'Updated description',
              },
            },
          },
        });

        expect(result.errors).toBeUndefined();
        expect(result.data?.updateNode).toBeDefined();
        expect(mockUpdateNode).toHaveBeenCalledWith(
          uid,
          graphId,
          nodeId1,
          { description: 'Updated description' }
        );
      });
    });

    describe('deleteNode', () => {
      it('should delete a node', async () => {
        const mutation = `
          mutation DeleteNode($graphId: ID!, $nodeId: ID!, $options: DeleteNodeOptions) {
            deleteNode(graphId: $graphId, nodeId: $nodeId, options: $options)
          }
        `;

        const result = await apolloServer.executeOperation({
          query: mutation,
          variables: {
            graphId,
            nodeId: nodeId1,
            options: { cascade: false },
          },
        });

        expect(result.errors).toBeUndefined();
        expect(result.data?.deleteNode).toBe(true);
        expect(mockDeleteNode).toHaveBeenCalledWith(uid, graphId, nodeId1, { cascade: false });
      });
    });

    describe('createRelationship', () => {
      it('should create a relationship', async () => {
        const mutation = `
          mutation CreateRelationship($graphId: ID!, $input: CreateRelationshipInput!) {
            createRelationship(graphId: $graphId, input: $input) {
              id
              source
              target
              type
              direction
            }
          }
        `;

        const result = await apolloServer.executeOperation({
          query: mutation,
          variables: {
            graphId,
            input: {
              source: nodeId1,
              target: nodeId2,
              type: 'hasPrerequisite',
              direction: 'forward',
              strength: 0.9,
            },
          },
        });

        expect(result.errors).toBeUndefined();
        expect(result.data?.createRelationship).toBeDefined();
        expect(mockCreateRelationship).toHaveBeenCalled();
      });
    });

    describe('deleteRelationship', () => {
      it('should delete a relationship', async () => {
        const mutation = `
          mutation DeleteRelationship($graphId: ID!, $relId: ID!) {
            deleteRelationship(graphId: $graphId, relId: $relId)
          }
        `;

        const result = await apolloServer.executeOperation({
          query: mutation,
          variables: {
            graphId,
            relId,
          },
        });

        expect(result.errors).toBeUndefined();
        expect(result.data?.deleteRelationship).toBe(true);
        expect(mockDeleteRelationship).toHaveBeenCalledWith(uid, graphId, relId);
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle access layer errors gracefully', async () => {
      mockGetGraph.mockRejectedValue(new Error('Graph not found'));

      const query = `
        query GetGraph($graphId: ID!) {
          graph(graphId: $graphId) {
            id
          }
        }
      `;

      const result = await apolloServer.executeOperation({
        query,
        variables: { graphId },
      });

      expect(result.errors).toBeDefined();
      expect(result.errors?.[0].message).toContain('Graph not found');
    });

    it('should return error for unauthorized requests', async () => {
      context.firebaseUser = undefined;

      const query = `
        query GetGraph($graphId: ID!) {
          graph(graphId: $graphId) {
            id
          }
        }
      `;

      const result = await apolloServer.executeOperation({
        query,
        variables: { graphId },
      });

      expect(result.errors).toBeDefined();
      expect(result.errors?.[0].message).toContain('Unauthorized');
    });
  });
});

