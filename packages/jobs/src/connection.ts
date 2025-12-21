import { Redis } from "ioredis";

const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";

export const connection = new Redis(redisUrl, {
  maxRetriesPerRequest: null,
});
