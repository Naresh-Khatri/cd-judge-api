import type { Redis } from "ioredis";

const FREE_KEY = "isolate:box:free";
const USED_KEY = "isolate:box:used";

/**
 * Seed the free pool with box IDs [0, maxBoxId).
 * Idempotent — clears and re-populates both keys.
 */
export async function initializeBoxPool(
  redis: Redis,
  maxBoxId: number,
): Promise<void> {
  const pipeline = redis.pipeline();
  pipeline.del(FREE_KEY);
  pipeline.del(USED_KEY);
  for (let i = 0; i < maxBoxId; i++) {
    pipeline.rpush(FREE_KEY, String(i));
  }
  await pipeline.exec();
}

/**
 * Atomically acquire a box ID from the free pool.
 * Throws if the pool is exhausted (all boxes in use).
 */
export async function acquireBoxId(redis: Redis): Promise<number> {
  const id = await redis.lpop(FREE_KEY);
  if (id === null) {
    throw new Error(
      "Box ID pool exhausted — all sandbox slots are in use. Retry later.",
    );
  }
  await redis.sadd(USED_KEY, id);
  return parseInt(id, 10);
}

/**
 * Return a box ID to the free pool.
 */
export async function releaseBoxId(redis: Redis, id: number): Promise<void> {
  const pipeline = redis.pipeline();
  pipeline.srem(USED_KEY, String(id));
  pipeline.rpush(FREE_KEY, String(id));
  await pipeline.exec();
}
