/**
 * Mutation-based Answer Question Operation
 * 
 * NEW IMPLEMENTATION: Works directly with NodeBasedKnowledgeGraph
 * Does NOT call original operations - designed for new architecture
 * 
 * Location: server/src/operations/mutations/
 */

import { GraphNode, NodeBasedKnowledgeGraph, generateNodeId, generateRelationshipId } from '../../types/nodeBasedKnowledgeGraph';
import { callLLM } from '../../services/llm';
import { createPromptBuilder } from './promptBuilders';
import type { GraphMutation, MutationBatch, MutationContext } from '../../types/mutations';

export interface AnswerQuestionOptions {
  graph: NodeBasedKnowledgeGraph;
  mutationContext: MutationContext;
  targetNodeId: string;
  question: string;
  selectedText?: string;
  storeQA?: boolean; // Whether to store Q&A in graph (default: false, ephemeral)
  stream?: boolean;
  uid?: string;
}

export interface AnswerQuestionResult {
  mutations: MutationBatch; // May be empty if ephemeral
  content: {
    answer: string;
  };
  prompt: {
    system: string;
    user: string;
  };
}

/**
 * Build prompt for answer question operation
 */
function buildAnswerQuestionPrompt(
  concept: GraphNode,
  question: string,
  selectedText: string | undefined,
  difficulty: 'beginner' | 'intermediate' | 'advanced'
): { system: string; user: string } {
  const builder = createPromptBuilder()
    .withContext({
      conceptName: concept.properties.name,
      conceptDescription: concept.properties.description || '',
      question: selectedText ? `${question}\n\nSelected text: "${selectedText}"` : question,
      difficulty
    });

  // System prompt
  const systemBuilder = createPromptBuilder()
    .section('Role', `You are an expert educational assistant helping a learner understand concepts at the {{difficulty}} level.`)
    .section('Guidelines', [
      'Answer the question directly and clearly',
      'Tailor your response to the learner\'s level',
      'Use examples when helpful',
      'Be concise but thorough',
      'Format your response in clear, readable Markdown'
    ].map(g => `- ${g}`).join('\n'));

  // User prompt
  builder.section('Context', `**Concept**: {{conceptName}}\n\n{{conceptDescription}}`);
  builder.section('Question', '{{question}}');
  builder.section('Task', 'Provide a clear, helpful answer to this question, tailored for a {{difficulty}} level learner.');

  return {
    system: systemBuilder.buildSystem(),
    user: builder.buildUser()
  };
}

/**
 * Answer question operation that works with NodeBasedKnowledgeGraph
 */
export async function answerQuestion(
  options: AnswerQuestionOptions
): Promise<AnswerQuestionResult | { stream: any; model: string }> {
  const {
    graph,
    mutationContext,
    targetNodeId,
    question,
    selectedText,
    storeQA = false,
    stream = false,
    uid
  } = options;

  // Get target concept node
  const concept = graph.nodes[targetNodeId];
  if (!concept || concept.type !== 'Concept') {
    throw new Error(`Concept node ${targetNodeId} not found`);
  }

  // Calculate difficulty
  const difficulty = graph.difficulty || 'intermediate';

  // Build prompt
  const prompts = buildAnswerQuestionPrompt(
    concept,
    question,
    selectedText,
    difficulty as 'beginner' | 'intermediate' | 'advanced'
  );

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

  const answer = response.content.trim();

  if (!answer) {
    throw new Error('Answer operation returned empty content');
  }

  const mutations: GraphMutation[] = [];

  // Only create mutations if storeQA is true
  if (storeQA) {
    // Check if ConceptMetadata node already exists
    const existingMetadataRel = mutationContext.existingRelationships.find(r => 
      r.source === targetNodeId && r.type === 'hasMetadata'
    );

    let metadataNodeId: string;

    if (existingMetadataRel) {
      // Update existing metadata node
      metadataNodeId = existingMetadataRel.target;
      const existingNode = mutationContext.existingNodes[metadataNodeId];
      const existingQAPairs = existingNode?.properties.qaPairs || [];

      mutations.push({
        type: 'update_node',
        nodeId: metadataNodeId,
        properties: {
          qaPairs: [
            ...existingQAPairs,
            {
              question,
              answer,
              timestamp: Date.now(),
              model: response.model
            }
          ],
          updatedAt: Date.now()
        },
        updateTimestamp: true
      });
    } else {
      // Create new ConceptMetadata node
      metadataNodeId = generateNodeId('ConceptMetadata', {
        graphId: mutationContext.graphId,
        conceptId: targetNodeId
      });

      const metadataNode: GraphNode = {
        id: metadataNodeId,
        type: 'ConceptMetadata',
        properties: {
          qaPairs: [{
            question,
            answer,
            timestamp: Date.now(),
            model: response.model
          }]
        },
        createdAt: Date.now(),
        updatedAt: Date.now()
      };

      mutations.push({
        type: 'create_node',
        node: metadataNode,
        updateIndex: true
      });

      // Create relationship from concept to metadata
      mutations.push({
        type: 'create_relationship',
        relationship: {
          id: generateRelationshipId(targetNodeId, metadataNodeId, 'hasMetadata'),
          source: targetNodeId,
          target: metadataNodeId,
          type: 'hasMetadata',
          direction: 'forward',
          createdAt: Date.now()
        }
      });
    }
  }

  // Create mutation batch (may be empty if ephemeral)
  const mutationBatch: MutationBatch = {
    mutations,
    metadata: {
      operation: 'answerQuestion',
      timestamp: Date.now(),
      model: response.model
    }
  };

  return {
    mutations: mutationBatch,
    content: {
      answer
    },
    prompt: prompts
  };
}
