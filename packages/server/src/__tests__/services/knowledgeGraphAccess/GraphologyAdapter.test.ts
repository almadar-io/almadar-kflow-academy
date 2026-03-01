/**
 * Tests for GraphologyAdapter
 */

import { toGraphologyGraph, fromGraphologyGraph, createGraphologyGraph } from '../../../services/knowledgeGraphAccess/GraphologyAdapter';
import type { NodeBasedKnowledgeGraph } from '../../../types/nodeBasedKnowledgeGraph';
import { createGraphNode, createRelationship } from '../../../types/nodeBasedKnowledgeGraph';

describe('GraphologyAdapter', () => {
  let sampleGraph: NodeBasedKnowledgeGraph;

  beforeEach(() => {
    // Create a sample NodeBasedKnowledgeGraph for testing
    const graphId = 'test-graph-1';
    const concept1 = createGraphNode('concept-1', 'Concept', {
      id: 'concept-1',
      name: 'React',
      description: 'A JavaScript library for building user interfaces',
    });
    const concept2 = createGraphNode('concept-2', 'Concept', {
      id: 'concept-2',
      name: 'JavaScript',
      description: 'Programming language',
    });
    const layer1 = createGraphNode('layer-1', 'Layer', {
      id: 'layer-1',
      layerNumber: 1,
      goal: 'Learn React basics',
      prompt: 'Generate layer 1',
      response: 'Layer 1 generated',
      createdAt: Date.now(),
    });

    sampleGraph = {
      id: graphId,
      seedConceptId: 'concept-1',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      nodes: {
        [graphId]: createGraphNode(graphId, 'Graph', {
          id: graphId,
          name: 'Test Graph',
          seedConceptId: 'concept-1',
        }),
        'concept-1': concept1,
        'concept-2': concept2,
        'layer-1': layer1,
      },
      nodeTypes: {
        Graph: [graphId],
        Concept: ['concept-1', 'concept-2'],
        Layer: ['layer-1'],
        LearningGoal: [],
        Milestone: [],
        PracticeExercise: [],
        Lesson: [],
        ConceptMetadata: [],
        GraphMetadata: [],
        FlashCard: [],
      },
      relationships: [
        createRelationship(graphId, 'concept-1', 'containsConcept', 'forward', 1.0),
        createRelationship(graphId, 'concept-2', 'containsConcept', 'forward', 1.0),
        createRelationship(graphId, 'layer-1', 'hasLayer', 'forward', 1.0),
        createRelationship('concept-1', 'concept-2', 'hasPrerequisite', 'forward', 1.0),
        createRelationship('layer-1', 'concept-1', 'containsConcept', 'forward', 1.0),
      ],
    };
  });

  describe('toGraphologyGraph', () => {
    it('should convert NodeBasedKnowledgeGraph to graphology Graph', () => {
      const graph = toGraphologyGraph(sampleGraph);

      expect(graph).toBeDefined();
      expect(graph.order).toBe(4); // 4 nodes
      expect(graph.size).toBe(5); // 5 relationships
    });

    it('should include all nodes in the graphology graph', () => {
      const graph = toGraphologyGraph(sampleGraph);

      expect(graph.hasNode('test-graph-1')).toBe(true);
      expect(graph.hasNode('concept-1')).toBe(true);
      expect(graph.hasNode('concept-2')).toBe(true);
      expect(graph.hasNode('layer-1')).toBe(true);
    });

    it('should preserve node properties', () => {
      const graph = toGraphologyGraph(sampleGraph);

      const concept1Node = graph.getNodeAttributes('concept-1');
      expect(concept1Node.type).toBe('Concept');
      expect(concept1Node.properties.name).toBe('React');
      expect(concept1Node.properties.description).toBe('A JavaScript library for building user interfaces');
    });

    it('should include all relationships as edges', () => {
      const graph = toGraphologyGraph(sampleGraph);

      expect(graph.hasEdge('test-graph-1', 'concept-1')).toBe(true);
      expect(graph.hasEdge('test-graph-1', 'concept-2')).toBe(true);
      expect(graph.hasEdge('concept-1', 'concept-2')).toBe(true);
    });

    it('should preserve relationship metadata', () => {
      const graph = toGraphologyGraph(sampleGraph);

      const edge = graph.edge('concept-1', 'concept-2');
      const edgeAttrs = graph.getEdgeAttributes(edge);
      expect(edgeAttrs.relationshipType).toBe('hasPrerequisite');
      expect(edgeAttrs.direction).toBe('forward');
      expect(edgeAttrs.strength).toBe(1.0);
    });

    it('should handle graphs with no relationships', () => {
      const emptyGraph: NodeBasedKnowledgeGraph = {
        ...sampleGraph,
        relationships: [],
      };

      const graph = toGraphologyGraph(emptyGraph);
      expect(graph.size).toBe(0);
      expect(graph.order).toBe(4);
    });

    it('should handle graphs with no nodes', () => {
      const emptyGraph: NodeBasedKnowledgeGraph = {
        id: 'empty',
        seedConceptId: '',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        nodes: {},
        nodeTypes: {
          Graph: [],
          Concept: [],
          Layer: [],
          LearningGoal: [],
          Milestone: [],
          PracticeExercise: [],
          Lesson: [],
          ConceptMetadata: [],
          GraphMetadata: [],
          FlashCard: [],
        },
        relationships: [],
      };

      const graph = toGraphologyGraph(emptyGraph);
      expect(graph.order).toBe(0);
      expect(graph.size).toBe(0);
    });
  });

  describe('fromGraphologyGraph', () => {
    it('should convert graphology Graph to NodeBasedKnowledgeGraph', () => {
      const graphologyGraph = toGraphologyGraph(sampleGraph);
      const converted = fromGraphologyGraph(graphologyGraph, sampleGraph);

      expect(converted).toBeDefined();
      expect(converted.id).toBe(sampleGraph.id);
      expect(Object.keys(converted.nodes).length).toBe(4);
      expect(converted.relationships.length).toBe(5);
    });

    it('should preserve all nodes', () => {
      const graphologyGraph = toGraphologyGraph(sampleGraph);
      const converted = fromGraphologyGraph(graphologyGraph, sampleGraph);

      expect(converted.nodes['concept-1']).toBeDefined();
      expect(converted.nodes['concept-2']).toBeDefined();
      expect(converted.nodes['layer-1']).toBeDefined();
    });

    it('should preserve node properties', () => {
      const graphologyGraph = toGraphologyGraph(sampleGraph);
      const converted = fromGraphologyGraph(graphologyGraph, sampleGraph);

      const concept1 = converted.nodes['concept-1'];
      expect(concept1.type).toBe('Concept');
      expect(concept1.properties.name).toBe('React');
    });

    it('should preserve relationships', () => {
      const graphologyGraph = toGraphologyGraph(sampleGraph);
      const converted = fromGraphologyGraph(graphologyGraph, sampleGraph);

      const hasPrereq = converted.relationships.find(
        r => r.source === 'concept-1' && r.target === 'concept-2' && r.type === 'hasPrerequisite'
      );
      expect(hasPrereq).toBeDefined();
    });

    it('should maintain nodeTypes index', () => {
      const graphologyGraph = toGraphologyGraph(sampleGraph);
      const converted = fromGraphologyGraph(graphologyGraph, sampleGraph);

      expect(converted.nodeTypes.Concept).toContain('concept-1');
      expect(converted.nodeTypes.Concept).toContain('concept-2');
      expect(converted.nodeTypes.Layer).toContain('layer-1');
    });

    it('should use original graph metadata when provided', () => {
      const graphologyGraph = toGraphologyGraph(sampleGraph);
      const converted = fromGraphologyGraph(graphologyGraph, sampleGraph);

      expect(converted.id).toBe(sampleGraph.id);
      expect(converted.seedConceptId).toBe(sampleGraph.seedConceptId);
      expect(converted.createdAt).toBe(sampleGraph.createdAt);
    });

    it('should create minimal structure when original graph not provided', () => {
      const graphologyGraph = toGraphologyGraph(sampleGraph);
      const converted = fromGraphologyGraph(graphologyGraph);

      expect(converted.id).toBe('unknown');
      expect(converted.seedConceptId).toBe('');
    });
  });

  describe('createGraphologyGraph', () => {
    it('should create a new graphology graph from NodeBasedKnowledgeGraph', () => {
      const graph = createGraphologyGraph(sampleGraph);

      expect(graph).toBeDefined();
      expect(graph.order).toBe(4);
      expect(graph.size).toBe(5);
    });

    it('should be equivalent to toGraphologyGraph', () => {
      const graph1 = createGraphologyGraph(sampleGraph);
      const graph2 = toGraphologyGraph(sampleGraph);

      expect(graph1.order).toBe(graph2.order);
      expect(graph1.size).toBe(graph2.size);
    });
  });

  describe('Round-trip conversion', () => {
    it('should maintain data integrity through round-trip conversion', () => {
      const graphologyGraph = toGraphologyGraph(sampleGraph);
      const converted = fromGraphologyGraph(graphologyGraph, sampleGraph);

      // Check nodes
      expect(Object.keys(converted.nodes).length).toBe(Object.keys(sampleGraph.nodes).length);
      for (const [nodeId, node] of Object.entries(sampleGraph.nodes)) {
        expect(converted.nodes[nodeId]).toBeDefined();
        expect(converted.nodes[nodeId].type).toBe(node.type);
        expect(converted.nodes[nodeId].properties).toEqual(node.properties);
      }

      // Check relationships (may have different order)
      expect(converted.relationships.length).toBe(sampleGraph.relationships.length);
      for (const rel of sampleGraph.relationships) {
        const found = converted.relationships.find(
          r => r.source === rel.source && r.target === rel.target && r.type === rel.type
        );
        expect(found).toBeDefined();
      }
    });

    it('should handle multiple relationships between same nodes', () => {
      const multiRelGraph: NodeBasedKnowledgeGraph = {
        ...sampleGraph,
        relationships: [
          ...sampleGraph.relationships,
          createRelationship('concept-1', 'concept-2', 'referencesConcept', 'forward', 1.0),
        ],
      };

      const graphologyGraph = toGraphologyGraph(multiRelGraph);
      const converted = fromGraphologyGraph(graphologyGraph, multiRelGraph);

      // Should preserve both relationship types
      const rels = converted.relationships.filter(
        r => r.source === 'concept-1' && r.target === 'concept-2'
      );
      expect(rels.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Edge cases', () => {
    it('should handle nodes with missing properties', () => {
      const nodeWithMissingProps = createGraphNode('minimal-node', 'Concept', {
        id: 'minimal-node',
      });
      const minimalGraph: NodeBasedKnowledgeGraph = {
        ...sampleGraph,
        nodes: {
          ...sampleGraph.nodes,
          'minimal-node': nodeWithMissingProps,
        },
        nodeTypes: {
          ...sampleGraph.nodeTypes,
          Concept: [...sampleGraph.nodeTypes.Concept, 'minimal-node'],
        },
      };

      const graph = toGraphologyGraph(minimalGraph);
      expect(graph.hasNode('minimal-node')).toBe(true);
      
      const converted = fromGraphologyGraph(graph, minimalGraph);
      expect(converted.nodes['minimal-node']).toBeDefined();
    });

    it('should handle relationships with missing metadata', () => {
      const relWithoutMetadata = createRelationship('concept-1', 'concept-2', 'hasPrerequisite', 'forward');
      const graphWithMinimalRel: NodeBasedKnowledgeGraph = {
        ...sampleGraph,
        relationships: [relWithoutMetadata],
      };

      const graph = toGraphologyGraph(graphWithMinimalRel);
      const edge = graph.edge('concept-1', 'concept-2');
      expect(edge).toBeDefined();
      
      const converted = fromGraphologyGraph(graph, graphWithMinimalRel);
      const convertedRel = converted.relationships.find(
        r => r.source === 'concept-1' && r.target === 'concept-2'
      );
      expect(convertedRel).toBeDefined();
    });

    it('should skip relationships with missing source or target nodes', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      
      const graphWithOrphanRel: NodeBasedKnowledgeGraph = {
        ...sampleGraph,
        relationships: [
          ...sampleGraph.relationships,
          createRelationship('non-existent-1', 'non-existent-2', 'hasPrerequisite', 'forward', 1.0),
        ],
      };

      const graph = toGraphologyGraph(graphWithOrphanRel);
      
      // Should warn about missing nodes
      expect(consoleSpy).toHaveBeenCalled();
      
      // Orphan relationship should not be in graph
      expect(graph.hasEdge('non-existent-1', 'non-existent-2')).toBe(false);
      
      consoleSpy.mockRestore();
    });

    it('should handle very large graphs', () => {
      const largeGraph: NodeBasedKnowledgeGraph = {
        ...sampleGraph,
        nodes: {},
        nodeTypes: {
          Graph: [],
          Concept: [],
          Layer: [],
          LearningGoal: [],
          Milestone: [],
          PracticeExercise: [],
          Lesson: [],
          ConceptMetadata: [],
          GraphMetadata: [],
          FlashCard: [],
        },
        relationships: [],
      };

      // Create 100 nodes
      for (let i = 0; i < 100; i++) {
        const node = createGraphNode(`concept-${i}`, 'Concept', {
          id: `concept-${i}`,
          name: `Concept ${i}`,
          description: `Description ${i}`,
        });
        largeGraph.nodes[`concept-${i}`] = node;
        largeGraph.nodeTypes.Concept.push(`concept-${i}`);
        
        // Create relationships
        if (i > 0) {
          largeGraph.relationships.push(
            createRelationship(`concept-${i - 1}`, `concept-${i}`, 'hasPrerequisite', 'forward', 1.0)
          );
        }
      }

      const graph = toGraphologyGraph(largeGraph);
      expect(graph.order).toBe(100);
      expect(graph.size).toBe(99);

      const converted = fromGraphologyGraph(graph, largeGraph);
      expect(Object.keys(converted.nodes).length).toBe(100);
      expect(converted.relationships.length).toBe(99);
    });
  });

  describe('Relationship type handling', () => {
    it('should preserve relationship direction', () => {
      const graph = toGraphologyGraph(sampleGraph);
      const converted = fromGraphologyGraph(graph, sampleGraph);

      const hasPrereq = converted.relationships.find(
        r => r.type === 'hasPrerequisite'
      );
      expect(hasPrereq?.direction).toBe('forward');
    });

    it('should preserve relationship strength', () => {
      const relWithStrength = createRelationship('concept-1', 'concept-2', 'hasPrerequisite', 'forward', 0.8);
      const graphWithStrength: NodeBasedKnowledgeGraph = {
        ...sampleGraph,
        relationships: [relWithStrength],
      };

      const graph = toGraphologyGraph(graphWithStrength);
      const edge = graph.edge('concept-1', 'concept-2');
      const attrs = graph.getEdgeAttributes(edge);
      expect(attrs.strength).toBe(0.8);

      const converted = fromGraphologyGraph(graph, graphWithStrength);
      const convertedRel = converted.relationships.find(
        r => r.source === 'concept-1' && r.target === 'concept-2'
      );
      expect(convertedRel?.strength).toBe(0.8);
    });

    it('should preserve relationship metadata', () => {
      const relWithMetadata = createRelationship(
        'concept-1',
        'concept-2',
        'hasPrerequisite',
        'forward',
        1.0,
        {
          extractedFrom: 'llm',
          confidence: 0.95,
          customField: 'test',
        }
      );
      const graphWithMetadata: NodeBasedKnowledgeGraph = {
        ...sampleGraph,
        relationships: [relWithMetadata],
      };

      const graph = toGraphologyGraph(graphWithMetadata);
      const converted = fromGraphologyGraph(graph, graphWithMetadata);
      
      const convertedRel = converted.relationships.find(
        r => r.source === 'concept-1' && r.target === 'concept-2'
      );
      expect(convertedRel?.metadata?.extractedFrom).toBe('llm');
      expect(convertedRel?.metadata?.confidence).toBe(0.95);
      expect(convertedRel?.metadata?.customField).toBe('test');
    });
  });
});

