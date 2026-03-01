import { apiClient, handleApiError, extractErrorMessageFromResponse } from '../../services/apiClient';
import { Concept } from './types';
import { auth } from '../../config/firebase';
import { ConceptsAPI } from '../concepts/ConceptsAPI';
import type { ConceptOperationResponse } from '../concepts/ConceptsAPI';

// Re-export types from concepts API
export type {
  ExpandConceptRequest,
  DeriveParentsRequest,
  DeriveSummaryRequest,
  ConceptOperationResponse,
} from '../concepts/ConceptsAPI';

// Helper function for auth headers (same as in ConceptsAPI)
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

export interface CustomOperationRequest {
  concepts: Concept[];
  prompt: string;
  seedConcept?: Concept;
  graph?: {
    concepts: Record<string, Concept>;
  };
  details?: {
    lesson?: string;
    flash?: Array<{ front: string; back: string }>;
  };
}

export interface CustomOperationResponse {
  concepts: Concept[];
  deletions?: Concept[];
  model?: string;
  prompt?: string; // The prompt used to generate this operation
}

export const MentorAPI = {
  // Re-export all existing operations
  expandConcept: ConceptsAPI.expandConcept,
  deriveParents: ConceptsAPI.deriveParents,
  deriveSummary: ConceptsAPI.deriveSummary,
  explainConcept: ConceptsAPI.explainConcept,
  generateNextLayer: ConceptsAPI.generateNextLayer,
  generateNextConcept: ConceptsAPI.generateNextConcept,
  generateLayerPractice: ConceptsAPI.generateLayerPractice,
  answerQuestion: ConceptsAPI.answerQuestion,
  progressiveExpandMultipleFromText: ConceptsAPI.progressiveExpandMultipleFromText,

  // Synthesize concepts - generates hybrid concepts combining multiple parents
  synthesizeConcepts: async (request: { parents: Concept[]; seedConcept?: Concept }): Promise<ConceptOperationResponse> => {
    const headers = await withAuthHeaders();
    return apiClient.fetch('/api/synthesize', {
      method: 'POST',
      headers: { "Content-Type": "application/json", ...headers },
      body: JSON.stringify(request),
    });
  },

  // Explore concept - generates related concepts (lateral exploration)
  exploreConcept: async (request: { concept: Concept; diversity?: 'low' | 'medium' | 'high'; seedConcept?: Concept }): Promise<ConceptOperationResponse> => {
    const headers = await withAuthHeaders();
    return apiClient.fetch('/api/explore', {
      method: 'POST',
      headers: { "Content-Type": "application/json", ...headers },
      body: JSON.stringify(request),
    });
  },

  // Trace path - generates an ordered learning path between two concepts
  tracePath: async (request: { start: Concept; end: Concept; seedConcept?: Concept }): Promise<ConceptOperationResponse> => {
    const headers = await withAuthHeaders();
    return apiClient.fetch('/api/trace-path', {
      method: 'POST',
      headers: { "Content-Type": "application/json", ...headers },
      body: JSON.stringify(request),
    });
  },

  // Progressive expand single - generates one sub-layer under a specific concept
  progressiveExpandSingle: async (request: { seedConcept: Concept; conceptToExpand: Concept; previousSubLayers: Concept[]; graph?: { concepts: Record<string, Concept> } }): Promise<ConceptOperationResponse> => {
    const headers = await withAuthHeaders();
    return apiClient.fetch('/api/progressive-expand-single', {
      method: 'POST',
      headers: { "Content-Type": "application/json", ...headers },
      body: JSON.stringify(request),
    });
  },

  // Progressive explore - generates additional related concepts within the same layer
  progressiveExplore: async (request: { concept: Concept; seedConcept: Concept; previousLayer: Concept[]; currentLayer: Concept[]; nextLayer: Concept[] }): Promise<ConceptOperationResponse> => {
    const headers = await withAuthHeaders();
    return apiClient.fetch('/api/progressive-explore', {
      method: 'POST',
      headers: { "Content-Type": "application/json", ...headers },
      body: JSON.stringify(request),
    });
  },

  // Custom operation with streaming support
  customOperation: async (
    request: CustomOperationRequest,
    onStream?: (chunk: string) => void
  ): Promise<CustomOperationResponse> => {
    const headers = await withAuthHeaders();
    
    // If onStream is provided, use streaming
    if (onStream) {
      const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';
      let response: Response;
      
      try {
        response = await fetch(`${API_BASE_URL}/api/custom-operation`, {
          method: 'POST',
          headers: { 
            "Content-Type": "application/json", 
            ...headers 
          },
          body: JSON.stringify({ ...request, stream: true }),
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
      let finalResult: CustomOperationResponse | null = null;

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

                if (data.done && data.concepts) {
                  finalResult = {
                    concepts: data.concepts || [],
                    deletions: data.deletions,
                    model: data.model,
                    prompt: data.prompt,
                  };
                }
              } catch (e) {
                console.error('Error parsing SSE data:', e);
                if (e instanceof Error && e.message !== 'Unexpected end of JSON input') {
                  throw e;
                }
              }
            }
          }
        }
      } catch (error) {
        handleApiError(error);
        throw error;
      }

      // Return final result or fallback
      return finalResult || {
        concepts: [],
        deletions: [],
      };
    }
    
    // Non-streaming fallback
    return apiClient.fetch('/api/custom-operation', {
      method: 'POST',
      headers: { "Content-Type": "application/json", ...headers },
      body: JSON.stringify(request),
    });
  },

  // Generate flash cards
  generateFlashCards: async (request: { concept: Concept; graphId?: string }): Promise<ConceptOperationResponse> => {
    return ConceptsAPI.generateFlashCards({
      concept: request.concept,
      graphId: request.graphId,
    });
  },
};

