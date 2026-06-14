/**
 * deletePattern must use glob semantics consistently across the Redis and
 * in-memory branches. The original bug: callers passed regex patterns (`.*`)
 * while Redis SCAN MATCH expects glob, so `graphQuery:.*:uid` never matched the
 * real key `kflow:graphQuery:learningPaths:uid` on the deployed (Redis) server —
 * leaving learning-path caches stale for the full TTL. These tests run the
 * in-memory branch (no REDIS_URL) and lock in glob matching for the key shapes
 * the invalidation layer actually uses.
 */

import { HybridCache } from "../../services/cacheService";
import { CACHE_KEYS } from "../../services/cacheInvalidation";

const TTL = 60_000;

describe("HybridCache.deletePattern (glob, in-memory branch)", () => {
  let cache: HybridCache;

  beforeEach(() => {
    delete process.env.REDIS_URL; // force the in-memory path
    cache = new HybridCache();
  });

  it("clears the real graphQuery learning-paths key via the invalidation pattern", async () => {
    await cache.set("graphQuery:learningPaths:uid1", ["stale"], TTL);
    await cache.set("graphQuery:summary:uid1:g1", { stale: true }, TTL);

    await cache.deletePattern(CACHE_KEYS.graphQuery("uid1"));

    expect(await cache.get("graphQuery:learningPaths:uid1")).toBeNull();
    expect(await cache.get("graphQuery:summary:uid1:g1")).toBeNull();
  });

  it("does not clear another user's keys", async () => {
    await cache.set("graphQuery:learningPaths:uid1", ["a"], TTL);
    await cache.set("graphQuery:learningPaths:uid2", ["b"], TTL);

    await cache.deletePattern(CACHE_KEYS.graphQuery("uid1"));

    expect(await cache.get("graphQuery:learningPaths:uid1")).toBeNull();
    expect(await cache.get("graphQuery:learningPaths:uid2")).toEqual(["b"]);
  });

  it("scopes a graphId-specific pattern to that graph", async () => {
    await cache.set("graphQuery:summary:uid1:g1", 1, TTL);
    await cache.set("graphQuery:concepts:uid1:g1:true:false", 2, TTL);
    await cache.set("graphQuery:summary:uid1:g2", 3, TTL);

    await cache.deletePattern(CACHE_KEYS.graphQuery("uid1", "g1"));

    expect(await cache.get("graphQuery:summary:uid1:g1")).toBeNull();
    expect(await cache.get("graphQuery:concepts:uid1:g1:true:false")).toBeNull();
    expect(await cache.get("graphQuery:summary:uid1:g2")).toBe(3);
  });

  it("treats non-* characters literally — `graph:` must not match `graphQuery:`", async () => {
    await cache.set("graph:uid1:g1", "graphdoc", TTL);
    await cache.set("graphQuery:learningPaths:uid1", "summary", TTL);

    await cache.deletePattern("graph:");

    expect(await cache.get("graph:uid1:g1")).toBeNull();
    expect(await cache.get("graphQuery:learningPaths:uid1")).toBe("summary");
  });
});
