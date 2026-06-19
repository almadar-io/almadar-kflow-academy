/**
 * Mutation-based Progressive Expand Multiple From Text Operation
 * 
 * NEW IMPLEMENTATION: Works directly with NodeBasedKnowledgeGraph
 * Does NOT call original operations - designed for new architecture
 * 
 * Location: server/src/operations/mutations/
 */

import { GraphNode, NodeBasedKnowledgeGraph } from '../../types/nodeBasedKnowledgeGraph';
import type { LayerNodeProperties, MilestoneNodeProperties } from '../../types/nodeBasedKnowledgeGraph';
import { callLLM } from '../../services/llm';
import { buildExpansionPrompt, ExpansionPromptContext } from './promptBuilders';
import { buildExpansionMutations } from './expansionMutations';
import { LearningGoal } from '../../types/goal';
import type { MutationBatch, MutationContext } from '../../types/mutations';

export interface ProgressiveExpandMultipleFromTextOptions {
  graph: NodeBasedKnowledgeGraph;
  mutationContext: MutationContext;
  numConcepts?: number;
  learningGoal?: LearningGoal;
  stream?: boolean;
  uid?: string;
}

export interface ProgressiveExpandMultipleFromTextResult {
  mutations: MutationBatch;
  content: {
    narrative: string;
    goal?: string;
    levelName?: string;
    concepts: Array<{ name: string; description: string; parents: string[] }>;
  };
  prompt: {
    system: string;
    user: string;
  };
}

/**
 * Get nodes by type from graph
 */
function getNodesByType(graph: NodeBasedKnowledgeGraph, type: string): GraphNode[] {
  return Object.values(graph.nodes).filter(n => n.type === type);
}

/**
 * Progressive expand operation that works with NodeBasedKnowledgeGraph
 */
export async function progressiveExpandMultipleFromText(
  options: ProgressiveExpandMultipleFromTextOptions
): Promise<ProgressiveExpandMultipleFromTextResult | { stream: any; model: string }> {
  const { 
    graph, 
    mutationContext, 
    numConcepts = 5,
    learningGoal,
    stream = false,
    uid 
  } = options;

  // Get seed concept node - use graph.seedConceptId directly (it's the source of truth)
  const seedConceptId = graph.seedConceptId || mutationContext.seedConceptId;
  if (!seedConceptId) {
    throw new Error('Seed concept not found - graph does not have a seedConceptId');
  }
  
  const seedConcept = graph.nodes[seedConceptId];
  if (!seedConcept || seedConcept.type !== 'Concept') {
    throw new Error(`Seed concept ${seedConceptId} not found in graph nodes`);
  }

  // Get previous layers (all existing concepts)
  const previousLayers = getNodesByType(graph, 'Concept');
  
  // Get existing layer nodes to determine next layer number
  const existingLayers = getNodesByType(graph, 'Layer');
  const nextLayerNumber = existingLayers.length > 0
    ? Math.max(...existingLayers.map(n => (n.properties as unknown as LayerNodeProperties).layerNumber || 0)) + 1
    : 1;

  const isFirstLayer = existingLayers.length === 0;

  // Calculate difficulty and focus from learning goal or graph metadata
  const difficulty = learningGoal?.assessedLevel 
    ?? learningGoal?.customMetadata?.difficulty 
    ?? graph.difficulty 
    ?? 'intermediate';

  const focus = learningGoal?.customMetadata?.focus 
    ?? learningGoal?.description 
    ?? graph.focus;

  // Determine target milestone based on existing layers and milestone sequences
  // Logic: Each layer corresponds to working toward a milestone in sequence order
  // - Use milestone.sequence (stored on Milestone nodes) for ordering
  // - Match layers to milestones by layer number to milestone sequence
  const totalMilestones = learningGoal?.milestones?.length || 0;
  
  // Get milestone nodes from the graph to access their sequence property
  const milestoneNodes = getNodesByType(graph, 'Milestone');
  
  // Sort milestones by their sequence property (stored on node)
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
  
  // Fallback to learningGoal.milestones if no nodes found (for goals passed as parameters)
  const milestonesWithSequence = sortedMilestones.length > 0 
    ? sortedMilestones 
    : (learningGoal?.milestones || []).map((m, idx) => ({
        id: m.id,
        sequence: idx,
        title: m.title,
        description: m.description,
        completed: m.completed
      }));
  
  let targetMilestone: { index: number; title: string; description?: string; nodeId?: string } | undefined;

  if (milestonesWithSequence.length > 0) {
    // Find the target milestone for this layer
    // Layer N (1-indexed) targets Milestone with sequence N-1 (0-indexed)
    // e.g., Layer 1 -> Milestone sequence 0, Layer 2 -> Milestone sequence 1
    const targetSequence = nextLayerNumber - 1;

    // Clamp to valid range
    const clampedSequence = Math.min(targetSequence, milestonesWithSequence.length - 1);
    const milestone = milestonesWithSequence[clampedSequence];

    if (milestone) {
      targetMilestone = {
        index: milestone.sequence,
        title: milestone.title,
        description: milestone.description,
        nodeId: milestone.id
      };
    }
  }

  // Calculate completed milestones count
  const completedMilestonesCount = milestonesWithSequence.filter(m => m.completed).length;

  // Build prompt using prompt builder
  const promptContext: ExpansionPromptContext = {
    seedConcept,
    previousLayers,
    existingLayers,  // Pass layer nodes for tracking previous goals
    numConcepts,
    learningGoal,
    difficulty: difficulty as 'beginner' | 'intermediate' | 'advanced',
    focus,
    isFirstLayer,
    targetMilestone,
    completedMilestonesCount,
    totalMilestones
  };

  const prompts = buildExpansionPrompt(promptContext);

  // Call LLM
  const response = await callLLM({
    systemPrompt: prompts.system,
    userPrompt: prompts.user,
    uid,
    stream
  });

  // Handle streaming
  if (response.stream && response.raw) {
    return {
      stream: response.raw,
      model: response.model
    };
  }

  // Parse the narrative into mutations via the canonical core (shared with the streaming path).
  const content = response.content.trim();
  const { mutations, parsedContent } = buildExpansionMutations(
    content,
    graph,
    mutationContext,
    learningGoal,
    numConcepts,
    { prompt: prompts.user }
  );

  return {
    mutations,
    content: parsedContent,
    prompt: prompts,
  };
}
