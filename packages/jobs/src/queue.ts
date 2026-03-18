import { Queue } from "bullmq";

import { env } from "./config/env";
import { connection } from "./connection";

export const QUEUE_NAMES = {
  CODE_EXECUTION: "code-execution",
};

export const codeExecutionQueue = new Queue(QUEUE_NAMES.CODE_EXECUTION, {
  connection,
  defaultJobOptions: {
    removeOnComplete: {
      age: env.JOB_COMPLETE_AGE,
      count: env.JOB_COMPLETE_COUNT,
    },
    removeOnFail: {
      age: env.JOB_FAIL_AGE,
      count: env.JOB_FAIL_COUNT,
    },
    attempts: 3,
    backoff: { type: "exponential", delay: 5000 },
  },
});
