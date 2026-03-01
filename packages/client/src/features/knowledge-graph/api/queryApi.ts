/**
 * Optimized Query API Client (Phase 3.2)
 * 
 * Client functions for optimized query endpoints that return pre-formatted,
 * display-ready data for Mentor pages. All transformation is done server-side.
 */

import { apiClient } from '../../../services/apiClient';
import { auth } from '../../../config/firebase';
import type {
  LearningPathsSummaryResponse,
  GraphSummary,
  ConceptsByLayerResponse,
  ConceptDetail,
  MindMapResponse,
} from './types';

const QUERY_BASE_PATH = '/api/graph-queries';

/**
 * Get authentication headers with Firebase token
 */
async function getAuthHeaders(): Promise<HeadersInit> {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };

  try {
    const user = auth.currentUser;
    if (user) {
      const token = await user.getIdToken();
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
    }
  } catch (error) {
    console.error('Error getting auth token:', error);
  }

  return headers;
}

export const graphQueryApi = {
  /**
   * Get all learning paths summary (for MentorPage)
   * Returns pre-formatted learning paths with goal titles, descriptions, concept counts
   */
  getLearningPaths: async (): Promise<LearningPathsSummaryResponse> => {
    const headers = await getAuthHeaders();
    return apiClient.fetch(`${QUERY_BASE_PATH}/learning-paths`, {
      method: 'GET',
      headers,
    });
  },

  /**
   * Get graph summary with goal and stats (for MentorConceptListPage header)
   * Returns pre-extracted goal, milestones, and counts
   */
  getGraphSummary: async (graphId: string): Promise<GraphSummary> => {
    if (!graphId || graphId.trim() === '') {
      throw new Error('Graph ID is required for get graph summary');
    }
    const headers = await getAuthHeaders();
    return apiClient.fetch(`${QUERY_BASE_PATH}/${graphId}/summary`, {
      method: 'GET',
      headers,
    });
  },

  /**
   * Get concepts organized by layer (for MentorConceptListPage)
   * Returns pre-formatted concepts with relationships resolved to names
   */
  getConceptsByLayer: async (
    graphId: string,
    options?: {
      includeRelationships?: boolean;
      groupByLayer?: boolean;
    }
  ): Promise<ConceptsByLayerResponse> => {
    if (!graphId || graphId.trim() === '') {
      throw new Error('Graph ID is required for get concepts by layer');
    }
    const headers = await getAuthHeaders();
    const params = new URLSearchParams();
    if (options?.includeRelationships !== undefined) {
      params.append('includeRelationships', String(options.includeRelationships));
    }
    if (options?.groupByLayer !== undefined) {
      params.append('groupByLayer', String(options.groupByLayer));
    }

    const queryString = params.toString();
    const url = `${QUERY_BASE_PATH}/${graphId}/concepts${queryString ? `?${queryString}` : ''}`;

    return apiClient.fetch(url, {
      method: 'GET',
      headers,
    });
  },

  /**
   * Get complete concept detail (for MentorConceptDetailPage)
   * Returns concept with all related data pre-extracted (lesson, flashcards, metadata, relationships)
   */
  getConceptDetail: async (graphId: string, conceptId: string): Promise<ConceptDetail> => {
    if (!graphId || graphId.trim() === '') {
      throw new Error('Graph ID is required for get concept detail');
    }
    if (!conceptId || conceptId.trim() === '') {
      throw new Error('Concept ID is required for get concept detail');
    }
    const headers = await getAuthHeaders();
    return apiClient.fetch(`${QUERY_BASE_PATH}/${graphId}/concepts/${conceptId}`, {
      method: 'GET',
      headers,
    });
  },

  /**
   * Get mindmap structure (for MindMap component)
   * Returns hierarchical mindmap structure with seed as root, layers, and nested concepts
   */
  getMindMapStructure: async (
    graphId: string,
    options?: {
      expandAll?: boolean;
    }
  ): Promise<MindMapResponse> => {
    if (!graphId || graphId.trim() === '') {
      throw new Error('Graph ID is required for get mindmap structure');
    }
    const headers = await getAuthHeaders();
    const params = new URLSearchParams();
    if (options?.expandAll !== undefined) {
      params.append('expandAll', String(options.expandAll));
    }

    const queryString = params.toString();
    const url = `${QUERY_BASE_PATH}/${graphId}/mindmap${queryString ? `?${queryString}` : ''}`;

    return apiClient.fetch(url, {
      method: 'GET',
      headers,
    });
  },
};

