/**
 * Graph Cache Manager
 *
 * Handles caching for NodeBasedKnowledgeGraph and graphology graphs.
 * Node-based graphs use the shared HybridCache (Redis + memory).
 * Graphology graphs use a private in-memory cache (not serializable to Redis).
 */

import { hybridCache, CACHE_TTL } from '../../cacheService';
import type { NodeBasedKnowledgeGraph } from '../../../types/nodeBasedKnowledgeGraph';
import type Graph from 'graphology';

// Private in-memory store for graphology graphs (not JSON-serializable)
const graphologyStore = new Map<string, Graph>();

export class GraphCacheManager {
  private graphologyTTL: number = CACHE_TTL.GRAPHOLOGY;

  getGraphCacheKey(uid: string, graphId: string): string {
    return `graph:${uid}:${graphId}`;
  }

  getGraphologyCacheKey(uid: string, graphId: string): string {
    return `graphology:${uid}:${graphId}`;
  }

  async getCachedGraph(uid: string, graphId: string): Promise<NodeBasedKnowledgeGraph | null> {
    const cacheKey = this.getGraphCacheKey(uid, graphId);
    return hybridCache.get<NodeBasedKnowledgeGraph>(cacheKey);
  }

  async setCachedGraph(uid: string, graphId: string, graph: NodeBasedKnowledgeGraph): Promise<void> {
    const cacheKey = this.getGraphCacheKey(uid, graphId);
    await hybridCache.set(cacheKey, graph, CACHE_TTL.GRAPH);
    this.invalidateGraphologyCache(uid, graphId);
  }

  getCachedGraphologyGraph(uid: string, graphId: string): Graph | null {
    const cacheKey = this.getGraphologyCacheKey(uid, graphId);
    return graphologyStore.get(cacheKey) || null;
  }

  setCachedGraphologyGraph(uid: string, graphId: string, graph: Graph): void {
    const cacheKey = this.getGraphologyCacheKey(uid, graphId);
    graphologyStore.set(cacheKey, graph);
    // No TTL eviction for graphology — cleared on invalidation or process restart
  }

  invalidateGraphologyCache(uid: string, graphId: string): void {
    graphologyStore.delete(this.getGraphologyCacheKey(uid, graphId));
  }

  async invalidateCache(uid: string, graphId: string): Promise<void> {
    await hybridCache.delete(this.getGraphCacheKey(uid, graphId));
    this.invalidateGraphologyCache(uid, graphId);
  }

  async clearAllCache(): Promise<void> {
    await hybridCache.deletePattern('graph:');
    graphologyStore.clear();
  }

  setCacheTTL(ttl: number): void {
    this.graphologyTTL = ttl;
  }

  getCacheTTL(): number {
    return this.graphologyTTL;
  }
}
