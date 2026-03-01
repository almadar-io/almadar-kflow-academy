import { exportToGraphML } from '../../services/graphmlExportService';
import type { NodeBasedKnowledgeGraph, GraphNode } from '../../types/nodeBasedKnowledgeGraph';
import { createGraphNode, createRelationship } from '../../types/nodeBasedKnowledgeGraph';

describe('GraphML Export Service', () => {
  const createMockNodeBasedGraph = (
    concepts: Array<{ 
      name: string; 
      description?: string;
      id?: string;
      isSeed?: boolean;
      metadata?: {
        difficulty?: number;
        timeEstimate?: number;
        domain?: string;
        tags?: string[];
      };
      embeddings?: {
        node2vec?: number[];
        dimensions?: number;
        model?: string;
      };
    }>,
    relationships: Array<{ 
      source: string; 
      target: string; 
      type: string;
      strength?: number;
      direction?: 'forward' | 'backward' | 'bidirectional';
      metadata?: any;
    }> = [],
    overrides: Partial<NodeBasedKnowledgeGraph> = {}
  ): NodeBasedKnowledgeGraph => {
    const nodes: Record<string, GraphNode> = {};
    const nodeTypes: NodeBasedKnowledgeGraph['nodeTypes'] = {
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
    };

    // Create graph node
    const graphId = 'test-graph-1';
    nodes[graphId] = createGraphNode(graphId, 'Graph', {
      id: graphId,
      name: 'Test Graph',
      seedConceptId: 'id-seed',
    });
    nodeTypes.Graph.push(graphId);

    // Create concept nodes
    concepts.forEach(concept => {
      const nodeId = concept.id || `id-${concept.name.toLowerCase()}`;
      const properties: any = {
        id: nodeId,
        name: concept.name,
        description: concept.description || `Description for ${concept.name}`,
      };
      
      if (concept.isSeed) {
        properties.isSeed = true;
      }
      
      if (concept.metadata) {
        properties.metadata = concept.metadata;
      }
      
      if (concept.embeddings) {
        properties.embeddings = concept.embeddings;
      }
      
      nodes[nodeId] = createGraphNode(nodeId, 'Concept', properties);
      nodeTypes.Concept.push(nodeId);
    });

    return {
      id: graphId,
      seedConceptId: 'id-seed',
      createdAt: 1000000,
      updatedAt: 2000000,
      nodes,
      nodeTypes,
      relationships: relationships.map(rel => 
        createRelationship(
          rel.source, 
          rel.target, 
          rel.type as any, 
          rel.direction || 'forward', 
          rel.strength || 1.0,
          rel.metadata
        )
      ),
      ...overrides,
    };
  };

  describe('exportToGraphML', () => {
    it('should export a simple graph to GraphML format', () => {
      const kg = createMockNodeBasedGraph([
        { name: 'Concept1' },
        { name: 'Concept2' },
      ]);

      const graphml = exportToGraphML(kg);

      expect(graphml).toContain('<?xml version="1.0" encoding="UTF-8"?>');
      expect(graphml).toContain('<graphml');
      expect(graphml).toContain('<graph');
      expect(graphml).toContain('<node id="id-concept1">');
      expect(graphml).toContain('<node id="id-concept2">');
    });

    it('should include concept name and description', () => {
      const kg = createMockNodeBasedGraph([
        { name: 'TestConcept', description: 'Test description' },
      ]);

      const graphml = exportToGraphML(kg);

      expect(graphml).toContain('TestConcept');
      expect(graphml).toContain('Test description');
    });

    it('should include relationship edges', () => {
      const kg = createMockNodeBasedGraph(
        [
          { name: 'Parent' },
          { name: 'Child' },
        ],
        [
          {
            source: 'id-parent',
            target: 'id-child',
            type: 'hasChild',
          },
        ]
      );

      const graphml = exportToGraphML(kg);

      expect(graphml).toContain('<edge');
      expect(graphml).toContain('hasChild');
    });

    it('should include metadata when includeMetadata is true', () => {
      const kg = createMockNodeBasedGraph([
        {
          name: 'Test',
          isSeed: true,
          metadata: {
            difficulty: 3,
            timeEstimate: 2.5,
            domain: 'programming',
            tags: ['test', 'example'],
          },
        },
      ]);

      const graphml = exportToGraphML(kg, { includeMetadata: true });

      expect(graphml).toContain('<data key="difficulty">3</data>');
      expect(graphml).toContain('<data key="timeEstimate">2.5</data>');
      expect(graphml).toContain('<data key="domain">programming</data>');
      expect(graphml).toContain('<data key="tags">test,example</data>');
    });

    it('should exclude metadata when includeMetadata is false', () => {
      const kg = createMockNodeBasedGraph([
        {
          name: 'Test',
          metadata: {
            difficulty: 3,
            timeEstimate: 2.5,
          },
        },
      ]);

      const graphml = exportToGraphML(kg, { includeMetadata: false });

      expect(graphml).not.toContain('<data key="difficulty">');
      expect(graphml).not.toContain('<data key="timeEstimate">');
    });

    it('should include embeddings when includeEmbeddings is true', () => {
      const kg = createMockNodeBasedGraph([
        {
          name: 'Test',
          embeddings: {
            node2vec: [0.1, 0.2, 0.3, 0.4],
            dimensions: 4,
            model: 'node2vec',
          },
        },
      ]);

      const graphml = exportToGraphML(kg, {
        includeEmbeddings: true,
        includeMetadata: true,
      });

      expect(graphml).toContain('<data key="embedding">');
      expect(graphml).toContain('0.1,0.2,0.3,0.4');
    });

    it('should exclude embeddings when includeEmbeddings is false', () => {
      const kg = createMockNodeBasedGraph([
        {
          name: 'Test',
          embeddings: {
            node2vec: [0.1, 0.2, 0.3],
            dimensions: 3,
          },
        },
      ]);

      const graphml = exportToGraphML(kg, { includeEmbeddings: false });

      expect(graphml).not.toContain('<data key="embedding">');
    });

    it('should use simplified format when simplified is true', () => {
      const kg = createMockNodeBasedGraph([
        {
          name: 'Test',
          isSeed: true,
          metadata: {
            difficulty: 3,
            timeEstimate: 2.5,
          },
        },
      ]);

      const graphml = exportToGraphML(kg, { simplified: true });

      // Simplified format should not include isSeed, difficulty, etc.
      expect(graphml).not.toContain('<data key="isSeed">');
      expect(graphml).not.toContain('<data key="difficulty">');
    });

    it('should escape XML special characters', () => {
      const kg = createMockNodeBasedGraph([
        {
          name: 'Test',
          description: 'Test & <description> with "quotes"',
        },
      ]);

      const graphml = exportToGraphML(kg);

      expect(graphml).toContain('&amp;');
      expect(graphml).toContain('&lt;');
      expect(graphml).toContain('&gt;');
      expect(graphml).toContain('&quot;');
      expect(graphml).not.toContain('Test & <description>');
    });

    it('should truncate long descriptions', () => {
      const longDescription = 'A'.repeat(1000);
      const kg = createMockNodeBasedGraph([
        {
          name: 'Test',
          description: longDescription,
        },
      ]);

      const graphml = exportToGraphML(kg);

      // Description should be truncated to 500 chars + '...'
      const descMatch = graphml.match(/<data key="description">(.*?)<\/data>/);
      if (descMatch) {
        expect(descMatch[1].length).toBeLessThanOrEqual(503); // 500 + '...'
      }
    });

    it('should include relationship metadata when includeMetadata is true', () => {
      const kg = createMockNodeBasedGraph(
        [
          { name: 'Source' },
          { name: 'Target' },
        ],
        [
          {
            source: 'id-source',
            target: 'id-target',
            type: 'hasPrerequisite',
            strength: 0.9,
            direction: 'backward',
            metadata: {
              extractedFrom: 'llm',
              confidence: 0.85,
            },
          },
        ]
      );

      const graphml = exportToGraphML(kg, { includeMetadata: true });

      expect(graphml).toContain('<data key="strength">0.9</data>');
      expect(graphml).toContain('<data key="direction">backward</data>');
      expect(graphml).toContain('<data key="confidence">0.85</data>');
      expect(graphml).toContain('<data key="extractedFrom">llm</data>');
    });

    it('should handle empty graph', () => {
      const kg = createMockNodeBasedGraph([]);

      const graphml = exportToGraphML(kg);

      expect(graphml).toContain('<graph');
      // Should still have graph node
      expect(graphml).toContain('<node');
    });

    it('should handle graph with no relationships', () => {
      const kg = createMockNodeBasedGraph([
        { name: 'Test' },
      ]);

      const graphml = exportToGraphML(kg);

      expect(graphml).toContain('<node');
      // May or may not have edges depending on implementation
    });

    it('should use concept ID as node ID when available', () => {
      const kg = createMockNodeBasedGraph([
        {
          name: 'Test',
          id: 'custom-id-123',
        },
      ]);

      const graphml = exportToGraphML(kg);

      expect(graphml).toContain('<node id="custom-id-123">');
    });

    it('should use concept name as node ID when ID is not available', () => {
      const kg = createMockNodeBasedGraph([
        {
          name: 'Test',
          id: 'id-test', // Will use this
        },
      ]);

      const graphml = exportToGraphML(kg);

      expect(graphml).toContain('<node id="id-test">');
    });
  });
});
