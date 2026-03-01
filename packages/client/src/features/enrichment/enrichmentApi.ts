/**
 * Enrichment API Client
 * 
 * Frontend API client for graph enrichment operations.
 */

import { auth } from '../../config/firebase';
import { apiClient } from '../../services/apiClient';

export interface EnrichmentOptions {
  discoverMissingConcepts?: boolean;
  analyzePrerequisites?: boolean;
  discoverRelationships?: boolean;
  analyzeLayers?: boolean;
  discoverCrossLayer?: boolean;
  autoApply?: boolean;
  stream?: boolean; // Whether to stream results
}

export interface EnrichmentResult {
  graphId: string;
  enrichments: Array<any>;
  applied: boolean;
  stats: {
    conceptsAdded?: number;
    relationshipsAdded?: number;
  };
  prompts?: Array<{ strategy: string; prompt: string }>; // Prompts used for each enrichment strategy
}

/**
 * Get a knowledge graph
 */
export async function getKnowledgeGraph(graphId: string): Promise<any> {
  const currentUser = auth.currentUser;
  if (!currentUser) {
    throw new Error('User is not authenticated');
  }

  const token = await currentUser.getIdToken();

  // apiClient.fetch already parses JSON, so we just return the result
  return apiClient.fetch(`/api/knowledge-graphs/${graphId}`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}

/**
 * Enrich a knowledge graph (with optional streaming)
 */
export async function enrichGraph(
  graphId: string,
  options: EnrichmentOptions,
  onStream?: (enrichment: any) => void
): Promise<EnrichmentResult> {
  const currentUser = auth.currentUser;
  if (!currentUser) {
    throw new Error('User is not authenticated');
  }

  const token = await currentUser.getIdToken();

  // Use streaming if explicitly enabled and callback is provided
  const shouldStream = options.stream !== false && onStream !== undefined;
  
  if (shouldStream) {
    return handleStreamingEnrichment(graphId, { ...options, stream: true }, token, onStream);
  }

  // Non-streaming: apiClient.fetch already parses JSON and handles errors
  return apiClient.fetch(`/api/enrichment/${graphId}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ ...options, stream: false }),
  });
}

/**
 * Handle streaming enrichment request
 */
async function handleStreamingEnrichment(
  graphId: string,
  options: EnrichmentOptions,
  token: string,
  onStream: (enrichment: any) => void
): Promise<EnrichmentResult> {
  const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';
  
  const response = await fetch(`${API_BASE_URL}/api/enrichment/${graphId}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(options),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to enrich graph' }));
    throw new Error(error.message || 'Failed to enrich graph');
  }

  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error('Response body is not readable');
  }

  const decoder = new TextDecoder();
  let buffer = '';
  let finalResult: EnrichmentResult | null = null;

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
              throw new Error(data.error);
            }

            // Stream individual enrichment results as they arrive
            if (data.enrichment) {
              onStream(data.enrichment);
            }

            // Capture final result when streaming completes
            if (data.result && data.done) {
              finalResult = data.result;
            }
          } catch (e) {
            if (e instanceof Error && e.message !== 'Unexpected end of JSON input') {
              throw e;
            }
          }
        }
      }
    }
  } catch (error) {
    throw error;
  }

  if (!finalResult) {
    throw new Error('Streaming enrichment did not return a result');
  }

  return finalResult;
}

/**
 * Apply enrichments to a knowledge graph
 */
export async function applyEnrichments(
  graphId: string,
  enrichments: Array<any>
): Promise<{ success: boolean; graphId: string; stats: { conceptsAdded: number; relationshipsAdded: number } }> {
  const currentUser = auth.currentUser;
  if (!currentUser) {
    throw new Error('User is not authenticated');
  }

  const token = await currentUser.getIdToken();

  return apiClient.fetch(`/api/enrichment/${graphId}/apply`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ enrichments }),
  });
}

/**
 * Enrich a specific layer of a knowledge graph (with optional streaming)
 */
export async function enrichLayer(
  graphId: string,
  layerNumber: number,
  options: EnrichmentOptions,
  onStream?: (enrichment: any) => void
): Promise<EnrichmentResult> {
  const currentUser = auth.currentUser;
  if (!currentUser) {
    throw new Error('User is not authenticated');
  }

  const token = await currentUser.getIdToken();

  // Use streaming if explicitly enabled and callback is provided
  const shouldStream = options.stream !== false && onStream !== undefined;
  
  if (shouldStream) {
    return handleStreamingLayerEnrichment(graphId, layerNumber, { ...options, stream: true }, token, onStream);
  }

  // Non-streaming: apiClient.fetch already parses JSON and handles errors
  return apiClient.fetch(`/api/enrichment/${graphId}/layers/${layerNumber}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ ...options, stream: false }),
  });
}

/**
 * Handle streaming layer enrichment request
 */
async function handleStreamingLayerEnrichment(
  graphId: string,
  layerNumber: number,
  options: EnrichmentOptions,
  token: string,
  onStream: (enrichment: any) => void
): Promise<EnrichmentResult> {
  const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';
  
  const response = await fetch(`${API_BASE_URL}/api/enrichment/${graphId}/layers/${layerNumber}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(options),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to enrich layer' }));
    throw new Error(error.message || 'Failed to enrich layer');
  }

  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error('Response body is not readable');
  }

  const decoder = new TextDecoder();
  let buffer = '';
  let finalResult: EnrichmentResult | null = null;

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
              throw new Error(data.error);
            }

            // Stream individual enrichment results as they arrive
            if (data.enrichment) {
              onStream(data.enrichment);
            }

            // Capture final result when streaming completes
            if (data.result && data.done) {
              finalResult = data.result;
            }
          } catch (e) {
            if (e instanceof Error && e.message !== 'Unexpected end of JSON input') {
              throw e;
            }
          }
        }
      }
    }
  } catch (error) {
    throw error;
  }

  if (!finalResult) {
    throw new Error('Streaming layer enrichment did not return a result');
  }

  return finalResult;
}

export const enrichmentApi = {
  getKnowledgeGraph,
  enrichGraph,
  applyEnrichments,
  enrichLayer,
};

