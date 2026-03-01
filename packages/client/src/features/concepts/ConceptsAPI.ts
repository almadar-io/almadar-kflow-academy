/**
 * @deprecated This API is deprecated. Use features/knowledge-graph/hooks instead.
 * This file contains the old concepts API operations and will be removed in a future version.
 * 
 * Migration guide:
 * - Use useProgressiveExpand hook instead of expandConcept
 * - Use useExplainConcept hook instead of explainConcept
 * - Use useAnswerQuestion hook instead of answerQuestion
 * - Use useCustomOperation hook instead of customOperation
 * - Use useGenerateLayerPractice hook instead of generateLayerPractice
 */

import { apiClient, handleApiError, extractErrorMessageFromResponse } from '../../services/apiClient';
import { Concept, PracticeItem } from './types';
import { auth } from '../../config/firebase';

// API request types - matching server types
export interface ExpandConceptRequest {
  concept: Concept;
  graph?: {
    concepts: Record<string, Concept>; // Map structure for UI
  };
}

export interface GenerateNextLayerRequest {
  seedConcept: Concept;
  previousLayers: Concept[];
  numLayers?: number;
}

export interface GenerateNextConceptRequest {
  concept: Concept;
  numSteps?: number;
  graph?: {
    concepts: Record<string, Concept>;
  };
}

export interface DeriveParentsRequest {
  concept: Concept;
  seedConcept?: Concept;
}

export interface DeriveSummaryRequest {
  concepts: Concept[];
  seedConcept?: Concept;
}

export interface ExplainConceptRequest {
  concept: Concept;
  seedConcept?: Concept;
  simple?: boolean;
  minimal?: boolean; // If true, removes learning science tags AND practice questions
  graphId: string;
  stream?: boolean; // Whether to stream the response (default: false)
}

export interface GenerateFlashCardsRequest {
  concept: Concept;
  graphId?: string;
}

export interface ProgressiveExpandMultipleFromTextRequest {
  concept: Concept;
  previousLayers: Concept[];
  numConcepts?: number;
  graphId?: string; // Optional - required for graph operations but can be omitted for standalone operations
  goalFocused?: boolean; // Whether to use goal-focused prompts (default: true)
  stream?: boolean; // Whether to stream the response (default: false)
}

export interface AnswerQuestionRequest {
  conceptGraphId: string;
  conceptId: string;
  question: string;
  selectedText?: string;
}

export interface AnswerQuestionResponse {
  answer: string;
}

export interface GenerateLayerPracticeRequest {
  concepts: Concept[];
  layerGoal: string;
  layerNumber: number;
  preferProject?: boolean;
  graphId?: string; // Optional graph ID to save practice exercises to layer
}

// API response types
export interface ConceptOperationResponse {
  concepts: Concept[];
  model?: string;  // The LLM model that was used
  prompt?: string; // The prompt used to generate this operation
}

export interface GenerateLayerPracticeResponse {
  items: PracticeItem[];
  model?: string;
}

const withAuthHeaders = async (): Promise<HeadersInit> => {
  const currentUser = auth.currentUser;
  if (!currentUser) {
    throw new Error('User is not authenticated');
  }
  const token = await currentUser.getIdToken();
  return {
    Authorization: `Bearer ${token}`,
  };
};

/**
 * Generic streaming handler for Server-Sent Events (SSE)
 */
interface StreamHandlerOptions<T> {
  endpoint: string;
  requestBody: any;
  headers: HeadersInit;
  onStream: (chunk: string) => void;
  onData: (data: any, fullContent: string) => void; // Called for each SSE data chunk
  onDone: (data: any, fullContent: string) => T | null; // Called when data.done is true, returns final result
  fallbackResult: (fullContent: string) => T; // Called if no final result from onDone
}

async function handleStreamingRequest<T>({
  endpoint,
  requestBody,
  headers,
  onStream,
  onData,
  onDone,
  fallbackResult,
}: StreamHandlerOptions<T>): Promise<T> {
  const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';
  let response: Response;
  
  try {
    response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'POST',
      headers: { 
        "Content-Type": "application/json", 
        ...headers 
      },
      body: JSON.stringify(requestBody),
    });
  } catch (error) {
    handleApiError(error);
    throw error;
  }

  if (!response.ok) {
    const errorMessage = await extractErrorMessageFromResponse(response);
    const error = new Error(errorMessage);
    handleApiError(error);
    throw error;
  }

  const reader = response.body?.getReader();
  if (!reader) {
    const error = new Error('Response body is not readable');
    handleApiError(error);
    throw error;
  }

  const decoder = new TextDecoder();
  let buffer = '';
  let fullContent = '';
  let finalResult: T | null = null;

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
            
            if (data.error) {
              const error = new Error(data.error);
              handleApiError(error);
              throw error;
            }

            if (data.content) {
              fullContent += data.content;
              onStream(data.content);
            }

            // Call onData for any data processing needed
            onData(data, fullContent);

            if (data.done) {
              finalResult = onDone(data, fullContent);
            }
          } catch (e) {
            console.error('Error parsing SSE data:', e);
            // If it's an error we threw (not a parsing error), re-throw it
            if (e instanceof Error && e.message !== 'Unexpected end of JSON input') {
              throw e;
            }
          }
        }
      }
    }
  } catch (error) {
    // Handle errors during streaming (network disconnections, etc.)
    handleApiError(error);
    throw error;
  }

  // Return final result or fallback
  return finalResult ?? fallbackResult(fullContent);
}

// Raw API calls for concepts
export const ConceptsAPI = {
  // Expand a concept - generates 3-7 sub-concepts
  expandConcept: async (request: ExpandConceptRequest): Promise<ConceptOperationResponse> => {
    const headers = await withAuthHeaders();
    return apiClient.fetch('/api/expand-concept', {
      method: 'POST',
      headers: { "Content-Type": "application/json", ...headers },
      body: JSON.stringify(request),
    });
  },

  // Generate next layer - generates multiple layers of concepts
  generateNextLayer: async (request: GenerateNextLayerRequest): Promise<ConceptOperationResponse> => {
    const headers = await withAuthHeaders();
    return apiClient.fetch('/api/generate-next-layer', {
      method: 'POST',
      headers: { "Content-Type": "application/json", ...headers },
      body: JSON.stringify(request),
    });
  },

  // Generate next concept - generates multiple sequential learning steps
  generateNextConcept: async (request: GenerateNextConceptRequest): Promise<ConceptOperationResponse> => {
    const headers = await withAuthHeaders();
    return apiClient.fetch('/api/generate-next-concept', {
      method: 'POST',
      headers: { "Content-Type": "application/json", ...headers },
      body: JSON.stringify(request),
    });
  },

  // Derive parents - generates prerequisite concepts
  deriveParents: async (request: DeriveParentsRequest): Promise<ConceptOperationResponse> => {
    const headers = await withAuthHeaders();
    return apiClient.fetch('/api/derive-parents', {
      method: 'POST',
      headers: { "Content-Type": "application/json", ...headers },
      body: JSON.stringify(request),
    });
  },

  // Derive summary - generates summary concepts for a layer
  deriveSummary: async (request: DeriveSummaryRequest): Promise<ConceptOperationResponse> => {
    const headers = await withAuthHeaders();
    return apiClient.fetch('/api/derive-summary', {
      method: 'POST',
      headers: { "Content-Type": "application/json", ...headers },
      body: JSON.stringify(request),
    });
  },

  explainConcept: async (
    request: ExplainConceptRequest,
    onStream?: (chunk: string) => void
  ): Promise<ConceptOperationResponse> => {
    const headers = await withAuthHeaders();
    
    // If onStream is provided, use streaming
    if (onStream) {
      return handleStreamingRequest<ConceptOperationResponse>({
        endpoint: '/api/explain-concept',
        requestBody: request,
        headers,
        onStream,
        onData: () => {
          // No additional processing needed for each data chunk
        },
        onDone: (data, fullContent) => {
          // Create the final result with the complete concept
          // Note: trim() only removes leading/trailing whitespace, preserving all internal newlines
          const concept: Concept = {
            ...request.concept,
            lesson: fullContent.trim(),
            prerequisites: data.prerequisites,
          };
          return { 
            concepts: [concept],
            prompt: data.prompt,
          };
        },
        fallbackResult: (fullContent) => {
          // Fallback: create result from accumulated content
          // Note: trim() only removes leading/trailing whitespace, preserving all internal newlines
          const concept: Concept = {
            ...request.concept,
            lesson: fullContent.trim(),
          };
          return { concepts: [concept] };
        },
      });
    }

    // Non-streaming fallback
    return apiClient.fetch('/api/explain-concept', {
      method: 'POST',
      headers: { "Content-Type": "application/json", ...headers },
      body: JSON.stringify(request),
    });
  },

  progressiveExpandMultipleFromText: async (
    request: ProgressiveExpandMultipleFromTextRequest,
    onStream?: (chunk: string) => void,
    onComplete?: () => void
  ): Promise<ConceptOperationResponse> => {
    const headers = await withAuthHeaders();
    
    // If onStream is provided, use streaming
    if (onStream) {
      const result = await handleStreamingRequest<ConceptOperationResponse>({
        endpoint: '/api/progressive-expand-multiple-from-text',
        requestBody: request,
        headers,
        onStream,
        onData: () => {
          // No additional processing needed for each data chunk
        },
        onDone: (data) => {
          // Stream complete - return concepts and model from final event
          if (data.concepts && Array.isArray(data.concepts)) {
            return { 
              concepts: data.concepts,
              model: data.model || 'deepseek-chat',
              prompt: data.prompt,
            };
          }
          return { 
            concepts: [], 
            model: 'deepseek-chat',
          };
        },
        fallbackResult: () => {
          return { concepts: [] };
        },
      });
      
      // Call onComplete after stream is fully processed and result is returned
      if (onComplete) {
        onComplete();
      }
      
      return result;
    }
    
    // Non-streaming fallback
    const result = await apiClient.fetch('/api/progressive-expand-multiple-from-text', {
      method: 'POST',
      headers: { "Content-Type": "application/json", ...headers },
      body: JSON.stringify(request),
    });
    
    // Call onComplete for non-streaming case too
    if (onComplete) {
      onComplete();
    }
    
    return result;
  },

  generateLayerPractice: async (
    request: GenerateLayerPracticeRequest,
    onStream?: (chunk: string) => void
  ): Promise<GenerateLayerPracticeResponse> => {
    const headers = await withAuthHeaders();
    
    // If onStream is provided, use streaming
    if (onStream) {
      return handleStreamingRequest<GenerateLayerPracticeResponse>({
        endpoint: '/api/generate-layer-practice',
        requestBody: request,
        headers,
        onStream,
        onData: () => {
          // No additional processing needed for each data chunk
        },
        onDone: (data) => {
          // Create the final result with the complete review
          return { 
            items: data.items || [],
            model: data.model || 'deepseek-chat',
          };
        },
        fallbackResult: (fullContent) => {
          // Fallback: create result from accumulated content
          return { 
            items: [{
              type: 'project',
              question: fullContent.trim(),
              answer: '',
            }],
            model: 'deepseek-chat',
          };
        },
      });
    }

    // Non-streaming fallback
    return apiClient.fetch('/api/generate-layer-practice', {
      method: 'POST',
      headers: { "Content-Type": "application/json", ...headers },
      body: JSON.stringify(request),
    });
  },

  answerQuestion: async (
    request: AnswerQuestionRequest,
    onStream?: (chunk: string) => void
  ): Promise<AnswerQuestionResponse> => {
    const token = await auth.currentUser?.getIdToken();
    const headers: Record<string, string> = {};
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    // If onStream is provided, use streaming
    if (onStream) {
      const authHeaders = await withAuthHeaders();
      return handleStreamingRequest<AnswerQuestionResponse>({
        endpoint: '/api/answer-question?stream=true',
        requestBody: request,
        headers: { ...authHeaders },
        onStream,
        onData: () => {
          // No additional processing needed for each data chunk
        },
        onDone: (data, fullContent) => {
          // Return the final answer
          return {
            answer: fullContent,
            model: data.model,
          };
        },
        fallbackResult: (fullContent) => ({
          answer: fullContent,
        }),
      });
    }

    // Non-streaming fallback
    return apiClient.fetch('/api/answer-question', {
      method: 'POST',
      headers: { "Content-Type": "application/json", ...headers },
      body: JSON.stringify(request),
    });
  },

  generateFlashCards: async (request: GenerateFlashCardsRequest): Promise<ConceptOperationResponse> => {
    const headers = await withAuthHeaders();
    return apiClient.fetch('/api/generate-flash-cards', {
      method: 'POST',
      headers: { "Content-Type": "application/json", ...headers },
      body: JSON.stringify(request),
    });
  },
};

