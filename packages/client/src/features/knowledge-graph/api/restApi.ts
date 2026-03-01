/**
 * REST API Client for Knowledge Graph Access
 * 
 * Provides functions for making REST API calls to the knowledge graph endpoints
 */

import { apiClient } from '../../../services/apiClient';
import { auth } from '../../../config/firebase';
import type {
  NodeBasedKnowledgeGraph,
  GraphNode,
  Relationship,
  NodeType,
  RelationshipType,
  RelationshipDirection,
} from '../types';

const BASE_PATH = '/api/knowledge-graphs-access';

/**
 * Validate graphId to prevent empty values that cause double slashes in URLs
 */
function validateGraphId(graphId: string, operation: string): void {
  if (!graphId || graphId.trim() === '') {
    throw new Error(`Graph ID is required for ${operation}`);
  }
}

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

export interface GetNodesOptions {
  type?: NodeType;
}

export interface GetRelationshipsOptions {
  nodeId?: string;
  direction?: 'incoming' | 'outgoing' | 'both';
  type?: RelationshipType;
}

export interface TraverseOptions {
  relationshipTypes?: RelationshipType[];
  direction?: RelationshipDirection;
  maxDepth?: number;
  limit?: number;
}

export interface CreateNodeInput {
  type: NodeType;
  properties: Record<string, any>;
}

export interface UpdateNodeInput {
  properties: Record<string, any>;
}

export interface CreateRelationshipInput {
  source: string;
  target: string;
  type: RelationshipType;
  direction?: RelationshipDirection;
  strength?: number;
  metadata?: any;
}

export interface DeleteNodeOptions {
  cascade?: boolean;
}

export const knowledgeGraphRestApi = {
  // Graph operations
  getGraph: async (graphId: string): Promise<NodeBasedKnowledgeGraph> => {
    if (!graphId || graphId.trim() === '') {
      throw new Error('Graph ID is required for get graph');
    }
    const headers = await getAuthHeaders();
    return apiClient.fetch(`${BASE_PATH}/${graphId}`, {
      headers,
    });
  },

  saveGraph: async (graphId: string, graph: NodeBasedKnowledgeGraph): Promise<NodeBasedKnowledgeGraph> => {
    if (!graphId || graphId.trim() === '') {
      throw new Error('Graph ID is required for save graph');
    }
    const headers = await getAuthHeaders();
    
    // Save the graph (backend returns { success: true, graphId })
    const response = await apiClient.fetch(`${BASE_PATH}/${graphId}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(graph),
    });
    
    // Backend returns { success: true, graphId }, so we need to fetch the graph
    // If response already contains the graph, return it; otherwise fetch it
    if (response && response.id && response.nodes !== undefined) {
      // Response is already a graph
      return response;
    }
    
    // Fetch the saved graph
    return apiClient.fetch(`${BASE_PATH}/${graphId}`, {
      headers,
    });
  },

  // Node operations
  getNodes: async (graphId: string, options?: GetNodesOptions): Promise<{ nodes: GraphNode[]; count: number }> => {
    validateGraphId(graphId, 'get nodes');
    const headers = await getAuthHeaders();
    const params = new URLSearchParams();
    if (options?.type) {
      params.append('type', options.type);
    }
    const query = params.toString();
    return apiClient.fetch(`${BASE_PATH}/${graphId}/nodes${query ? `?${query}` : ''}`, {
      headers,
    });
  },

  getNode: async (graphId: string, nodeId: string): Promise<GraphNode> => {
    validateGraphId(graphId, 'get node');
    if (!nodeId || nodeId.trim() === '') {
      throw new Error('Node ID is required for get node');
    }
    const headers = await getAuthHeaders();
    return apiClient.fetch(`${BASE_PATH}/${graphId}/nodes/${nodeId}`, {
      headers,
    });
  },

  createNode: async (graphId: string, input: CreateNodeInput): Promise<GraphNode> => {
    validateGraphId(graphId, 'create node');
    const headers = await getAuthHeaders();
    return apiClient.fetch(`${BASE_PATH}/${graphId}/nodes`, {
      method: 'POST',
      headers,
      body: JSON.stringify(input),
    });
  },

  updateNode: async (graphId: string, nodeId: string, input: UpdateNodeInput): Promise<GraphNode> => {
    validateGraphId(graphId, 'update node');
    if (!nodeId || nodeId.trim() === '') {
      throw new Error('Node ID is required for update node');
    }
    const headers = await getAuthHeaders();
    return apiClient.fetch(`${BASE_PATH}/${graphId}/nodes/${nodeId}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(input),
    });
  },

  deleteNode: async (graphId: string, nodeId: string, options?: DeleteNodeOptions): Promise<void> => {
    validateGraphId(graphId, 'delete node');
    if (!nodeId || nodeId.trim() === '') {
      throw new Error('Node ID is required for delete node');
    }
    const headers = await getAuthHeaders();
    const params = new URLSearchParams();
    if (options?.cascade) {
      params.append('cascade', 'true');
    }
    const query = params.toString();
    await apiClient.fetch(`${BASE_PATH}/${graphId}/nodes/${nodeId}${query ? `?${query}` : ''}`, {
      method: 'DELETE',
      headers,
    });
  },

  findNodes: async (graphId: string, filter: Record<string, any>): Promise<{ nodes: GraphNode[]; count: number }> => {
    validateGraphId(graphId, 'find nodes');
    const headers = await getAuthHeaders();
    return apiClient.fetch(`${BASE_PATH}/${graphId}/nodes/find`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ filter }),
    });
  },

  // Relationship operations
  getRelationships: async (
    graphId: string,
    options?: GetRelationshipsOptions
  ): Promise<{ relationships: Relationship[]; count: number }> => {
    validateGraphId(graphId, 'get relationships');
    const headers = await getAuthHeaders();
    const params = new URLSearchParams();
    if (options?.nodeId) params.append('nodeId', options.nodeId);
    if (options?.direction) params.append('direction', options.direction);
    if (options?.type) params.append('type', options.type);
    const query = params.toString();
    return apiClient.fetch(`${BASE_PATH}/${graphId}/relationships${query ? `?${query}` : ''}`, {
      headers,
    });
  },

  getNodeRelationships: async (
    graphId: string,
    nodeId: string,
    options?: { direction?: 'incoming' | 'outgoing' | 'both'; type?: RelationshipType }
  ): Promise<{ relationships: Relationship[]; count: number }> => {
    validateGraphId(graphId, 'get node relationships');
    if (!nodeId || nodeId.trim() === '') {
      throw new Error('Node ID is required for get node relationships');
    }
    const headers = await getAuthHeaders();
    const params = new URLSearchParams();
    if (options?.direction) params.append('direction', options.direction);
    if (options?.type) params.append('type', options.type);
    const query = params.toString();
    return apiClient.fetch(`${BASE_PATH}/${graphId}/nodes/${nodeId}/relationships${query ? `?${query}` : ''}`, {
      headers,
    });
  },

  createRelationship: async (graphId: string, input: CreateRelationshipInput): Promise<Relationship> => {
    validateGraphId(graphId, 'create relationship');
    const headers = await getAuthHeaders();
    return apiClient.fetch(`${BASE_PATH}/${graphId}/relationships`, {
      method: 'POST',
      headers,
      body: JSON.stringify(input),
    });
  },

  deleteRelationship: async (graphId: string, relId: string): Promise<void> => {
    validateGraphId(graphId, 'delete relationship');
    if (!relId || relId.trim() === '') {
      throw new Error('Relationship ID is required for delete relationship');
    }
    const headers = await getAuthHeaders();
    await apiClient.fetch(`${BASE_PATH}/${graphId}/relationships/${relId}`, {
      method: 'DELETE',
      headers,
    });
  },

  // Query operations
  findPath: async (
    graphId: string,
    from: string,
    to: string,
    maxDepth?: number
  ): Promise<{ path: GraphNode[]; length: number }> => {
    validateGraphId(graphId, 'find path');
    if (!from || from.trim() === '' || !to || to.trim() === '') {
      throw new Error('From and To node IDs are required for find path');
    }
    const headers = await getAuthHeaders();
    const params = new URLSearchParams();
    if (maxDepth) params.append('maxDepth', maxDepth.toString());
    const query = params.toString();
    return apiClient.fetch(`${BASE_PATH}/${graphId}/path/${from}/${to}${query ? `?${query}` : ''}`, {
      headers,
    });
  },

  traverse: async (
    graphId: string,
    startNodeId: string,
    options?: TraverseOptions
  ): Promise<{ nodes: GraphNode[]; relationships: Relationship[]; depth: number; visited: string[] }> => {
    validateGraphId(graphId, 'traverse');
    if (!startNodeId || startNodeId.trim() === '') {
      throw new Error('Start node ID is required for traverse');
    }
    const headers = await getAuthHeaders();
    return apiClient.fetch(`${BASE_PATH}/${graphId}/traverse/${startNodeId}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(options),
    });
  },

  extractSubgraph: async (
    graphId: string,
    nodeIds: string[],
    depth?: number
  ): Promise<NodeBasedKnowledgeGraph> => {
    validateGraphId(graphId, 'extract subgraph');
    if (!nodeIds || nodeIds.length === 0) {
      throw new Error('Node IDs are required for extract subgraph');
    }
    const headers = await getAuthHeaders();
    return apiClient.fetch(`${BASE_PATH}/${graphId}/subgraph`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ nodeIds, depth }),
    });
  },
};

