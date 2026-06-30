/**
 * Smoke integration tests for graph operation helpers from @almadar-io/knowledge/server.
 */

import {
  buildExpansionMutations,
  GraphMutationService,
  getConceptsByLayer,
  KnowledgeGraphAccessLayer,
} from '@almadar-io/knowledge/server';
import type { NodeBasedKnowledgeGraph } from '../../types/nodeBasedKnowledgeGraph';
import { createGraphNode } from '../../types/nodeBasedKnowledgeGraph';

jest.mock('@almadar-io/knowledge/server', () => ({
  ...jest.requireActual('@almadar-io/knowledge/server'),
  KnowledgeGraphAccessLayer: jest.fn().mockImplementation(() => ({
    getGraph: jest.fn(),
    saveGraph: jest.fn(),
  })),
}));

describe('Graph Operations Integration', () => {
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
  }

  it('builds expansion mutations and applies them to create relationships', () => {
    const graph = baseGraph();
    const content = `
      <level-name>Foundation</level-name>
      <goal>Learn React basics</goal>
      <concept>Components</concept>
      <description>Building blocks of React</description>
      <parents>React</parents>
    `;

    const { mutations } = buildExpansionMutations(
      content,
      graph,
      {
        graphId,
        seedConceptId,
        existingNodes: graph.nodes,
        existingRelationships: graph.relationships,
      }
    );

    const mutationService = new GraphMutationService();
    const { graph: updatedGraph } = mutationService.applyMutationBatchSafe(graph, mutations);

    expect(updatedGraph.relationships.length).toBeGreaterThan(0);
    expect(updatedGraph.nodes['Components']).toBeDefined();
  });

  it('queries concepts by layer after expansion', () => {
    const graph = baseGraph();
    const content = `
      <level-name>Foundation</level-name>
      <concept>Components</concept>
      <description>Building blocks</description>
      <parents>React</parents>
    `;

    const { mutations } = buildExpansionMutations(
      content,
      graph,
      {
        graphId,
        seedConceptId,
        existingNodes: graph.nodes,
        existingRelationships: graph.relationships,
      }
    );

    const mutationService = new GraphMutationService();
    const { graph: updatedGraph } = mutationService.applyMutationBatchSafe(graph, mutations);

    const result = getConceptsByLayer(updatedGraph, { includeRelationships: true, groupByLayer: false });
    expect(result.concepts.length).toBeGreaterThan(0);
  });
});
