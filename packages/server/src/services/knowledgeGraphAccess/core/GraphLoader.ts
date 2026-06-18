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
import { getFirestore } from '@almadar/server';
import { invalidateGraphCaches } from '../../cacheInvalidation';
import type { NodeBasedKnowledgeGraph } from '../../../types/nodeBasedKnowledgeGraph';

export class GraphLoader {
  constructor(private cacheManager: GraphCacheManager) {}

  async getGraph(uid: string, graphId: string): Promise<NodeBasedKnowledgeGraph> {
    const cached = await this.cacheManager.getCachedGraph(uid, graphId);
    if (cached) {
      return cached;
    }

    const graph = await getNodeBasedKnowledgeGraph(uid, graphId);
    if (!graph) {
      throw new Error(`Graph ${graphId} not found`);
    }

    await this.cacheManager.setCachedGraph(uid, graphId, graph);
    return graph;
  }

  async getGraphologyGraph(uid: string, graphId: string): Promise<Graph> {
    const cached = this.cacheManager.getCachedGraphologyGraph(uid, graphId);
    if (cached) {
      return cached;
    }

    const nodeBasedGraph = await this.getGraph(uid, graphId);
    const graphologyGraph = toGraphologyGraph(nodeBasedGraph);
    this.cacheManager.setCachedGraphologyGraph(uid, graphId, graphologyGraph);

    return graphologyGraph;
  }

  async saveGraph(
    uid: string,
    graph: NodeBasedKnowledgeGraph,
    expectedVersion?: number
  ): Promise<NodeBasedKnowledgeGraph> {
    graph.updatedAt = Date.now();
    const savedGraph = await saveNodeBasedKnowledgeGraph(uid, graph, expectedVersion);

    await this.cacheManager.setCachedGraph(uid, savedGraph.id, savedGraph);
    await invalidateGraphCaches(uid, savedGraph.id);

    return savedGraph;
  }

  async deleteGraph(uid: string, graphId: string): Promise<void> {
    const db = getFirestore();
    const kgRef = db
      .collection('users')
      .doc(uid)
      .collection('knowledgeGraphs')
      .doc(graphId);

    const doc = await kgRef.get();
    if (!doc.exists) {
      throw new Error(`Graph ${graphId} not found`);
    }

    await kgRef.delete();

    await this.cacheManager.invalidateCache(uid, graphId);
    await invalidateGraphCaches(uid, graphId);
  }

  async graphExists(uid: string, graphId: string): Promise<boolean> {
    try {
      await this.getGraph(uid, graphId);
      return true;
    } catch {
      return false;
    }
  }
}
