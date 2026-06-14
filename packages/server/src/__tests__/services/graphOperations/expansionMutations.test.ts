/**
 * Tests for the canonical buildExpansionMutations core + the recent-layers-first prompt.
 * Locks in the level-generation fixes: normalized cross-level parent linking, in-batch
 * (same-layer) parent linking, consistent milestone auto-complete, an unresolved-parent
 * warning, and that the subsequent-level prompt always includes the most-recent level.
 */

import { buildExpansionMutations } from '../../../services/graphOperations/expansionMutations';
import { buildSubsequentLayerPrompt } from '../../../services/graphOperations/promptBuilders/expansionPromptBuilder';
import type { GraphNode, NodeBasedKnowledgeGraph } from '../../../types/nodeBasedKnowledgeGraph';
import type { MutationContext } from '../../../types/mutations';
import type { LearningGoal } from '../../../types/goal';

const graphId = 'test-graph-1';
const seedConceptId = 'seed-concept-1';

function conceptNode(name: string, layer?: number): GraphNode {
  return {
    id: name === 'React' ? seedConceptId : name,
    type: 'Concept',
    properties: layer === undefined ? { name } : { name, layer },
    createdAt: 1,
    updatedAt: 1,
  };
}

function baseGraph(extra: Record<string, GraphNode> = {}): NodeBasedKnowledgeGraph {
  return {
    id: graphId,
    seedConceptId,
    createdAt: 1,
    updatedAt: 1,
    nodes: {
      [graphId]: { id: graphId, type: 'Graph', properties: { name: 'G' }, createdAt: 1, updatedAt: 1 },
      [seedConceptId]: { id: seedConceptId, type: 'Concept', properties: { name: 'React' }, createdAt: 1, updatedAt: 1 },
      ...extra,
    },
    relationships: [],
    nodeTypes: {
      Graph: [graphId], Concept: [seedConceptId], Layer: [], LearningGoal: [], Milestone: [],
      PracticeExercise: [], Lesson: [], ConceptMetadata: [], GraphMetadata: [], FlashCard: [],
    },
  };
}

function ctx(graph: NodeBasedKnowledgeGraph): MutationContext {
  return { graphId, seedConceptId, existingNodes: graph.nodes, existingRelationships: graph.relationships };
}

const hasParentRels = (muts: any[]) =>
  muts.filter(m => m.type === 'create_relationship' && m.relationship.type === 'hasParent')
      .map(m => ({ source: m.relationship.source, target: m.relationship.target }));

describe('buildExpansionMutations', () => {
  it('links a cross-level parent despite case/whitespace drift (normalized fallback)', () => {
    const graph = baseGraph();
    // Parent "react" differs from existing "React" only by case — exact match would drop it.
    const content = `<level-name>Level 1</level-name><goal>g</goal>
<concept>Hooks</concept><description>d</description><parents>react</parents>`;
    const { mutations } = buildExpansionMutations(content, graph, ctx(graph));
    const parents = hasParentRels(mutations.mutations);
    expect(parents).toContainEqual({ source: 'Hooks', target: seedConceptId });
  });

  it('wires a same-layer (in-batch) parent', () => {
    const graph = baseGraph();
    const content = `<concept>State</concept><description>d</description><parents>React</parents>
<concept>Effects</concept><description>d</description><parents>State</parents>`;
    const { mutations } = buildExpansionMutations(content, graph, ctx(graph));
    const parents = hasParentRels(mutations.mutations);
    expect(parents).toContainEqual({ source: 'Effects', target: 'State' });
  });

  it('warns and skips when a parent cannot be resolved', () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    const graph = baseGraph();
    const content = `<concept>Hooks</concept><description>d</description><parents>Totally Unknown</parents>`;
    const { mutations } = buildExpansionMutations(content, graph, ctx(graph));
    const parents = hasParentRels(mutations.mutations);
    expect(parents.find(p => p.source === 'Hooks')).toBeUndefined();
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('Totally Unknown'));
    warn.mockRestore();
  });

  it('auto-completes the previous milestone on a non-first layer', () => {
    const layerNode: GraphNode = {
      id: `layer-${graphId}-1`, type: 'Layer',
      properties: { layerNumber: 1, name: 'Level 1' }, createdAt: 1, updatedAt: 1,
    };
    const milestoneNode: GraphNode = {
      id: 'milestone-x', type: 'Milestone',
      properties: { name: 'Basics', sequence: 0, completed: false }, createdAt: 1, updatedAt: 1,
    };
    const graph = baseGraph({ [layerNode.id]: layerNode, [milestoneNode.id]: milestoneNode });
    graph.nodeTypes.Layer = [layerNode.id];
    graph.nodeTypes.Milestone = [milestoneNode.id];

    const learningGoal: LearningGoal = {
      id: 'g1', graphId, title: 'Master React', description: '', type: 'certification',
      target: 'React', createdAt: 1, updatedAt: 1,
      milestones: [
        { id: 'm1', title: 'Basics', completed: false },
        { id: 'm2', title: 'Advanced', completed: false },
      ],
    };

    const content = `<concept>Context</concept><description>d</description><parents>React</parents>`;
    const { mutations } = buildExpansionMutations(content, graph, ctx(graph), learningGoal);
    const completion = mutations.mutations.find(
      (m: any) => m.type === 'update_node' && m.nodeId === 'milestone-x' && m.properties.completed === true
    );
    expect(completion).toBeDefined();
  });

  it('does NOT auto-complete on the first layer', () => {
    const graph = baseGraph();
    const learningGoal: LearningGoal = {
      id: 'g1', graphId, title: 'x', description: '', type: 'certification', target: 'React',
      createdAt: 1, updatedAt: 1, milestones: [{ id: 'm1', title: 'Basics', completed: false }],
    };
    const content = `<concept>Hooks</concept><description>d</description><parents>React</parents>`;
    const { mutations } = buildExpansionMutations(content, graph, ctx(graph), learningGoal);
    const anyCompletion = mutations.mutations.find(
      (m: any) => m.type === 'update_node' && m.properties?.completed === true
    );
    expect(anyCompletion).toBeUndefined();
  });
});

describe('buildSubsequentLayerPrompt — recent-layers-first context', () => {
  it('includes the most recent layer concepts (the old slice(0,20) dropped them)', () => {
    const seed = { id: seedConceptId, type: 'Concept', properties: { name: 'React' }, createdAt: 1, updatedAt: 1 } as GraphNode;
    // 3 layers × 10 concepts → 30 > 20; layer-3 names must still appear.
    const previousLayers: GraphNode[] = [seed];
    for (let layer = 1; layer <= 3; layer++) {
      for (let i = 0; i < 10; i++) {
        previousLayers.push(conceptNode(`L${layer}C${i}`, layer));
      }
    }
    const prompt = buildSubsequentLayerPrompt({
      seedConcept: seed,
      previousLayers,
      numConcepts: 10,
      isFirstLayer: false,
    });
    expect(prompt).toContain('L3C0');
    expect(prompt).toContain('L3C9');
    expect(prompt).toContain('Level 3');
  });
});
