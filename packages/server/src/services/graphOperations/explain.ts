/**
 * Mutation-based Explain Operation
 * 
 * NEW IMPLEMENTATION: Works directly with NodeBasedKnowledgeGraph
 * Does NOT call original operations - designed for new architecture
 * 
 * Location: server/src/operations/mutations/
 */

import { GraphNode, NodeBasedKnowledgeGraph, generateRelationshipId } from '../../types/nodeBasedKnowledgeGraph';
import { callLLM } from '../../services/llm';
import { buildExplainPrompt, ExplainPromptContext } from './promptBuilders';
import { processPrerequisitesFromLesson } from '../../utils/prerequisites';
import { LearningGoal } from '../../types/goal';
import type { GraphMutation, MutationBatch, MutationContext } from '../../types/mutations';

export interface ExplainOptions {
  graph: NodeBasedKnowledgeGraph;
  mutationContext: MutationContext;
  targetNodeId: string;
  learningGoal?: LearningGoal;
  simple?: boolean;
  minimal?: boolean;
  stream?: boolean;
  uid?: string;
}

export interface ExplainResult {
  mutations: MutationBatch;
  content: {
    lesson: string;
    prerequisites?: string[];
  };
  prompt: {
    system: string;
    user: string;
  };
}

/**
 * Get prerequisite nodes for a concept
 */
function getPrerequisiteNodes(
  graph: NodeBasedKnowledgeGraph,
  conceptNode: GraphNode
): GraphNode[] {
  const prerequisiteRels = graph.relationships.filter(r => 
    r.source === conceptNode.id && 
    r.type === 'hasPrerequisite'
  );

  return prerequisiteRels
    .map(rel => graph.nodes[rel.target])
    .filter((node): node is GraphNode => node !== undefined);
}

/**
 * Explain operation that works with NodeBasedKnowledgeGraph
 */
export async function explain(
  options: ExplainOptions
): Promise<ExplainResult | { stream: any; model: string }> {
  const {
    graph,
    mutationContext,
    targetNodeId,
    learningGoal,
    simple = false,
    minimal = false,
    stream = false,
    uid
  } = options;

  // Get target concept node
  const concept = graph.nodes[targetNodeId];
  if (!concept || concept.type !== 'Concept') {
    throw new Error(`Concept node ${targetNodeId} not found`);
  }

  // Get seed concept if available
  const seedConcept = graph.nodes[mutationContext.seedConceptId];

  // Get prerequisites
  const prerequisites = getPrerequisiteNodes(graph, concept);

  // Calculate difficulty and focus
  const difficulty = learningGoal?.assessedLevel 
    ?? learningGoal?.customMetadata?.difficulty 
    ?? graph.difficulty 
    ?? 'intermediate';

  const focus = learningGoal?.customMetadata?.focus 
    ?? learningGoal?.description 
    ?? graph.focus;

  // Build prompt using prompt builder
  const promptContext: ExplainPromptContext = {
    concept,
    seedConcept,
    learningGoal,
    difficulty: difficulty as 'beginner' | 'intermediate' | 'advanced',
    focus,
    simple,
    minimal,
    prerequisites
  };

  const prompts = buildExplainPrompt(promptContext);

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

  const lessonMarkdown = response.content.trim();

  if (!lessonMarkdown) {
    throw new Error('Explain operation returned empty lesson content');
  }

  // Process prerequisites from lesson (using existing utility)
  // Note: This utility expects Concept type, so we may need to adapt it
  const processedPrerequisites = processPrerequisitesFromLesson(
    lessonMarkdown,
    {
      id: concept.id,
      name: concept.properties.name,
      description: concept.properties.description || '',
      parents: [],
      children: []
    },
    undefined // graph parameter - may need to adapt
  ) || [];

  // Convert prerequisites to string array
  const prerequisiteNames = processedPrerequisites.map(p => 
    typeof p === 'string' ? p : (p as any).name || String(p)
  );

  // Generate mutations
  const mutations: GraphMutation[] = [];

  // 1. Create Lesson node
  const lessonNodeId = `lesson-${targetNodeId}-${Date.now()}`;
  const lessonNode: GraphNode = {
    id: lessonNodeId,
    type: 'Lesson',
    properties: {
      content: lessonMarkdown,
      generatedAt: Date.now(),
      model: response.model,
      prerequisites: prerequisiteNames
    },
    createdAt: Date.now(),
    updatedAt: Date.now()
  };

  mutations.push({
    type: 'create_node',
    node: lessonNode,
    updateIndex: true
  });

  // 2. Create relationship from concept to lesson
  mutations.push({
    type: 'create_relationship',
    relationship: {
      id: generateRelationshipId(targetNodeId, lessonNodeId, 'hasLesson'),
      source: targetNodeId,
      target: lessonNodeId,
      type: 'hasLesson',
      direction: 'forward',
      createdAt: Date.now()
    }
  });

  // 3. Update concept node with lesson reference (optional)
  mutations.push({
    type: 'update_node',
    nodeId: targetNodeId,
    properties: {
      hasLesson: true,
      lessonGeneratedAt: Date.now()
    },
    updateTimestamp: true
  });

  // Create mutation batch
  const mutationBatch: MutationBatch = {
    mutations,
    metadata: {
      operation: 'explain',
      timestamp: Date.now(),
      model: response.model
    }
  };

  return {
    mutations: mutationBatch,
    content: {
      lesson: lessonMarkdown,
      prerequisites: prerequisiteNames
    },
    prompt: prompts
  };
}
