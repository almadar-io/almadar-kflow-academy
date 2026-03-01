/**
 * REST API Client for Graph Operations
 * 
 * Provides functions for making REST API calls to the graph operations endpoints.
 * These endpoints handle high-level operations like expansion, explanation, and goal generation.
 */

import { apiClient } from '../../../services/apiClient';
import { auth } from '../../../config/firebase';
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
  ApplyMutationsRequest,
  ApplyMutationsResponse,
  ValidateMutationsRequest,
  ValidateMutationsResponse,
} from './types';
import type { NodeBasedKnowledgeGraph, GraphMutation } from '../types';

const BASE_PATH = '/api/graph-operations';

/**
 * Get authentication headers with Firebase token
 */
async function getAuthHeaders(): Promise<HeadersInit> {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };

  const user = auth.currentUser;
  if (user) {
    const token = await user.getIdToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  }

  return headers;
}

export const graphOperationsApi = {
  /**
   * Progressive expansion - minimal input
   */
  progressiveExpand: async (
    graphId: string,
    request: ProgressiveExpandRequest
  ): Promise<ProgressiveExpandResponse> => {
    const headers = await getAuthHeaders();
    return apiClient.fetch(`${BASE_PATH}/${graphId}/expand`, {
      method: 'POST',
      headers,
      body: JSON.stringify(request),
    });
  },

  /**
   * Explain concept - minimal input
   */
  explainConcept: async (
    graphId: string,
    request: ExplainConceptRequest
  ): Promise<ExplainConceptResponse> => {
    if (!graphId || graphId.trim() === '') {
      throw new Error('Graph ID is required for explain concept operation');
    }
    const headers = await getAuthHeaders();
    return apiClient.fetch(`${BASE_PATH}/${graphId}/explain`, {
      method: 'POST',
      headers,
      body: JSON.stringify(request),
    });
  },

  /**
   * Answer question - minimal input
   */
  answerQuestion: async (
    graphId: string,
    request: AnswerQuestionRequest
  ): Promise<AnswerQuestionResponse> => {
    if (!graphId || graphId.trim() === '') {
      throw new Error('Graph ID is required for answer question operation');
    }
    const headers = await getAuthHeaders();
    return apiClient.fetch(`${BASE_PATH}/${graphId}/answer-question`, {
      method: 'POST',
      headers,
      body: JSON.stringify(request),
    });
  },

  /**
   * Generate goals - minimal input
   */
  generateGoals: async (
    graphId: string,
    request: GenerateGoalsRequest
  ): Promise<GenerateGoalsResponse> => {
    if (!graphId || graphId.trim() === '') {
      throw new Error('Graph ID is required for generate goals operation');
    }
    const headers = await getAuthHeaders();
    return apiClient.fetch(`${BASE_PATH}/${graphId}/generate-goals`, {
      method: 'POST',
      headers,
      body: JSON.stringify(request),
    });
  },

  /**
   * Generate layer practice - minimal input
   */
  generateLayerPractice: async (
    graphId: string,
    request: GenerateLayerPracticeRequest
  ): Promise<GenerateLayerPracticeResponse> => {
    if (!graphId || graphId.trim() === '') {
      throw new Error('Graph ID is required for generate layer practice operation');
    }
    const headers = await getAuthHeaders();
    return apiClient.fetch(`${BASE_PATH}/${graphId}/generate-layer-practice`, {
      method: 'POST',
      headers,
      body: JSON.stringify(request),
    });
  },

  /**
   * Custom operation - minimal input
   */
  customOperation: async (
    graphId: string,
    request: CustomOperationRequest
  ): Promise<CustomOperationResponse> => {
    if (!graphId || graphId.trim() === '') {
      throw new Error('Graph ID is required for custom operation');
    }
    const headers = await getAuthHeaders();
    return apiClient.fetch(`${BASE_PATH}/${graphId}/custom-operation`, {
      method: 'POST',
      headers,
      body: JSON.stringify(request),
    });
  },

  /**
   * Direct mutation application
   */
  applyMutations: async (
    graphId: string,
    request: ApplyMutationsRequest
  ): Promise<ApplyMutationsResponse> => {
    const headers = await getAuthHeaders();
    return apiClient.fetch(`/api/knowledge-graphs-access/${graphId}/mutations`, {
      method: 'POST',
      headers,
      body: JSON.stringify(request),
    });
  },

  /**
   * Validate mutations
   */
  validateMutations: async (
    graphId: string,
    request: ValidateMutationsRequest
  ): Promise<ValidateMutationsResponse> => {
    const headers = await getAuthHeaders();
    return apiClient.fetch(`/api/knowledge-graphs-access/${graphId}/mutations/validate`, {
      method: 'POST',
      headers,
      body: JSON.stringify(request),
    });
  },
};

