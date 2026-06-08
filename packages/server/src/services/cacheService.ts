import { getRedisClient } from "../config/redis";

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

class SimpleCache {
  private store: Map<string, CacheEntry<any>> = new Map();

  get<T>(key: string): T | null {
    const entry = this.store.get(key);
    if (!entry) {
      return null;
    }
    const now = Date.now();
    if (now - entry.timestamp > entry.ttl) {
      this.store.delete(key);
      return null;
    }
    return entry.data as T;
  }

  set<T>(key: string, data: T, ttlMs: number): void {
    this.store.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttlMs,
    });
  }

  delete(key: string): void {
    this.store.delete(key);
  }

  clearPattern(pattern: string): void {
    const regex = new RegExp(pattern);
    for (const key of this.store.keys()) {
      if (regex.test(key)) {
        this.store.delete(key);
      }
    }
  }

  clear(): void {
    this.store.clear();
  }

  size(): number {
    return this.store.size;
  }

  keys(): IterableIterator<string> {
    return this.store.keys();
  }
}

export const cache = new SimpleCache();

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

export const CACHE_TTL = {
  STATISTICS: ONE_DAY_MS,
  USER_PREFERENCES: ONE_DAY_MS,
  RECOMMENDATIONS: ONE_DAY_MS,
  ACHIEVEMENTS: ONE_DAY_MS,
  GRAPH_QUERY: ONE_DAY_MS,
  JUMP_BACK_IN: ONE_DAY_MS,
  ENROLLMENTS: ONE_DAY_MS,
  USER_PROGRESS: ONE_DAY_MS,
  LEARNING_PATHS: ONE_DAY_MS,
  GRAPH: ONE_DAY_MS,
  GRAPHOLOGY: ONE_DAY_MS,
};

const KEY_PREFIX = "kflow:";

function prefixKey(key: string): string {
  return key.startsWith(KEY_PREFIX) ? key : `${KEY_PREFIX}${key}`;
}

export class HybridCache {
  private memory = new SimpleCache();

  private get redis() {
    return getRedisClient();
  }

  async get<T>(key: string): Promise<T | null> {
    const fullKey = prefixKey(key);

    const redis = this.redis;
    if (redis) {
      try {
        const raw = await redis.get(fullKey);
        if (raw) {
          return JSON.parse(raw) as T;
        }
        return null;
      } catch {
        // fall through to memory
      }
    }

    return this.memory.get<T>(fullKey);
  }

  async set<T>(key: string, data: T, ttlMs: number): Promise<void> {
    const fullKey = prefixKey(key);

    const redis = this.redis;
    if (redis) {
      try {
        await redis.setex(fullKey, Math.ceil(ttlMs / 1000), JSON.stringify(data));
        return;
      } catch {
        // fall through to memory
      }
    }

    this.memory.set(fullKey, data, ttlMs);
  }

  async delete(key: string): Promise<void> {
    const fullKey = prefixKey(key);

    const redis = this.redis;
    if (redis) {
      try {
        await redis.del(fullKey);
      } catch {
        // ignore
      }
    }

    this.memory.delete(fullKey);
  }

  async deletePattern(pattern: string): Promise<void> {
    const fullPattern = prefixKey(pattern);

    const redis = this.redis;
    if (redis) {
      try {
        let cursor = "0";
        do {
          const reply = await redis.scan(cursor, "MATCH", `${fullPattern}*`, "COUNT", 100);
          cursor = reply[0];
          const keys = reply[1];
          if (keys.length > 0) {
            await redis.del(...keys);
          }
        } while (cursor !== "0");
      } catch {
        // fall through to memory
      }
    }

    const regex = new RegExp(fullPattern);
    for (const key of this.memory.keys()) {
      if (regex.test(key)) {
        this.memory.delete(key);
      }
    }
  }

  async clear(): Promise<void> {
    const redis = this.redis;
    if (redis) {
      try {
        let cursor = "0";
        do {
          const reply = await redis.scan(cursor, "MATCH", `${KEY_PREFIX}*`, "COUNT", 100);
          cursor = reply[0];
          const keys = reply[1];
          if (keys.length > 0) {
            await redis.del(...keys);
          }
        } while (cursor !== "0");
      } catch {
        // ignore
      }
    }

    this.memory.clear();
  }
}

export const hybridCache = new HybridCache();
