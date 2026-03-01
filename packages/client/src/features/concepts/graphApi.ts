/**
 * @deprecated This API is deprecated. Use features/knowledge-graph/api/restApi instead.
 * This file contains the old graph API and will be removed in a future version.
 * 
 * Migration guide:
 * - Use knowledgeGraphRestApi.getGraph() instead of graphApi.getGraph()
 * - Use knowledgeGraphRestApi.saveGraph() instead of graphApi.upsertGraph()
 * - Use DELETE /api/graphs/:graphId instead of graphApi.deleteGraph()
 * - Use features/knowledge-graph/hooks/useLearningPaths instead of graphApi.listGraphs()
 */

import { auth } from '../../config/firebase';
import { apiClient } from '../../services/apiClient';
import { ConceptGraph, ConceptGraphJSON } from './types';
import { graphToJSON, jsonToGraph } from './utils/localStorage';

interface GraphListResponse {
  graphs: ConceptGraphJSON[];
}

interface GraphResponse {
  graph: ConceptGraphJSON;
}

const getToken = async (): Promise<string> => {
  const currentUser = auth.currentUser;
  if (!currentUser) {
    throw new Error('User is not authenticated');
  }

  return currentUser.getIdToken();
};

const serializeGraph = (graph: ConceptGraph): ConceptGraphJSON => graphToJSON(graph);

const deserializeGraph = (graph: ConceptGraphJSON): ConceptGraph => jsonToGraph(graph);

// Deprecation warning tracker (logs once per function)
const deprecationWarned: Record<string, boolean> = {};

function warnDeprecation(methodName: string, replacement: string) {
  if (!deprecationWarned[methodName]) {
    console.warn(
      `[DEPRECATED] graphApi.${methodName}() is deprecated. ${replacement}. ` +
      'See docs/KFLOW_V2_COURSE_PUBLISHING.md for migration guide.'
    );
    deprecationWarned[methodName] = true;
  }
}

export const graphApi = {
  /**
   * @deprecated Use useLearningPaths() hook instead
   */
  async listGraphs(): Promise<ConceptGraph[]> {
    warnDeprecation('listGraphs', 'Use useLearningPaths() hook instead');
    const token = await getToken();
    const response = await apiClient.fetch('/api/graphs', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const data = response as GraphListResponse;
    return (data.graphs || []).map(deserializeGraph);
  },

  /**
   * @deprecated Use knowledgeGraphRestApi.getGraph() instead
   */
  async getGraph(graphId: string): Promise<ConceptGraph | null> {
    warnDeprecation('getGraph', 'Use knowledgeGraphRestApi.getGraph() instead');
    const token = await getToken();
    const response = await apiClient.fetch(`/api/graphs/${graphId}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const data = response as GraphResponse;
    return data.graph ? deserializeGraph(data.graph) : null;
  },

  async upsertGraph(graph: ConceptGraph): Promise<void> {
    const token = await getToken();
    const payload = serializeGraph(graph);

    await apiClient.fetch(`/api/graphs/${graph.id}`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
  },

  /**
   * @deprecated Use DELETE /api/graphs/:graphId endpoint directly
   */
  async deleteGraph(graphId: string): Promise<void> {
    warnDeprecation('deleteGraph', 'Use DELETE /api/graphs/:graphId endpoint directly');
    const token = await getToken();
    await apiClient.fetch(`/api/graphs/${graphId}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  },
};


