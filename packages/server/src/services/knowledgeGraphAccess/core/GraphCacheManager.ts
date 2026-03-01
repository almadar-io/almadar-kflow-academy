/**
 * Graph Cache Manager
 * 
 * Handles caching for NodeBasedKnowledgeGraph and graphology graphs.
 */

import { cache } from '../../cacheService';
import type { NodeBasedKnowledgeGraph } from '../../../types/nodeBasedKnowledgeGraph';
import type Graph from 'graphology';

export class GraphCacheManager {
  private cacheTTL: number = 5 * 60 * 1000; // 5 minutes

  /**
   * Get cache key for NodeBasedKnowledgeGraph
   */
  getGraphCacheKey(uid: string, graphId: string): string {
    return `graph:${uid}:${graphId}`;
  }

  /**
   * Get cache key for graphology graph
   */
  getGraphologyCacheKey(uid: string, graphId: string): string {
    return `graphology:${uid}:${graphId}`;
  }

  /**
   * Get cached NodeBasedKnowledgeGraph
   */
  getCachedGraph(uid: string, graphId: string): NodeBasedKnowledgeGraph | null {
    const cacheKey = this.getGraphCacheKey(uid, graphId);
    return cache.get<NodeBasedKnowledgeGraph>(cacheKey) || null;
  }

  /**
   * Set cached NodeBasedKnowledgeGraph
   */
  setCachedGraph(uid: string, graphId: string, graph: NodeBasedKnowledgeGraph): void {
    const cacheKey = this.getGraphCacheKey(uid, graphId);
    cache.set(cacheKey, graph, this.cacheTTL);
    // Invalidate graphology cache when node-based graph changes
    this.invalidateGraphologyCache(uid, graphId);
  }

  /**
   * Get cached graphology graph
   */
  getCachedGraphologyGraph(uid: string, graphId: string): Graph | null {
    const cacheKey = this.getGraphologyCacheKey(uid, graphId);
    return cache.get<Graph>(cacheKey) || null;
  }

  /**
   * Set cached graphology graph
   */
  setCachedGraphologyGraph(uid: string, graphId: string, graph: Graph): void {
    const cacheKey = this.getGraphologyCacheKey(uid, graphId);
    cache.set(cacheKey, graph, this.cacheTTL);
  }

  /**
   * Invalidate graphology cache only
   */
  invalidateGraphologyCache(uid: string, graphId: string): void {
    cache.delete(this.getGraphologyCacheKey(uid, graphId));
  }

  /**
   * Invalidate all cache for a graph
   */
  invalidateCache(uid: string, graphId: string): void {
    cache.delete(this.getGraphCacheKey(uid, graphId));
    cache.delete(this.getGraphologyCacheKey(uid, graphId));
  }

  /**
   * Clear all graph-related cache
   */
  clearAllCache(): void {
    cache.clearPattern('^graph:');
    cache.clearPattern('^graphology:');
  }

  /**
   * Set cache TTL
   */
  setCacheTTL(ttl: number): void {
    this.cacheTTL = ttl;
  }

  /**
   * Get current cache TTL
   */
  getCacheTTL(): number {
    return this.cacheTTL;
  }
}
