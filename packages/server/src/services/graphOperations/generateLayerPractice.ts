/**
 * Mutation-based Generate Layer Practice Operation
 * 
 * NEW IMPLEMENTATION: Works directly with NodeBasedKnowledgeGraph
 * Generates practice exercises/reviews for a layer of concepts.
 * 
 * Location: server/src/services/graphOperations/
 */

import { GraphNode, NodeBasedKnowledgeGraph } from '../../types/nodeBasedKnowledgeGraph';
import { callLLM } from '../../services/llm';
import { buildLayerPracticePrompt, LayerPracticePromptContext } from './promptBuilders/layerPracticePromptBuilder';
import type { GraphMutation, MutationBatch, MutationContext } from '../../types/mutations';
import { LearningGoal } from '../../types/goal';

export interface GenerateLayerPracticeOptions {
  graph: NodeBasedKnowledgeGraph;
  mutationContext: MutationContext;
  concepts: GraphNode[];  // Concepts in the layer
  layerGoal: string;
  layerNumber: number;
  learningGoal?: LearningGoal;
  difficulty?: 'beginner' | 'intermediate' | 'advanced';
  focus?: string;
  stream?: boolean;
  uid?: string;
}

export interface GenerateLayerPracticeResult {
  mutations: MutationBatch;
  content: {
    review: string;  // Markdown review content
  };
  prompt: {
    system: string;
    user: string;
  };
}

/**
 * Generate layer practice operation that works with NodeBasedKnowledgeGraph
 */
export async function generateLayerPractice(
  options: GenerateLayerPracticeOptions
): Promise<GenerateLayerPracticeResult | { stream: any; model: string }> {
  const {
    graph,
    mutationContext,
    concepts,
    layerGoal,
    layerNumber,
    learningGoal,
    difficulty,
    focus,
    stream = false,
    uid
  } = options;

  if (!concepts || concepts.length === 0) {
    throw new Error('At least one concept is required for generateLayerPractice');
  }

  // Get seed concept
  const seedConcept = graph.nodes[mutationContext.seedConceptId];

  // Calculate difficulty and focus
  const calculatedDifficulty = difficulty
    ?? learningGoal?.assessedLevel as 'beginner' | 'intermediate' | 'advanced'
    ?? learningGoal?.customMetadata?.difficulty as 'beginner' | 'intermediate' | 'advanced'
    ?? graph.difficulty
    ?? 'intermediate';

  const calculatedFocus = focus
    ?? learningGoal?.customMetadata?.focus
    ?? learningGoal?.description
    ?? graph.focus;

  // Build prompt using prompt builder
  const promptContext: LayerPracticePromptContext = {
    concepts,
    layerGoal,
    layerNumber,
    seedConcept,
    difficulty: calculatedDifficulty,
    focus: calculatedFocus
  };

  const prompts = buildLayerPracticePrompt(promptContext);

  // Call LLM
  const response = await callLLM({
    systemPrompt: prompts.system,
    userPrompt: prompts.user,
    provider: 'deepseek',
    model: 'deepseek-chat',
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

  const reviewContent = response.content?.trim() || '';

  if (!reviewContent) {
    throw new Error('Generate layer practice operation returned empty review content');
  }

  // Generate mutations - store review in Layer node properties
  const mutations: GraphMutation[] = [];

  // Find the layer node for this layer number
  const layerNodes = Object.values(graph.nodes).filter(
    (n): n is GraphNode => n.type === 'Layer' && n.properties.layerNumber === layerNumber
  );
  
  const layerNode = layerNodes.length > 0 ? layerNodes[0] : null;

  if (layerNode) {
    // Update Layer node with review content stored in properties
    mutations.push({
      type: 'update_node',
      nodeId: layerNode.id,
      properties: {
        review: reviewContent,
        reviewGeneratedAt: Date.now()
      },
      updateTimestamp: true
    });
  }

  // Create mutation batch
  const mutationBatch: MutationBatch = {
    mutations,
    metadata: {
      operation: 'generateLayerPractice',
      timestamp: Date.now(),
      model: response.model
    }
  };

  return {
    mutations: mutationBatch,
    content: {
      review: reviewContent
    },
    prompt: prompts
  };
}

