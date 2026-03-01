/**
 * Tests for GraphCacheManager
 */

import { GraphCacheManager } from '../../../../services/knowledgeGraphAccess/core/GraphCacheManager';
import type { NodeBasedKnowledgeGraph } from '../../../../types/nodeBasedKnowledgeGraph';

// Mock the cache service
const mockCache = new Map<string, { data: any; timestamp: number; ttl: number }>();
jest.mock('../../../../services/cacheService', () => ({
  cache: {
    get: jest.fn((key: string) => {
      const entry = mockCache.get(key);
      if (!entry) return null;
      // Check TTL
      if (Date.now() > entry.timestamp + entry.ttl) {
        mockCache.delete(key);
        return null;
      }
      return entry.data;
    }),
    set: jest.fn((key: string, data: any, ttlMs: number) => {
      mockCache.set(key, { data, timestamp: Date.now(), ttl: ttlMs });
    }),
    delete: jest.fn((key: string) => {
      mockCache.delete(key);
    }),
    clearPattern: jest.fn((pattern: string) => {
      const regex = new RegExp(pattern);
      for (const key of mockCache.keys()) {
        if (regex.test(key)) {
          mockCache.delete(key);
        }
      }
    }),
  },
}));

describe('GraphCacheManager', () => {
  let cacheManager: GraphCacheManager;
  const uid = 'test-user';
  const graphId = 'test-graph';

  const sampleGraph: NodeBasedKnowledgeGraph = {
    id: graphId,
    seedConceptId: 'seed-1',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    version: 1,
    nodes: {},
    relationships: [],
    nodeTypes: {
      Graph: [],
      Concept: [],
      Layer: [],
      LearningGoal: [],
      Milestone: [],
      PracticeExercise: [],
      Lesson: [],
      ConceptMetadata: [],
      GraphMetadata: [],
      FlashCard: [],
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockCache.clear();
    cacheManager = new GraphCacheManager();
  });

  describe('cache key generation', () => {
    it('should generate correct graph cache key', () => {
      const key = cacheManager.getGraphCacheKey(uid, graphId);
      expect(key).toBe('graph:test-user:test-graph');
    });

    it('should generate correct graphology cache key', () => {
      const key = cacheManager.getGraphologyCacheKey(uid, graphId);
      expect(key).toBe('graphology:test-user:test-graph');
    });
  });

  describe('graph caching', () => {
    it('should return null for uncached graph', () => {
      const result = cacheManager.getCachedGraph(uid, graphId);
      expect(result).toBeNull();
    });

    it('should cache and retrieve graph', () => {
      cacheManager.setCachedGraph(uid, graphId, sampleGraph);
      const result = cacheManager.getCachedGraph(uid, graphId);
      expect(result).toEqual(sampleGraph);
    });

    it('should invalidate graphology cache when setting graph', () => {
      // Pre-set a graphology cache entry
      const graphologyKey = cacheManager.getGraphologyCacheKey(uid, graphId);
      mockCache.set(graphologyKey, { data: {}, timestamp: Date.now(), ttl: 300000 });

      cacheManager.setCachedGraph(uid, graphId, sampleGraph);

      // Graphology cache should be cleared
      expect(mockCache.has(graphologyKey)).toBe(false);
    });
  });

  describe('cache invalidation', () => {
    it('should invalidate specific graph cache', () => {
      cacheManager.setCachedGraph(uid, graphId, sampleGraph);
      expect(cacheManager.getCachedGraph(uid, graphId)).not.toBeNull();

      cacheManager.invalidateCache(uid, graphId);
      expect(cacheManager.getCachedGraph(uid, graphId)).toBeNull();
    });

    it('should clear all graph cache', () => {
      cacheManager.setCachedGraph(uid, 'graph-1', sampleGraph);
      cacheManager.setCachedGraph(uid, 'graph-2', sampleGraph);

      cacheManager.clearAllCache();

      expect(cacheManager.getCachedGraph(uid, 'graph-1')).toBeNull();
      expect(cacheManager.getCachedGraph(uid, 'graph-2')).toBeNull();
    });
  });

  describe('TTL management', () => {
    it('should get default TTL', () => {
      expect(cacheManager.getCacheTTL()).toBe(5 * 60 * 1000); // 5 minutes
    });

    it('should set custom TTL', () => {
      cacheManager.setCacheTTL(60000); // 1 minute
      expect(cacheManager.getCacheTTL()).toBe(60000);
    });
  });
});
