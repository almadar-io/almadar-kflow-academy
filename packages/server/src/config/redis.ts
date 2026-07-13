import Redis from "ioredis";
import { createLogger } from "@almadar/logger";

const log = createLogger("kflow:server:config:redis");

let redis: Redis | null = null;

export function getRedisClient(): Redis | null {
  if (redis) {
    return redis;
  }

  const redisUrl = process.env.REDIS_URL;
  if (!redisUrl) {
    return null;
  }

  try {
    redis = new Redis(redisUrl, {
      retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        if (times > 3) {
          log.warn('Redis connection failed; falling back to in-memory cache', { retries: times });
          return null;
        }
        return delay;
      },
      maxRetriesPerRequest: 3,
      enableReadyCheck: true,
      lazyConnect: true,
    });

    redis.on("error", (err) => {
      log.warn("Redis error", { error: err.message });
    });

    redis.on("connect", () => {
      log.info("Redis connected");
    });

    return redis;
  } catch (err) {
    log.warn("Failed to initialize Redis client", { error: err instanceof Error ? err.message : String(err) });
    return null;
  }
}

export async function closeRedis(): Promise<void> {
  if (redis) {
    await redis.quit();
    redis = null;
  }
}
