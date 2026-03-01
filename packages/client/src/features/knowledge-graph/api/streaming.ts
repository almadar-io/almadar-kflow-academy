/**
 * Streaming Utilities for Graph Operations
 * 
 * Handles Server-Sent Events (SSE) streaming for graph operations.
 * Mutations arrive incrementally and can be applied to Redux in real-time.
 */

import { auth } from '../../../config/firebase';
import type { GraphMutation, MutationBatch } from '../types';
import type {
  ProgressiveExpandRequest,
  ProgressiveExpandResponse,
  ExplainConceptRequest,
  ExplainConceptResponse,
  AnswerQuestionRequest,
  AnswerQuestionResponse,
  GenerateGoalsRequest,
  GenerateGoalsResponse,
  GenerateLayerPracticeRequest,
  GenerateLayerPracticeResponse,
  CustomOperationRequest,
  CustomOperationResponse,
} from './types';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

/**
 * Stream event types
 */
export type StreamEventType = 'chunk' | 'mutations' | 'done' | 'error';

export interface StreamEvent {
  type: StreamEventType;
  chunk?: string;
  mutations?: MutationBatch;
  graph?: any;
  content?: any;
  error?: string;
  done?: boolean;
}

/**
 * Streaming callbacks
 */
export interface StreamingCallbacks {
  onChunk?: (chunk: string) => void;
  onMutations?: (mutations: MutationBatch) => void;
  onContent?: (content: any) => void;
  onError?: (error: string) => void;
  onDone?: (finalResult: any) => void;
}

/**
 * Handle streaming REST request (Server-Sent Events)
 */
export async function handleStreamingRequest<T>(
  endpoint: string,
  requestBody: Record<string, any>,
  callbacks: StreamingCallbacks
): Promise<T> {
  const user = auth.currentUser;
  if (!user) {
    throw new Error('User not authenticated');
  }

  const token = await user.getIdToken();

  // Remove stream from body and add it as query parameter
  const { stream, ...bodyWithoutStream } = requestBody;
  const url = `${API_BASE_URL}${endpoint}${endpoint.includes('?') ? '&' : '?'}stream=true`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(bodyWithoutStream),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Request failed' }));
    throw new Error(error.message || 'Request failed');
  }

  // Check if response is streaming
  const contentType = response.headers.get('Content-Type');
  const isStreaming = contentType?.includes('text/event-stream');

  if (!isStreaming) {
    // Non-streaming response - return JSON directly
    return response.json() as Promise<T>;
  }

  // Handle Server-Sent Events streaming
  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error('Response body is not readable');
  }

  const decoder = new TextDecoder();
  let buffer = '';
  let fullContent = '';
  let finalResult: T | null = null;
  let accumulatedMutations: GraphMutation[] = [];

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            const data = JSON.parse(line.slice(6));

            // Handle errors
            if (data.error) {
              callbacks.onError?.(data.error);
              throw new Error(data.error);
            }

            // Handle completion first - don't process content as chunk when done
            if (data.done) {
              finalResult = {
                ...data,
                mutations: {
                  mutations: accumulatedMutations,
                  metadata: data.mutations?.metadata,
                },
              } as T;
              callbacks.onDone?.(finalResult);
              return finalResult;
            }

            // Handle content chunks (only when NOT done - final content is an object, not a string)
            if (data.content && typeof data.content === 'string') {
              fullContent += data.content;
              callbacks.onChunk?.(data.content);
            }

            // Handle mutations as they arrive
            if (data.mutations) {
              accumulatedMutations.push(...data.mutations.mutations);
              callbacks.onMutations?.(data.mutations);
            }

            // Handle content updates
            if (data.contentUpdate) {
              callbacks.onContent?.(data.contentUpdate);
            }
          } catch (e) {
            if (e instanceof Error && e.message !== 'Unexpected end of JSON input') {
              callbacks.onError?.(e.message);
              throw e;
            }
          }
        }
      }
    }
  } catch (error) {
    callbacks.onError?.(error instanceof Error ? error.message : 'Unknown error');
    throw error;
  }

  // Return final result or throw error if none
  if (!finalResult) {
    throw new Error('Stream completed without final result');
  }

  return finalResult;
}

/**
 * Streaming API client functions
 */
export const graphOperationsStreamingApi = {
  /**
   * Progressive expansion with streaming
   */
  progressiveExpand: async (
    graphId: string,
    request: ProgressiveExpandRequest,
    callbacks: StreamingCallbacks
  ): Promise<ProgressiveExpandResponse> => {
    if (!graphId || graphId.trim() === '') {
      throw new Error('Graph ID is required for progressive expand operation');
    }
    return handleStreamingRequest<ProgressiveExpandResponse>(
      `/api/graph-operations/${graphId}/expand`,
      request,
      callbacks
    );
  },

  /**
   * Explain concept with streaming
   */
  explainConcept: async (
    graphId: string,
    request: ExplainConceptRequest,
    callbacks: StreamingCallbacks
  ): Promise<ExplainConceptResponse> => {
    if (!graphId || graphId.trim() === '') {
      throw new Error('Graph ID is required for explain concept operation');
    }
    return handleStreamingRequest<ExplainConceptResponse>(
      `/api/graph-operations/${graphId}/explain`,
      request,
      callbacks
    );
  },

  /**
   * Answer question with streaming
   */
  answerQuestion: async (
    graphId: string,
    request: AnswerQuestionRequest,
    callbacks: StreamingCallbacks
  ): Promise<AnswerQuestionResponse> => {
    if (!graphId || graphId.trim() === '') {
      throw new Error('Graph ID is required for answer question operation');
    }
    return handleStreamingRequest<AnswerQuestionResponse>(
      `/api/graph-operations/${graphId}/answer-question`,
      request,
      callbacks
    );
  },

  /**
   * Generate goals with streaming
   */
  generateGoals: async (
    graphId: string,
    request: GenerateGoalsRequest,
    callbacks: StreamingCallbacks
  ): Promise<GenerateGoalsResponse> => {
    if (!graphId || graphId.trim() === '') {
      throw new Error('Graph ID is required for generate goals operation');
    }
    return handleStreamingRequest<GenerateGoalsResponse>(
      `/api/graph-operations/${graphId}/generate-goals`,
      request,
      callbacks
    );
  },

  /**
   * Generate layer practice with streaming
   */
  generateLayerPractice: async (
    graphId: string,
    request: GenerateLayerPracticeRequest,
    callbacks: StreamingCallbacks
  ): Promise<GenerateLayerPracticeResponse> => {
    if (!graphId || graphId.trim() === '') {
      throw new Error('Graph ID is required for generate layer practice operation');
    }
    return handleStreamingRequest<GenerateLayerPracticeResponse>(
      `/api/graph-operations/${graphId}/generate-layer-practice`,
      request,
      callbacks
    );
  },

  /**
   * Custom operation with streaming
   */
  customOperation: async (
    graphId: string,
    request: CustomOperationRequest,
    callbacks: StreamingCallbacks
  ): Promise<CustomOperationResponse> => {
    if (!graphId || graphId.trim() === '') {
      throw new Error('Graph ID is required for custom operation');
    }
    return handleStreamingRequest<CustomOperationResponse>(
      `/api/graph-operations/${graphId}/custom-operation`,
      request,
      callbacks
    );
  },
};

