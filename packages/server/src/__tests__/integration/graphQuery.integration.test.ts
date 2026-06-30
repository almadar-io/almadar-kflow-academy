/**
 * Smoke integration tests for graph query helpers from @almadar-io/knowledge/server.
 */

import { getConceptsByLayer, getMindMapStructure } from '@almadar-io/knowledge/server';
import type { NodeBasedKnowledgeGraph } from '../../types/nodeBasedKnowledgeGraph';
import { createGraphNode, createRelationship } from '../../types/nodeBasedKnowledgeGraph';

describe('Graph Query Integration', () => {
  const graphId = 'test-graph-1';
  const seedConceptId = 'seed-concept-1';

  function baseGraph(): NodeBasedKnowledgeGraph {
    return {
      id: graphId,
      seedConceptId,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      nodes: {
        [graphId]: createGraphNode(graphId, 'Graph', { id: graphId }),
        [seedConceptId]: createGraphNode(seedConceptId, 'Concept', {
          name: 'React',
          description: 'A JavaScript library',
          isSeed: true,
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
  }

  it('returns concepts by layer', () => {
    const graph = baseGraph();
    const result = getConceptsByLayer(graph, { includeRelationships: true, groupByLayer: false });

    const reactConcept = result.concepts.find(c => c.name === 'React');
    expect(reactConcept).toBeDefined();
    expect(reactConcept!.children).toContain('Components');
    expect(reactConcept!.children).toContain('JSX');

    const componentsConcept = result.concepts.find(c => c.name === 'Components');
    expect(componentsConcept).toBeDefined();
    expect(componentsConcept!.parents).toContain('React');
  });

  it('returns mind map structure', () => {
    const graph = baseGraph();
    const result = getMindMapStructure(graph);

    expect(result.nodes.length).toBeGreaterThan(0);
    expect(result.seedNodeId).toBe(seedConceptId);
    expect(result.totalNodes).toBeGreaterThan(0);
  });
});
