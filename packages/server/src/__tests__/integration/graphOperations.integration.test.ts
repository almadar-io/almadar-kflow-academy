/**
 * Integration Tests for Graph Operations
 * 
 * Tests the full flow: progressiveExpand -> mutations -> graph update -> query
 */

import { progressiveExpandMultipleFromText } from '../../services/graphOperations/progressiveExpandMultipleFromText';
import { GraphMutationService } from '../../services/graphMutationService';
import { GraphQueryService } from '../../services/graphQueryService';
import type { NodeBasedKnowledgeGraph } from '../../types/nodeBasedKnowledgeGraph';
import { createGraphNode } from '../../types/nodeBasedKnowledgeGraph';
import { callLLM } from '../../services/llm';

// Mock LLM service
jest.mock('../../services/llm', () => ({
  callLLM: jest.fn(),
}));

// Mock Firestore
jest.mock('../../config/firebaseAdmin', () => ({
  getFirestore: jest.fn(() => ({
    collection: jest.fn(() => ({
      doc: jest.fn(() => ({
        collection: jest.fn(() => ({
          select: jest.fn(() => ({
            get: jest.fn(),
          })),
        })),
      })),
    })),
  })),
}));

// Mock KnowledgeGraphAccessLayer
jest.mock('../../services/knowledgeGraphAccess/KnowledgeGraphAccessLayer', () => {
  const mockGetGraph = jest.fn();
  return {
    KnowledgeGraphAccessLayer: jest.fn().mockImplementation(() => ({
      getGraph: mockGetGraph,
    })),
    __mocks: {
      mockGetGraph,
    },
  };
});

const { mockGetGraph } = require('../../services/knowledgeGraphAccess/KnowledgeGraphAccessLayer').__mocks;

describe('Graph Operations Integration', () => {
  let mutationService: GraphMutationService;
  let queryService: GraphQueryService;
  const uid = 'test-user-1';
  const graphId = 'test-graph-1';
  const seedConceptId = 'seed-concept-1';

  beforeEach(() => {
    mutationService = new GraphMutationService();
    queryService = new GraphQueryService();
    jest.clearAllMocks();
  });

  describe('progressiveExpand -> getConceptsByLayer flow', () => {
    it('should create bidirectional relationships and return them in query', async () => {
      // Create initial graph with seed concept
      let graph: NodeBasedKnowledgeGraph = {
        id: graphId,
        seedConceptId,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        nodes: {
          [graphId]: createGraphNode(graphId, 'Graph', { id: graphId }),
          [seedConceptId]: createGraphNode(seedConceptId, 'Concept', {
            name: 'React',
            description: 'A JavaScript library',
          }),
        },
        relationships: [],
        nodeTypes: {
          Graph: [graphId],
          Concept: [seedConceptId],
          Layer: [],
          LearningGoal: [],
          Milestone: [],
          PracticeExercise: [],
          Lesson: [],
          ConceptMetadata: [],
          GraphMetadata: [],
          FlashCard: [],
        },
      };

      // Mock LLM response for progressive expand
      const mockResponse = {
        content: `
          <level-name>Foundation</level-name>
          <goal>Learn React basics</goal>
          <concept>Components</concept>
          <description>Building blocks of React</description>
          <parents>React</parents>
          <concept>JSX</concept>
          <description>JavaScript syntax extension</description>
          <parents>React</parents>
        `,
        model: 'deepseek-chat',
      };

      (callLLM as jest.Mock).mockResolvedValue(mockResponse);

      // Step 1: Run progressive expand operation
      const expandResult = await progressiveExpandMultipleFromText({
        graph,
        mutationContext: {
          graphId,
          seedConceptId,
          existingNodes: graph.nodes,
          existingRelationships: graph.relationships,
        },
        numConcepts: 2,
      });

      expect(expandResult).toHaveProperty('mutations');
      if ('mutations' in expandResult) {
        // Step 2: Apply mutations to graph
        const { graph: updatedGraph } = mutationService.applyMutationBatchSafe(
          graph,
          expandResult.mutations
        );

        // Step 3: Verify bidirectional relationships were created
        const hasChildRels = updatedGraph.relationships.filter(
          r => r.type === 'hasChild'
        );
        const hasParentRels = updatedGraph.relationships.filter(
          r => r.type === 'hasParent'
        );

        // Should have 2 hasChild and 2 hasParent relationships (one for each concept)
        expect(hasChildRels.length).toBe(2);
        expect(hasParentRels.length).toBe(2);

        // Verify relationships point to seed concept
        const seedHasChildRels = hasChildRels.filter(
          r => r.source === seedConceptId
        );
        expect(seedHasChildRels.length).toBe(2);

        const seedHasParentRels = hasParentRels.filter(
          r => r.target === seedConceptId
        );
        expect(seedHasParentRels.length).toBe(2);

        // Step 4: Query the graph and verify relationships are returned
        mockGetGraph.mockResolvedValue(updatedGraph);

        const queryResult = await queryService.getConceptsByLayer(uid, graphId, {
          includeRelationships: true,
          groupByLayer: false,
        });

        // Find the child concepts in query results
        const componentsConcept = queryResult.concepts.find(
          c => c.name === 'Components'
        );
        const jsxConcept = queryResult.concepts.find(c => c.name === 'JSX');

        expect(componentsConcept).toBeDefined();
        expect(jsxConcept).toBeDefined();

        // Both should have React as parent
        expect(componentsConcept!.parents).toContain('React');
        expect(jsxConcept!.parents).toContain('React');

        // Find the seed concept in query results
        const reactConcept = queryResult.concepts.find(c => c.name === 'React');
        expect(reactConcept).toBeDefined();
        expect(reactConcept!.children).toContain('Components');
        expect(reactConcept!.children).toContain('JSX');
      }
    });

    it('should handle multiple parents correctly in full flow', async () => {
      // Create initial graph with multiple parent concepts
      let graph: NodeBasedKnowledgeGraph = {
        id: graphId,
        seedConceptId,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        nodes: {
          [graphId]: createGraphNode(graphId, 'Graph', { id: graphId }),
          [seedConceptId]: createGraphNode(seedConceptId, 'Concept', {
            name: 'React',
            description: 'A JavaScript library',
          }),
          'parent-2': createGraphNode('parent-2', 'Concept', {
            name: 'JavaScript',
            description: 'Programming language',
          }),
        },
        relationships: [],
        nodeTypes: {
          Graph: [graphId],
          Concept: [seedConceptId, 'parent-2'],
          Layer: [],
          LearningGoal: [],
          Milestone: [],
          PracticeExercise: [],
          Lesson: [],
          ConceptMetadata: [],
          GraphMetadata: [],
          FlashCard: [],
        },
      };

      // Mock LLM response with concept that has multiple parents
      const mockResponse = {
        content: `
          <level-name>Foundation</level-name>
          <concept>React Components</concept>
          <description>React building blocks</description>
          <parents>React, JavaScript</parents>
        `,
        model: 'deepseek-chat',
      };

      (callLLM as jest.Mock).mockResolvedValue(mockResponse);

      // Step 1: Run progressive expand
      const expandResult = await progressiveExpandMultipleFromText({
        graph,
        mutationContext: {
          graphId,
          seedConceptId,
          existingNodes: graph.nodes,
          existingRelationships: graph.relationships,
        },
        numConcepts: 1,
      });

      if ('mutations' in expandResult) {
        // Step 2: Apply mutations
        const { graph: updatedGraph } = mutationService.applyMutationBatchSafe(
          graph,
          expandResult.mutations
        );

        // Step 3: Verify relationships for both parents
        const hasChildRels = updatedGraph.relationships.filter(
          r => r.type === 'hasChild'
        );
        const hasParentRels = updatedGraph.relationships.filter(
          r => r.type === 'hasParent'
        );

        // Should have 2 hasChild (one from each parent) and 2 hasParent (one pointing to each parent)
        expect(hasChildRels.length).toBe(2);
        expect(hasParentRels.length).toBe(2);

        // Step 4: Query and verify
        mockGetGraph.mockResolvedValue(updatedGraph);

        const queryResult = await queryService.getConceptsByLayer(uid, graphId, {
          includeRelationships: true,
          groupByLayer: false,
        });

        const reactComponentsConcept = queryResult.concepts.find(
          c => c.name === 'React Components'
        );
        expect(reactComponentsConcept).toBeDefined();
        expect(reactComponentsConcept!.parents).toContain('React');
        expect(reactComponentsConcept!.parents).toContain('JavaScript');
      }
    });
  });
});

