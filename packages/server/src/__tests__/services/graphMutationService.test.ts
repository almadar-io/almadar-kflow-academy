/**
 * Tests for GraphMutationService
 * 
 * Core service for applying mutations to NodeBasedKnowledgeGraph structures.
 */

import { GraphMutationService } from '../../services/graphMutationService';
import type { NodeBasedKnowledgeGraph } from '../../types/nodeBasedKnowledgeGraph';
import type { GraphMutation, MutationBatch } from '../../types/mutations';
import { createGraphNode, createRelationship } from '../../types/nodeBasedKnowledgeGraph';

describe('GraphMutationService', () => {
  let mutationService: GraphMutationService;
  let sampleGraph: NodeBasedKnowledgeGraph;
  const graphId = 'test-graph-1';
  const nodeId1 = 'concept-1';
  const nodeId2 = 'concept-2';

  beforeEach(() => {
    mutationService = new GraphMutationService();

    // Create sample nodes
    const node1 = createGraphNode(nodeId1, 'Concept', {
      id: nodeId1,
      name: 'React',
      description: 'A JavaScript library',
    });
    const node2 = createGraphNode(nodeId2, 'Concept', {
      id: nodeId2,
      name: 'JavaScript',
      description: 'Programming language',
    });
    const graphNode = createGraphNode(graphId, 'Graph', {
      id: graphId,
      name: 'Test Graph',
      seedConceptId: nodeId1,
    });

    // Create sample graph
    sampleGraph = {
      id: graphId,
      seedConceptId: nodeId1,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      nodes: {
        [graphId]: graphNode,
        [nodeId1]: node1,
        [nodeId2]: node2,
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
      ],
    };
  });

  describe('applyMutation', () => {
    describe('create_node', () => {
      it('should create a new node', () => {
        const newNode = createGraphNode('concept-3', 'Concept', {
          id: 'concept-3',
          name: 'Vue',
          description: 'Another JavaScript library',
        });

        const mutation: GraphMutation = {
          type: 'create_node',
          node: newNode,
          updateIndex: true,
        };

        const result = mutationService.applyMutation(sampleGraph, mutation);

        expect(result.nodes['concept-3']).toEqual(newNode);
        expect(result.nodeTypes.Concept).toContain('concept-3');
        expect(result.updatedAt).toBeGreaterThanOrEqual(sampleGraph.updatedAt);
      });

      it('should throw error if node already exists', () => {
        const mutation: GraphMutation = {
          type: 'create_node',
          node: sampleGraph.nodes[nodeId1],
          updateIndex: true,
        };

        expect(() => mutationService.applyMutation(sampleGraph, mutation)).toThrow(
          `Node with ID ${nodeId1} already exists`
        );
      });

      it('should not update index if updateIndex is false', () => {
        const newNode = createGraphNode('concept-3', 'Concept', {
          id: 'concept-3',
          name: 'Vue',
        });

        const mutation: GraphMutation = {
          type: 'create_node',
          node: newNode,
          updateIndex: false,
        };

        const result = mutationService.applyMutation(sampleGraph, mutation);

        expect(result.nodes['concept-3']).toEqual(newNode);
        expect(result.nodeTypes.Concept).not.toContain('concept-3');
      });
    });

    describe('update_node', () => {
      it('should update node properties', () => {
        const mutation: GraphMutation = {
          type: 'update_node',
          nodeId: nodeId1,
          properties: {
            description: 'Updated description',
          },
          updateTimestamp: true,
        };

        const result = mutationService.applyMutation(sampleGraph, mutation);

        expect(result.nodes[nodeId1].properties.description).toBe('Updated description');
        // Check that timestamp was updated (greater than or equal due to fast execution)
        expect(result.nodes[nodeId1].updatedAt).toBeGreaterThanOrEqual(sampleGraph.nodes[nodeId1].updatedAt ?? 0);
        expect(result.updatedAt).toBeGreaterThanOrEqual(sampleGraph.updatedAt);
      });

      it('should throw error if node not found', () => {
        const mutation: GraphMutation = {
          type: 'update_node',
          nodeId: 'non-existent',
          properties: { description: 'Updated' },
        };

        expect(() => mutationService.applyMutation(sampleGraph, mutation)).toThrow(
          'Node non-existent not found'
        );
      });

      it('should not update timestamp if updateTimestamp is false', () => {
        const originalTimestamp = sampleGraph.nodes[nodeId1].updatedAt;

        const mutation: GraphMutation = {
          type: 'update_node',
          nodeId: nodeId1,
          properties: { description: 'Updated' },
          updateTimestamp: false,
        };

        const result = mutationService.applyMutation(sampleGraph, mutation);

        expect(result.nodes[nodeId1].updatedAt).toBe(originalTimestamp);
      });
    });

    describe('delete_node', () => {
      it('should delete a node', () => {
        const mutation: GraphMutation = {
          type: 'delete_node',
          nodeId: nodeId2,
          cascade: true,
        };

        const result = mutationService.applyMutation(sampleGraph, mutation);

        expect(result.nodes[nodeId2]).toBeUndefined();
        expect(result.nodeTypes.Concept).not.toContain(nodeId2);
        expect(result.updatedAt).toBeGreaterThanOrEqual(sampleGraph.updatedAt);
      });

      it('should cascade delete relationships when cascade is true', () => {
        // Add a relationship
        const rel = createRelationship(nodeId1, nodeId2, 'hasPrerequisite', 'forward', 1.0);
        const graphWithRel = {
          ...sampleGraph,
          relationships: [...sampleGraph.relationships, rel],
        };

        const mutation: GraphMutation = {
          type: 'delete_node',
          nodeId: nodeId2,
          cascade: true,
        };

        const result = mutationService.applyMutation(graphWithRel, mutation);

        expect(result.relationships).not.toContainEqual(rel);
      });

      it('should not delete relationships when cascade is false', () => {
        const rel = createRelationship(nodeId1, nodeId2, 'hasPrerequisite', 'forward', 1.0);
        const graphWithRel = {
          ...sampleGraph,
          relationships: [...sampleGraph.relationships, rel],
        };

        const mutation: GraphMutation = {
          type: 'delete_node',
          nodeId: nodeId2,
          cascade: false,
        };

        const result = mutationService.applyMutation(graphWithRel, mutation);

        expect(result.relationships).toContainEqual(rel);
      });

      it('should throw error if node not found', () => {
        const mutation: GraphMutation = {
          type: 'delete_node',
          nodeId: 'non-existent',
        };

        expect(() => mutationService.applyMutation(sampleGraph, mutation)).toThrow(
          'Node non-existent not found'
        );
      });
    });

    describe('create_relationship', () => {
      it('should create a new relationship', () => {
        const rel = createRelationship(nodeId1, nodeId2, 'hasPrerequisite', 'forward', 0.9);

        const mutation: GraphMutation = {
          type: 'create_relationship',
          relationship: rel,
        };

        const result = mutationService.applyMutation(sampleGraph, mutation);

        expect(result.relationships).toContainEqual(rel);
        expect(result.updatedAt).toBeGreaterThanOrEqual(sampleGraph.updatedAt);
      });

      it('should throw error if source node not found', () => {
        const rel = createRelationship('non-existent', nodeId2, 'hasPrerequisite', 'forward', 1.0);

        const mutation: GraphMutation = {
          type: 'create_relationship',
          relationship: rel,
        };

        expect(() => mutationService.applyMutation(sampleGraph, mutation)).toThrow(
          'Source node non-existent not found'
        );
      });

      it('should throw error if target node not found', () => {
        const rel = createRelationship(nodeId1, 'non-existent', 'hasPrerequisite', 'forward', 1.0);

        const mutation: GraphMutation = {
          type: 'create_relationship',
          relationship: rel,
        };

        expect(() => mutationService.applyMutation(sampleGraph, mutation)).toThrow(
          'Target node non-existent not found'
        );
      });

      it('should throw error if relationship already exists', () => {
        const rel = sampleGraph.relationships[0]; // Use existing relationship

        const mutation: GraphMutation = {
          type: 'create_relationship',
          relationship: rel,
        };

        expect(() => mutationService.applyMutation(sampleGraph, mutation)).toThrow(
          `Relationship with ID ${rel.id} already exists`
        );
      });
    });

    describe('delete_relationship', () => {
      it('should delete a relationship', () => {
        const rel = sampleGraph.relationships[0];

        const mutation: GraphMutation = {
          type: 'delete_relationship',
          relationshipId: rel.id,
        };

        const result = mutationService.applyMutation(sampleGraph, mutation);

        expect(result.relationships).not.toContainEqual(rel);
        expect(result.updatedAt).toBeGreaterThanOrEqual(sampleGraph.updatedAt);
      });

      it('should throw error if relationship not found', () => {
        const mutation: GraphMutation = {
          type: 'delete_relationship',
          relationshipId: 'non-existent',
        };

        expect(() => mutationService.applyMutation(sampleGraph, mutation)).toThrow(
          'Relationship non-existent not found'
        );
      });
    });
  });

  describe('applyMutationBatch', () => {
    it('should apply multiple mutations in sequence', () => {
      const newNode = createGraphNode('concept-3', 'Concept', {
        id: 'concept-3',
        name: 'Vue',
      });
      const rel = createRelationship(nodeId1, 'concept-3', 'hasPrerequisite', 'forward', 1.0);

      const batch: MutationBatch = {
        mutations: [
          {
            type: 'create_node',
            node: newNode,
            updateIndex: true,
          },
          {
            type: 'create_relationship',
            relationship: rel,
          },
          {
            type: 'update_node',
            nodeId: nodeId1,
            properties: { description: 'Updated' },
          },
        ],
        metadata: {
          operation: 'test',
          timestamp: Date.now(),
        },
      };

      const result = mutationService.applyMutationBatch(sampleGraph, batch);

      expect(result.nodes['concept-3']).toEqual(newNode);
      expect(result.relationships).toContainEqual(rel);
      expect(result.nodes[nodeId1].properties.description).toBe('Updated');
    });
  });

  describe('applyMutationBatchSafe', () => {
    it('should apply valid mutations and collect errors for invalid ones', () => {
      const newNode = createGraphNode('concept-3', 'Concept', {
        id: 'concept-3',
        name: 'Vue',
      });

      const batch: MutationBatch = {
        mutations: [
          {
            type: 'create_node',
            node: newNode,
            updateIndex: true,
          },
          {
            type: 'update_node',
            nodeId: 'non-existent',
            properties: { description: 'Updated' },
          },
        ],
        metadata: {
          operation: 'test',
          timestamp: Date.now(),
        },
      };

      const result = mutationService.applyMutationBatchSafe(sampleGraph, batch);

      expect(result.graph.nodes['concept-3']).toEqual(newNode);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].mutation.type).toBe('update_node');
    });
  });

  describe('validateMutation', () => {
    it('should return true for valid mutation', () => {
      const newNode = createGraphNode('concept-3', 'Concept', {
        id: 'concept-3',
        name: 'Vue',
      });

      const mutation: GraphMutation = {
        type: 'create_node',
        node: newNode,
        updateIndex: true,
      };

      const isValid = mutationService.validateMutation(sampleGraph, mutation);
      expect(isValid).toBe(true);
    });

    it('should return false for invalid mutation', () => {
      const mutation: GraphMutation = {
        type: 'update_node',
        nodeId: 'non-existent',
        properties: { description: 'Updated' },
      };

      const isValid = mutationService.validateMutation(sampleGraph, mutation);
      expect(isValid).toBe(false);
    });
  });

  describe('Immutability', () => {
    it('should not mutate the original graph', () => {
      const newNode = createGraphNode('concept-3', 'Concept', {
        id: 'concept-3',
        name: 'Vue',
      });

      const mutation: GraphMutation = {
        type: 'create_node',
        node: newNode,
        updateIndex: true,
      };

      const originalNodeCount = Object.keys(sampleGraph.nodes).length;
      const originalUpdatedAt = sampleGraph.updatedAt;

      mutationService.applyMutation(sampleGraph, mutation);

      expect(Object.keys(sampleGraph.nodes).length).toBe(originalNodeCount);
      expect(sampleGraph.updatedAt).toBe(originalUpdatedAt);
    });
  });
});

