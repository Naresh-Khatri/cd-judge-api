import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

export const env = createEnv({
  server: {
    REDIS_URL: z.string().min(1).default("redis://localhost:6379"),
    RATE_LIMIT_PER_MINUTE: z.coerce.number().int().positive().default(1000000),
    RATE_LIMIT_PER_HOUR: z.coerce.number().int().positive().default(10000000),
  },

  runtimeEnv: process.env,

  emptyStringAsUndefined: true,
});
