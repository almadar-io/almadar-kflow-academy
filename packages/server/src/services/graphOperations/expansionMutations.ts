/**
 * Canonical expansion-mutation builder.
 *
 * Single source of truth for turning a progressive-expand LLM narrative into graph
 * mutations. Both live paths call this: the streaming parser
 * (`utils/graphOperationParsers.ts → parseProgressiveExpandContent`) and the
 * non-streaming operation (`services/graphOperations/progressiveExpandMultipleFromText.ts`).
 * Keeping one implementation prevents the streaming/non-streaming drift that left
 * same-layer parents unwired and milestone completion inconsistent.
 */

import type { GraphNode, NodeBasedKnowledgeGraph, LayerNodeProperties, MilestoneNodeProperties } from '../../types/nodeBasedKnowledgeGraph';
import { generateNodeId, generateRelationshipId } from '../../types/nodeBasedKnowledgeGraph';
import type { GraphMutation, MutationBatch, MutationContext } from '../../types/mutations';
import type { LearningGoal } from '../../types/goal';

export interface ParsedExpansionContent {
  narrative: string;
  goal?: string;
  levelName?: string;
  concepts: Array<{ name: string; description: string; parents: string[] }>;
}

export interface BuildExpansionMutationsResult {
  mutations: MutationBatch;
  parsedContent: ParsedExpansionContent;
}

/** Conservative name key: case-insensitive, whitespace-collapsed. No symbol stripping. */
function normalizeName(name: string): string {
  return name.toLowerCase().trim().replace(/\s+/g, ' ');
}

/** Find a Concept node by exact id or exact name. */
function findConceptNode(graph: NodeBasedKnowledgeGraph, identifier: string): GraphNode | undefined {
  return Object.values(graph.nodes).find(
    n => n.type === 'Concept' && (n.id === identifier || n.properties.name === identifier)
  );
}

/**
 * Build the full mutation batch for one expansion layer from the LLM narrative.
 *
 * @param opts.prompt  Stored on the Layer node's `prompt` property (non-streaming passes the
 *                     user prompt; the streaming wrapper has no prompt handy and passes '').
 */
export function buildExpansionMutations(
  content: string,
  graph: NodeBasedKnowledgeGraph,
  mutationContext: MutationContext,
  learningGoal?: LearningGoal,
  _numConcepts: number = 5,
  opts: { prompt?: string } = {}
): BuildExpansionMutationsResult {
  // Determine next layer number from existing Layer nodes.
  const existingLayers = Object.values(graph.nodes).filter(n => n.type === 'Layer');
  const nextLayerNumber = existingLayers.length > 0
    ? Math.max(...existingLayers.map(n => (n.properties as unknown as LayerNodeProperties).layerNumber || 0)) + 1
    : 1;
  const isFirstLayer = existingLayers.length === 0;

  // Determine target milestone for this layer (Layer N targets milestone with sequence N-1).
  const milestoneNodes = Object.values(graph.nodes).filter(n => n.type === 'Milestone');
  const sortedMilestones = milestoneNodes
    .map(node => {
      const mp = node.properties as unknown as MilestoneNodeProperties & { sequence?: number; title?: string };
      return {
        id: node.id,
        sequence: mp.sequence ?? 0,
        title: mp.name || mp.title || 'Milestone',
        description: mp.description,
        completed: mp.completed || false,
      };
    })
    .sort((a, b) => a.sequence - b.sequence);

  const milestonesWithSequence = sortedMilestones.length > 0
    ? sortedMilestones
    : (learningGoal?.milestones || []).map((m, idx) => ({
        id: m.id,
        sequence: idx,
        title: m.title,
        description: m.description,
        completed: m.completed,
      }));

  let targetMilestone: { id: string; sequence: number; title: string; description?: string } | undefined;
  let targetMilestoneNode: GraphNode | undefined;
  if (milestonesWithSequence.length > 0) {
    const targetSequence = nextLayerNumber - 1;
    const clampedSequence = Math.min(targetSequence, milestonesWithSequence.length - 1);
    const milestone = milestonesWithSequence[clampedSequence];
    if (milestone) {
      targetMilestone = {
        id: milestone.id,
        sequence: milestone.sequence,
        title: milestone.title,
        description: milestone.description,
      };
      targetMilestoneNode = milestoneNodes.find(n => n.id === milestone.id);
    }
  }

  // Parse level name, goal, and concepts from the narrative.
  const levelNameMatch = content.match(/<level-name>(.*?)<\/level-name>/i);
  const goalMatch = content.match(/<goal>(.*?)<\/goal>/i);
  const levelName = levelNameMatch?.[1]?.trim() || `Level ${nextLayerNumber}`;
  const goal = goalMatch?.[1]?.trim();

  const conceptMatches = content.matchAll(/<concept>(.*?)<\/concept>/gi);
  const concepts: Array<{ name: string; description: string; parents: string[] }> = [];
  for (const match of conceptMatches) {
    const conceptName = match[1]?.trim();
    if (!conceptName) continue;

    const escaped = conceptName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const descMatch = content.match(
      new RegExp(`<concept>${escaped}<\/concept>\\s*<description>(.*?)<\/description>`, 'is')
    );
    const sectionMatch = content.match(
      new RegExp(`<concept>${escaped}<\/concept>\\s*<description>.*?<\/description>\\s*<parents>(.*?)<\/parents>`, 'is')
    );
    const parents = sectionMatch?.[1]?.split(',').map(p => p.trim()).filter(Boolean) || [];

    concepts.push({
      name: conceptName,
      description: descMatch?.[1]?.trim() || '',
      parents,
    });
  }

  const mutations: GraphMutation[] = [];

  // 1. Layer node.
  const layerNodeId = `layer-${mutationContext.graphId}-${nextLayerNumber}`;
  const layerNode: GraphNode = {
    id: layerNodeId,
    type: 'Layer',
    properties: {
      layerNumber: nextLayerNumber,
      name: levelName,
      goal: goal || levelName,
      prompt: opts.prompt ?? '',
      response: content,
      createdAt: Date.now(),
      targetMilestoneId: targetMilestone?.id || null,
      targetMilestoneSequence: targetMilestone?.sequence ?? null,
      targetMilestoneTitle: targetMilestone?.title || null,
    },
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  mutations.push({ type: 'create_node', node: layerNode, updateIndex: true });

  // 2. seed -> hasLayer -> layer.
  const seedConceptId = graph.seedConceptId || mutationContext.seedConceptId;
  if (!seedConceptId) {
    throw new Error('Seed concept not found - graph does not have a seedConceptId. Cannot create layer without a seed concept.');
  }
  const seedConcept = graph.nodes[seedConceptId];
  if (!seedConcept || seedConcept.type !== 'Concept') {
    throw new Error(`Seed concept ${seedConceptId} not found in graph nodes or is not a Concept node`);
  }
  mutations.push({
    type: 'create_relationship',
    relationship: {
      id: generateRelationshipId(seedConceptId, layerNodeId, 'hasLayer'),
      source: seedConceptId,
      target: layerNodeId,
      type: 'hasLayer',
      direction: 'forward',
      createdAt: Date.now(),
    },
  });

  // 2b. layer -> hasMilestone -> milestone.
  if (targetMilestoneNode) {
    mutations.push({
      type: 'create_relationship',
      relationship: {
        id: generateRelationshipId(layerNodeId, targetMilestoneNode.id, 'hasMilestone'),
        source: layerNodeId,
        target: targetMilestoneNode.id,
        type: 'hasMilestone',
        direction: 'forward',
        metadata: { layerNumber: nextLayerNumber, milestoneSequence: targetMilestone?.sequence ?? 0 },
        createdAt: Date.now(),
      },
    });
  }

  // 2c. Mark the previous milestone completed (Layer N => milestone N-1). Applied on every
  // path so streaming and non-streaming behave identically.
  if (!isFirstLayer && learningGoal?.milestones && learningGoal.milestones.length > 0) {
    const milestoneIndexToComplete = existingLayers.length - 1;
    if (milestoneIndexToComplete >= 0 && milestoneIndexToComplete < learningGoal.milestones.length) {
      const milestoneToComplete = learningGoal.milestones[milestoneIndexToComplete];
      if (!milestoneToComplete.completed) {
        const milestoneNode = milestoneNodes.find(
          m => m.properties.id === milestoneToComplete.id ||
               m.properties.name === milestoneToComplete.title ||
               m.id === milestoneToComplete.id
        );
        if (milestoneNode) {
          mutations.push({
            type: 'update_node',
            nodeId: milestoneNode.id,
            properties: { completed: true, completedAt: Date.now() },
            updateTimestamp: true,
          });
        }
      }
    }
  }

  // 3. Concept nodes + relationships.
  // Index newly-created concepts (exact + normalized) so siblings in this same batch can be
  // resolved as parents — the pre-existing graph doesn't yet contain them.
  const batchById = new Map<string, GraphNode>();
  const batchByName = new Map<string, GraphNode>();
  const batchByNormalized = new Map<string, GraphNode>();
  // Normalized index of pre-existing graph concepts (built once).
  const graphByNormalized = new Map<string, GraphNode>();
  for (const n of Object.values(graph.nodes)) {
    if (n.type === 'Concept' && typeof n.properties.name === 'string') {
      const key = normalizeName(n.properties.name);
      if (!graphByNormalized.has(key)) graphByNormalized.set(key, n);
    }
  }

  const resolveParent = (rawParent: string): GraphNode | undefined => {
    const name = rawParent.trim();
    if (!name) return undefined;
    // Exact: existing graph, then this batch.
    const exact = findConceptNode(graph, name)
      ?? batchByName.get(name)
      ?? batchById.get(generateNodeId('Concept', {
        graphId: mutationContext.graphId,
        name,
        layerNumber: nextLayerNumber,
      }));
    if (exact) return exact;
    // Normalized fallback: existing graph, then this batch. Catches casing/whitespace drift.
    const norm = normalizeName(name);
    return graphByNormalized.get(norm) ?? batchByNormalized.get(norm);
  };

  for (const concept of concepts) {
    const conceptNodeId = generateNodeId('Concept', {
      graphId: mutationContext.graphId,
      name: concept.name,
      layerNumber: nextLayerNumber,
    });

    const existingNode = mutationContext.existingNodes[conceptNodeId];
    let conceptNode: GraphNode;
    if (existingNode) {
      mutations.push({
        type: 'update_node',
        nodeId: conceptNodeId,
        properties: {
          description: concept.description || existingNode.properties.description,
          layer: nextLayerNumber,
          updatedAt: Date.now(),
        },
        updateTimestamp: true,
      });
      conceptNode = existingNode;
    } else {
      conceptNode = {
        id: conceptNodeId,
        type: 'Concept',
        properties: {
          name: concept.name,
          description: concept.description,
          layer: nextLayerNumber,
          createdAt: Date.now(),
        },
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      mutations.push({ type: 'create_node', node: conceptNode, updateIndex: true });
    }

    batchById.set(conceptNodeId, conceptNode);
    batchByName.set(concept.name, conceptNode);
    batchByNormalized.set(normalizeName(concept.name), conceptNode);

    // layer <-> concept (bidirectional).
    mutations.push({
      type: 'create_relationship',
      relationship: {
        id: generateRelationshipId(layerNodeId, conceptNodeId, 'containsConcept'),
        source: layerNodeId,
        target: conceptNodeId,
        type: 'containsConcept',
        direction: 'forward',
        createdAt: Date.now(),
      },
    });
    mutations.push({
      type: 'create_relationship',
      relationship: {
        id: generateRelationshipId(conceptNodeId, layerNodeId, 'belongsToLayer'),
        source: conceptNodeId,
        target: layerNodeId,
        type: 'belongsToLayer',
        direction: 'forward',
        createdAt: Date.now(),
      },
    });

    // parent <-> child (bidirectional), resolved exact-then-normalized.
    for (const parentName of concept.parents) {
      const parentNode = resolveParent(parentName);
      if (!parentNode) {
        console.warn(`buildExpansionMutations: parent "${parentName?.trim()}" for concept "${concept.name}" did not resolve to any existing or in-batch concept; prerequisite edge skipped.`);
        continue;
      }
      mutations.push({
        type: 'create_relationship',
        relationship: {
          id: generateRelationshipId(parentNode.id, conceptNodeId, 'hasChild'),
          source: parentNode.id,
          target: conceptNodeId,
          type: 'hasChild',
          direction: 'forward',
          createdAt: Date.now(),
        },
      });
      mutations.push({
        type: 'create_relationship',
        relationship: {
          id: generateRelationshipId(conceptNodeId, parentNode.id, 'hasParent'),
          source: conceptNodeId,
          target: parentNode.id,
          type: 'hasParent',
          direction: 'forward',
          createdAt: Date.now(),
        },
      });
    }
  }

  return {
    mutations: {
      mutations,
      metadata: { operation: 'progressiveExpandMultipleFromText', timestamp: Date.now() },
    },
    parsedContent: { narrative: content, goal, levelName, concepts },
  };
}
