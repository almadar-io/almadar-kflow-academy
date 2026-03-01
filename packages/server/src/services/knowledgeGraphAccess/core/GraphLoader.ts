/**
 * Graph Loader
 * 
 * Handles loading and saving NodeBasedKnowledgeGraph from/to database.
 * Uses GraphCacheManager for caching.
 */

import Graph from 'graphology';
import { GraphCacheManager } from './GraphCacheManager';
import { toGraphologyGraph } from '../GraphologyAdapter';
import { getNodeBasedKnowledgeGraph, saveNodeBasedKnowledgeGraph } from '../../knowledgeGraphService';
import { getFirestore } from '../../../config/firebaseAdmin';
import type { NodeBasedKnowledgeGraph } from '../../../types/nodeBasedKnowledgeGraph';

export class GraphLoader {
  constructor(private cacheManager: GraphCacheManager) {}

  /**
   * Get graph from cache or load from database
   */
  async getGraph(uid: string, graphId: string): Promise<NodeBasedKnowledgeGraph> {
    // Check cache first
    const cached = this.cacheManager.getCachedGraph(uid, graphId);
    if (cached) {
      return cached;
    }

    // Load from database
    const graph = await getNodeBasedKnowledgeGraph(uid, graphId);
    if (!graph) {
      throw new Error(`Graph ${graphId} not found`);
    }

    // Cache and return
    this.cacheManager.setCachedGraph(uid, graphId, graph);
    return graph;
  }

  /**
   * Get graphology graph (cached for performance)
   */
  async getGraphologyGraph(uid: string, graphId: string): Promise<Graph> {
    // Check cache first
    const cached = this.cacheManager.getCachedGraphologyGraph(uid, graphId);
    if (cached) {
      return cached;
    }

    // Get NodeBasedKnowledgeGraph (from cache or DB)
    const nodeBasedGraph = await this.getGraph(uid, graphId);

    // Convert to graphology and cache
    const graphologyGraph = toGraphologyGraph(nodeBasedGraph);
    this.cacheManager.setCachedGraphologyGraph(uid, graphId, graphologyGraph);

    return graphologyGraph;
  }

  /**
   * Save graph to database and update cache
   * @param expectedVersion - Optional version for optimistic locking
   */
  async saveGraph(
    uid: string,
    graph: NodeBasedKnowledgeGraph,
    expectedVersion?: number
  ): Promise<NodeBasedKnowledgeGraph> {
    graph.updatedAt = Date.now();
    const savedGraph = await saveNodeBasedKnowledgeGraph(uid, graph, expectedVersion);
    
    // Update cache with saved graph (may be merged)
    this.cacheManager.setCachedGraph(uid, savedGraph.id, savedGraph);
    
    return savedGraph;
  }

  /**
   * Delete graph from database and clear cache
   */
  async deleteGraph(uid: string, graphId: string): Promise<void> {
    const db = getFirestore();
    const kgRef = db
      .collection('users')
      .doc(uid)
      .collection('knowledgeGraphs')
      .doc(graphId);

    // Check if graph exists
    const doc = await kgRef.get();
    if (!doc.exists) {
      throw new Error(`Graph ${graphId} not found`);
    }

    // Delete the graph document
    await kgRef.delete();

    // Clear cache
    this.cacheManager.invalidateCache(uid, graphId);
  }

  /**
   * Check if graph exists
   */
  async graphExists(uid: string, graphId: string): Promise<boolean> {
    try {
      await this.getGraph(uid, graphId);
      return true;
    } catch {
      return false;
    }
  }
}
