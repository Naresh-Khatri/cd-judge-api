import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

export const env = createEnv({
  server: {
    NODE_ENV: z
      .enum(["development", "production", "test"])
      .default("development"),
    REDIS_URL: z.string().min(1).default("redis://localhost:6379"),
    WORKER_CONCURRENCY: z.coerce.number().int().positive().default(10),
    MAX_BOX_ID: z.coerce.number().int().positive().optional(),
    CODE_MAX_SIZE_BYTES: z.coerce
      .number()
      .int()
      .positive()
      .default(64 * 1024),
    STDIN_MAX_SIZE_BYTES: z.coerce
      .number()
      .int()
      .positive()
      .default(1 * 1024 * 1024),
    STDOUT_MAX_SIZE_BYTES: z.coerce
      .number()
      .int()
      .positive()
      .default(1 * 1024 * 1024),
    JOB_COMPLETE_AGE: z.coerce.number().int().positive().default(3600),
    JOB_COMPLETE_COUNT: z.coerce.number().int().positive().default(1000),
    JOB_FAIL_AGE: z.coerce.number().int().positive().default(86400),
    JOB_FAIL_COUNT: z.coerce.number().int().positive().default(5000),
    QUEUE_RATE_MAX: z.coerce.number().int().positive().default(200),
    QUEUE_RATE_DURATION: z.coerce.number().int().positive().default(60_000),
    COMPILE_CACHE_DIR: z
      .string()
      .min(1)
      .default("/tmp/cd-judge-compile-cache"),
    COMPILE_CACHE_MAX_ENTRIES: z.coerce
      .number()
      .int()
      .positive()
      .default(500),
  },

  runtimeEnv: process.env,

  emptyStringAsUndefined: true,
});

// Derived values
export const MAX_BOX_ID = env.MAX_BOX_ID ?? env.WORKER_CONCURRENCY * 2;
