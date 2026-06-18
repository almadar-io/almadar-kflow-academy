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

export interface StreamingCallbacks<T = unknown> {
  onChunk?: (chunk: string) => void;
  onMutations?: (mutations: MutationBatch) => void;
  onContent?: (content: unknown) => void;
  onError?: (error: string) => void;
  onDone?: (finalResult: T) => void;
}

export async function handleStreamingRequest<T, B extends object = Record<string, unknown>>(
  endpoint: string,
  requestBody: B,
  callbacks: StreamingCallbacks<T>
): Promise<T> {
  const user = auth.currentUser;
  if (!user) throw new Error('User not authenticated');

  const token = await user.getIdToken();

  const { stream: _stream, ...bodyWithoutStream } = requestBody as Record<string, unknown>;
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
    throw new Error((error as { message?: string }).message || 'Request failed');
  }

  const contentType = response.headers.get('Content-Type');
  if (!contentType?.includes('text/event-stream')) {
    return response.json() as Promise<T>;
  }

  const reader = response.body?.getReader();
  if (!reader) throw new Error('Response body is not readable');

  const decoder = new TextDecoder();
  let buffer = '';
  let finalResult: T | null = null;
  const accumulatedMutations: GraphMutation[] = [];

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        const raw = line.slice(6).trim();
        if (raw === '[DONE]') break;

        try {
          const event = JSON.parse(raw) as { type: string; data?: Record<string, unknown>; timestamp?: number };
          const data = event.data ?? {};

          if (event.type === 'error') {
            const msg = typeof data.error === 'string' ? data.error : 'Stream error';
            callbacks.onError?.(msg);
            throw new Error(msg);
          }

          if (event.type === 'complete') {
            finalResult = {
              ...data,
              mutations: {
                mutations: accumulatedMutations,
                metadata: (data.mutations as { metadata?: unknown } | undefined)?.metadata,
              },
            } as T;
            callbacks.onDone?.(finalResult);
            return finalResult;
          }

          if (event.type === 'message') {
            if (typeof data.content === 'string' && data.content) {
              callbacks.onChunk?.(data.content);
            }
            if (data.mutations) {
              const batch = data.mutations as MutationBatch;
              accumulatedMutations.push(...batch.mutations);
              callbacks.onMutations?.(batch);
            }
            if (data.contentUpdate !== undefined) {
              callbacks.onContent?.(data.contentUpdate);
            }
          }
        } catch (e) {
          if (e instanceof Error && e.message !== 'Unexpected end of JSON input') {
            callbacks.onError?.(e.message);
            throw e;
          }
        }
      }
    }
  } catch (error) {
    callbacks.onError?.(error instanceof Error ? error.message : 'Unknown error');
    throw error;
  }

  if (!finalResult) throw new Error('Stream completed without final result');
  return finalResult;
}

export const graphOperationsStreamingApi = {
  progressiveExpand: (
    graphId: string,
    request: ProgressiveExpandRequest,
    callbacks: StreamingCallbacks<ProgressiveExpandResponse>
  ): Promise<ProgressiveExpandResponse> => {
    if (!graphId?.trim()) throw new Error('Graph ID is required for progressive expand operation');
    return handleStreamingRequest<ProgressiveExpandResponse, ProgressiveExpandRequest>(`/api/graph-operations/${graphId}/expand`, request, callbacks);
  },

  explainConcept: (
    graphId: string,
    request: ExplainConceptRequest,
    callbacks: StreamingCallbacks<ExplainConceptResponse>
  ): Promise<ExplainConceptResponse> => {
    if (!graphId?.trim()) throw new Error('Graph ID is required for explain concept operation');
    return handleStreamingRequest<ExplainConceptResponse, ExplainConceptRequest>(`/api/graph-operations/${graphId}/explain`, request, callbacks);
  },

  answerQuestion: (
    graphId: string,
    request: AnswerQuestionRequest,
    callbacks: StreamingCallbacks<AnswerQuestionResponse>
  ): Promise<AnswerQuestionResponse> => {
    if (!graphId?.trim()) throw new Error('Graph ID is required for answer question operation');
    return handleStreamingRequest<AnswerQuestionResponse, AnswerQuestionRequest>(`/api/graph-operations/${graphId}/answer-question`, request, callbacks);
  },

  generateGoals: (
    graphId: string,
    request: GenerateGoalsRequest,
    callbacks: StreamingCallbacks<GenerateGoalsResponse>
  ): Promise<GenerateGoalsResponse> => {
    if (!graphId?.trim()) throw new Error('Graph ID is required for generate goals operation');
    return handleStreamingRequest<GenerateGoalsResponse, GenerateGoalsRequest>(`/api/graph-operations/${graphId}/generate-goals`, request, callbacks);
  },

  generateLayerPractice: (
    graphId: string,
    request: GenerateLayerPracticeRequest,
    callbacks: StreamingCallbacks<GenerateLayerPracticeResponse>
  ): Promise<GenerateLayerPracticeResponse> => {
    if (!graphId?.trim()) throw new Error('Graph ID is required for generate layer practice operation');
    return handleStreamingRequest<GenerateLayerPracticeResponse, GenerateLayerPracticeRequest>(`/api/graph-operations/${graphId}/generate-layer-practice`, request, callbacks);
  },

  customOperation: (
    graphId: string,
    request: CustomOperationRequest,
    callbacks: StreamingCallbacks<CustomOperationResponse>
  ): Promise<CustomOperationResponse> => {
    if (!graphId?.trim()) throw new Error('Graph ID is required for custom operation');
    return handleStreamingRequest<CustomOperationResponse, CustomOperationRequest>(`/api/graph-operations/${graphId}/custom-operation`, request, callbacks);
  },
};
