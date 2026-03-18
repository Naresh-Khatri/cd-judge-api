import { afterAll, beforeEach, describe, expect, it } from "vitest";
import Redis from "ioredis";

import { env } from "../config/env";
import { acquireBoxId, initializeBoxPool, releaseBoxId } from "../utils/box-id-pool";

const TEST_REDIS_URL = env.REDIS_URL;

describe("box-id-pool", () => {
  let redis: Redis;

  beforeEach(async () => {
    redis = new Redis(TEST_REDIS_URL, { maxRetriesPerRequest: null });
    // Clean slate for each test
    await redis.del("isolate:box:free", "isolate:box:used");
  });

  afterAll(async () => {
    await redis.del("isolate:box:free", "isolate:box:used");
    await redis.quit();
  });

  it("initializes pool with correct number of box IDs", async () => {
    await initializeBoxPool(redis, 5);
    const freeCount = await redis.llen("isolate:box:free");
    expect(freeCount).toBe(5);
  });

  it("acquires and releases a box ID", async () => {
    await initializeBoxPool(redis, 3);
    const id = await acquireBoxId(redis);
    expect(id).toBeGreaterThanOrEqual(0);
    expect(id).toBeLessThan(3);

    // Box is now in used set
    const isUsed = await redis.sismember("isolate:box:used", String(id));
    expect(isUsed).toBe(1);

    await releaseBoxId(redis, id);

    // Box is back in free list
    const isStillUsed = await redis.sismember("isolate:box:used", String(id));
    expect(isStillUsed).toBe(0);
  });

  it("throws when pool is exhausted", async () => {
    await initializeBoxPool(redis, 2);
    await acquireBoxId(redis);
    await acquireBoxId(redis);
    await expect(acquireBoxId(redis)).rejects.toThrow("Box ID pool exhausted");
  });

  it("handles concurrent acquisitions without collision", async () => {
    const poolSize = 10;
    await initializeBoxPool(redis, poolSize);

    const ids = await Promise.all(
      Array.from({ length: poolSize }, () => acquireBoxId(redis)),
    );

    // All IDs should be unique
    const unique = new Set(ids);
    expect(unique.size).toBe(poolSize);

    // Release all
    await Promise.all(ids.map((id) => releaseBoxId(redis, id)));
    const freeCount = await redis.llen("isolate:box:free");
    expect(freeCount).toBe(poolSize);
  });
});
