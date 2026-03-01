/**
 * Integration Tests for Graph Query Service
 * 
 * Tests backward compatibility with old graphs (hasChild only) and new graphs (bidirectional)
 */

import { GraphQueryService } from '../../services/graphQueryService';
import type { NodeBasedKnowledgeGraph } from '../../types/nodeBasedKnowledgeGraph';
import { createGraphNode, createRelationship } from '../../types/nodeBasedKnowledgeGraph';

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

describe('Graph Query Integration - Backward Compatibility', () => {
  let queryService: GraphQueryService;
  const uid = 'test-user-1';
  const graphId = 'test-graph-1';
  const seedConceptId = 'seed-concept-1';

  beforeEach(() => {
    queryService = new GraphQueryService();
    jest.clearAllMocks();
  });

  describe('existing graphs without hasParent relationships (backward compat)', () => {
    it('should work with old graphs that only have hasChild relationships', async () => {
      // Create an old-style graph with only hasChild relationships
      const oldGraph: NodeBasedKnowledgeGraph = {
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
          'child-1': createGraphNode('child-1', 'Concept', {
            name: 'Components',
            description: 'Building blocks',
          }),
          'child-2': createGraphNode('child-2', 'Concept', {
            name: 'JSX',
            description: 'Syntax extension',
          }),
          'layer-1': createGraphNode('layer-1', 'Layer', {
            layerNumber: 1,
            goal: 'Learn basics',
          }),
        },
        relationships: [
          // Old way: only hasChild relationships (no hasParent)
          createRelationship(seedConceptId, 'child-1', 'hasChild', 'forward'),
          createRelationship(seedConceptId, 'child-2', 'hasChild', 'forward'),
          createRelationship('layer-1', 'child-1', 'belongsToLayer', 'forward'),
          createRelationship('layer-1', 'child-2', 'belongsToLayer', 'forward'),
        ],
        nodeTypes: {
          Graph: [graphId],
          Concept: [seedConceptId, 'child-1', 'child-2'],
          Layer: ['layer-1'],
          LearningGoal: [],
          Milestone: [],
          PracticeExercise: [],
          Lesson: [],
          ConceptMetadata: [],
          GraphMetadata: [],
          FlashCard: [],
        },
      };

      mockGetGraph.mockResolvedValue(oldGraph);

      const result = await queryService.getConceptsByLayer(uid, graphId, {
        includeRelationships: true,
        groupByLayer: false,
      });

      // Should find children for parent (via hasChild)
      const reactConcept = result.concepts.find(c => c.name === 'React');
      expect(reactConcept).toBeDefined();
      expect(reactConcept!.children).toContain('Components');
      expect(reactConcept!.children).toContain('JSX');

      // Should find parents for children (via hasChild - backward compat)
      const componentsConcept = result.concepts.find(c => c.name === 'Components');
      expect(componentsConcept).toBeDefined();
      expect(componentsConcept!.parents).toContain('React');

      const jsxConcept = result.concepts.find(c => c.name === 'JSX');
      expect(jsxConcept).toBeDefined();
      expect(jsxConcept!.parents).toContain('React');
    });

    it('should work with new graphs that have bidirectional relationships', async () => {
      // Create a new-style graph with bidirectional relationships
      const newGraph: NodeBasedKnowledgeGraph = {
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
          'child-1': createGraphNode('child-1', 'Concept', {
            name: 'Components',
            description: 'Building blocks',
          }),
          'child-2': createGraphNode('child-2', 'Concept', {
            name: 'JSX',
            description: 'Syntax extension',
          }),
          'layer-1': createGraphNode('layer-1', 'Layer', {
            layerNumber: 1,
            goal: 'Learn basics',
          }),
        },
        relationships: [
          // New way: bidirectional relationships
          createRelationship(seedConceptId, 'child-1', 'hasChild', 'forward'),
          createRelationship('child-1', seedConceptId, 'hasParent', 'forward'),
          createRelationship(seedConceptId, 'child-2', 'hasChild', 'forward'),
          createRelationship('child-2', seedConceptId, 'hasParent', 'forward'),
          createRelationship('layer-1', 'child-1', 'belongsToLayer', 'forward'),
          createRelationship('layer-1', 'child-2', 'belongsToLayer', 'forward'),
        ],
        nodeTypes: {
          Graph: [graphId],
          Concept: [seedConceptId, 'child-1', 'child-2'],
          Layer: ['layer-1'],
          LearningGoal: [],
          Milestone: [],
          PracticeExercise: [],
          Lesson: [],
          ConceptMetadata: [],
          GraphMetadata: [],
          FlashCard: [],
        },
      };

      mockGetGraph.mockResolvedValue(newGraph);

      const result = await queryService.getConceptsByLayer(uid, graphId, {
        includeRelationships: true,
        groupByLayer: false,
      });

      // Should find children for parent (via hasChild)
      const reactConcept = result.concepts.find(c => c.name === 'React');
      expect(reactConcept).toBeDefined();
      expect(reactConcept!.children).toContain('Components');
      expect(reactConcept!.children).toContain('JSX');

      // Should find parents for children (via hasParent - new way)
      const componentsConcept = result.concepts.find(c => c.name === 'Components');
      expect(componentsConcept).toBeDefined();
      expect(componentsConcept!.parents).toContain('React');

      const jsxConcept = result.concepts.find(c => c.name === 'JSX');
      expect(jsxConcept).toBeDefined();
      expect(jsxConcept!.parents).toContain('React');
    });

    it('should work with mixed graphs (some old, some new relationships)', async () => {
      // Create a mixed graph with both old and new relationship patterns
      const mixedGraph: NodeBasedKnowledgeGraph = {
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
          'child-1': createGraphNode('child-1', 'Concept', {
            name: 'Components',
            description: 'Building blocks',
          }),
          'child-2': createGraphNode('child-2', 'Concept', {
            name: 'JSX',
            description: 'Syntax extension',
          }),
          'layer-1': createGraphNode('layer-1', 'Layer', {
            layerNumber: 1,
            goal: 'Learn basics',
          }),
        },
        relationships: [
          // Old way: only hasChild for child-1
          createRelationship(seedConceptId, 'child-1', 'hasChild', 'forward'),
          // New way: bidirectional for child-2
          createRelationship(seedConceptId, 'child-2', 'hasChild', 'forward'),
          createRelationship('child-2', seedConceptId, 'hasParent', 'forward'),
          createRelationship('layer-1', 'child-1', 'belongsToLayer', 'forward'),
          createRelationship('layer-1', 'child-2', 'belongsToLayer', 'forward'),
        ],
        nodeTypes: {
          Graph: [graphId],
          Concept: [seedConceptId, 'child-1', 'child-2'],
          Layer: ['layer-1'],
          LearningGoal: [],
          Milestone: [],
          PracticeExercise: [],
          Lesson: [],
          ConceptMetadata: [],
          GraphMetadata: [],
          FlashCard: [],
        },
      };

      mockGetGraph.mockResolvedValue(mixedGraph);

      const result = await queryService.getConceptsByLayer(uid, graphId, {
        includeRelationships: true,
        groupByLayer: false,
      });

      // Both children should be found
      const reactConcept = result.concepts.find(c => c.name === 'React');
      expect(reactConcept).toBeDefined();
      expect(reactConcept!.children).toContain('Components');
      expect(reactConcept!.children).toContain('JSX');

      // child-1 should find parent via hasChild (backward compat)
      const componentsConcept = result.concepts.find(c => c.name === 'Components');
      expect(componentsConcept).toBeDefined();
      expect(componentsConcept!.parents).toContain('React');

      // child-2 should find parent via hasParent (new way)
      const jsxConcept = result.concepts.find(c => c.name === 'JSX');
      expect(jsxConcept).toBeDefined();
      expect(jsxConcept!.parents).toContain('React');
    });
  });

  describe('getMindMapStructure - Integration Tests', () => {
    it('should return mindmap structure with correct hierarchy', async () => {
      const seedConcept = createGraphNode(seedConceptId, 'Concept', {
        name: 'React',
        description: 'A JavaScript library',
        isSeed: true,
        layer: 0,
      });

      const layer1 = createGraphNode('layer-1', 'Layer', {
        number: 1,
        goal: 'Learn basics',
      });

      const concept1 = createGraphNode('concept-1', 'Concept', {
        name: 'Components',
        description: 'Building blocks',
        layer: 1,
        sequence: 1,
      });

      const concept2 = createGraphNode('concept-2', 'Concept', {
        name: 'JSX',
        description: 'Syntax extension',
        layer: 1,
        sequence: 2,
      });

      const childConcept = createGraphNode('child-1', 'Concept', {
        name: 'Functional Components',
        description: 'Function-based components',
        layer: 1,
      });

      const graph: NodeBasedKnowledgeGraph = {
        id: graphId,
        seedConceptId,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        nodes: {
          [graphId]: createGraphNode(graphId, 'Graph', { id: graphId }),
          [seedConceptId]: seedConcept,
          'layer-1': layer1,
          'concept-1': concept1,
          'concept-2': concept2,
          'child-1': childConcept,
        },
        relationships: [
          createRelationship('concept-1', 'layer-1', 'belongsToLayer', 'forward'),
          createRelationship('concept-2', 'layer-1', 'belongsToLayer', 'forward'),
          createRelationship('concept-1', 'child-1', 'hasChild', 'forward'),
        ],
        nodeTypes: {
          Graph: [graphId],
          Concept: [seedConceptId, 'concept-1', 'concept-2', 'child-1'],
          Layer: ['layer-1'],
          LearningGoal: [],
          Milestone: [],
          PracticeExercise: [],
          Lesson: [],
          ConceptMetadata: [],
          GraphMetadata: [],
          FlashCard: [],
        },
      };

      mockGetGraph.mockResolvedValue(graph);

      const result = await queryService.getMindMapStructure(uid, graphId);

      expect(result.nodes).toHaveLength(5); // seed + layer + 3 concepts
      expect(result.seedNodeId).toBe(seedConceptId);
      expect(result.totalNodes).toBe(5);
      expect(result.layerCount).toBe(1);
      expect(result.conceptCount).toBe(4); // seed + 3 concepts

      // Verify hierarchy
      const seedNode = result.nodes.find(n => n.id === seedConceptId);
      expect(seedNode).toBeDefined();
      expect(seedNode!.level).toBe(0);
      expect(seedNode!.children).toContain('layer-1');

      const layerNode = result.nodes.find(n => n.id === 'layer-1');
      expect(layerNode).toBeDefined();
      expect(layerNode!.level).toBe(1);
      expect(layerNode!.parentId).toBe(seedConceptId);
      expect(layerNode!.children).toContain('concept-1');
      expect(layerNode!.children).toContain('concept-2');

      const concept1Node = result.nodes.find(n => n.id === 'concept-1');
      expect(concept1Node).toBeDefined();
      expect(concept1Node!.level).toBe(2);
      expect(concept1Node!.parentId).toBe('layer-1');
      expect(concept1Node!.children).toContain('child-1');

      const childNode = result.nodes.find(n => n.id === 'child-1');
      expect(childNode).toBeDefined();
      expect(childNode!.level).toBe(3);
      expect(childNode!.parentId).toBe('concept-1');
    });
  });
});

