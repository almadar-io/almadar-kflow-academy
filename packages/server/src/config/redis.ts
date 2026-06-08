import Redis from "ioredis";

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
          console.warn(`Redis connection failed after ${times} retries; falling back to in-memory cache`);
          return null;
        }
        return delay;
      },
      maxRetriesPerRequest: 3,
      enableReadyCheck: true,
      lazyConnect: true,
    });

    redis.on("error", (err) => {
      console.warn("Redis error:", err.message);
    });

    redis.on("connect", () => {
      console.log("Redis connected");
    });

    return redis;
  } catch (err) {
    console.warn("Failed to initialize Redis client:", err);
    return null;
  }
}

export async function closeRedis(): Promise<void> {
  if (redis) {
    await redis.quit();
    redis = null;
  }
}
