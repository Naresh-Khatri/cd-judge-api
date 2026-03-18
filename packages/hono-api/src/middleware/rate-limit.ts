import type { Context, Next } from "hono";
import { Redis } from "ioredis";

import { env } from "../env";
import type { AppEnv } from "../types";

const RATE_PER_MINUTE = env.RATE_LIMIT_PER_MINUTE;
const RATE_PER_HOUR = env.RATE_LIMIT_PER_HOUR;

const redisUrl = env.REDIS_URL;
let redis: Redis | null = null;

function getRedis(): Redis {
  if (!redis) {
    redis = new Redis(redisUrl, { maxRetriesPerRequest: null });
  }
  return redis;
}

/**
 * Sliding window rate limiter using Redis.
 * Returns 429 with Retry-After header when limit exceeded.
 */
export async function rateLimitMiddleware(
  c: Context<AppEnv>,
  next: Next,
): Promise<Response | void> {
  const userId = c.var.apiKey?.userId;
  if (!userId) {
    return next();
  }

  const r = getRedis();
  const now = Math.floor(Date.now() / 1000);

  // Check per-minute limit
  const minuteKey = `ratelimit:${userId}:${Math.floor(now / 60)}`;
  const minuteCount = await r.incr(minuteKey);
  if (minuteCount === 1) {
    await r.expire(minuteKey, 120); // expire after 2 minutes
  }
  if (minuteCount > RATE_PER_MINUTE) {
    const retryAfter = 60 - (now % 60);
    return c.json(
      { message: "Rate limit exceeded. Try again later." },
      { status: 429, headers: { "Retry-After": String(retryAfter) } },
    );
  }

  // Check per-hour limit
  const hourKey = `ratelimit:${userId}:h:${Math.floor(now / 3600)}`;
  const hourCount = await r.incr(hourKey);
  if (hourCount === 1) {
    await r.expire(hourKey, 7200); // expire after 2 hours
  }
  if (hourCount > RATE_PER_HOUR) {
    const retryAfter = 3600 - (now % 3600);
    return c.json(
      { message: "Hourly rate limit exceeded. Try again later." },
      { status: 429, headers: { "Retry-After": String(retryAfter) } },
    );
  }

  return next();
}
