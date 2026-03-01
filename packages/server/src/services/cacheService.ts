/**
 * Simple in-memory cache for statistics and other frequently accessed data
 * For production, consider using Redis or a more robust caching solution
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number; // Time to live in milliseconds
}

class SimpleCache {
  private cache: Map<string, CacheEntry<any>> = new Map();

  /**
   * Get cached value if it exists and hasn't expired
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) {
      return null;
    }

    const now = Date.now();
    if (now - entry.timestamp > entry.ttl) {
      // Entry expired, remove it
      this.cache.delete(key);
      return null;
    }

    return entry.data as T;
  }

  /**
   * Set a cached value with TTL
   */
  set<T>(key: string, data: T, ttlMs: number): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttlMs,
    });
  }

  /**
   * Delete a cached value
   */
  delete(key: string): void {
    this.cache.delete(key);
  }

  /**
   * Clear all cache entries matching a pattern
   */
  clearPattern(pattern: string): void {
    const regex = new RegExp(pattern);
    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Clear all cache
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Get cache size (for monitoring)
   */
  size(): number {
    return this.cache.size;
  }
}

// Singleton cache instance
export const cache = new SimpleCache();

// Cache TTL constants (in milliseconds)
export const CACHE_TTL = {
  STATISTICS: 5 * 60 * 1000, // 5 minutes
  USER_PREFERENCES: 10 * 60 * 1000, // 10 minutes
  RECOMMENDATIONS: 15 * 60 * 1000, // 15 minutes
  ACHIEVEMENTS: 10 * 60 * 1000, // 10 minutes
};

