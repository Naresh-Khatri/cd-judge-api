/**
 * Standalone worker entry point — only runs inside the Docker container.
 * Sets up the BullMQ worker that processes code execution jobs.
 */
import { Worker } from "bullmq";

import { MAX_BOX_ID, env } from "./config/env";
import { connection } from "./connection";
import { QUEUE_NAMES } from "./queue";
import { Language } from "./types";
import { acquireBoxId, initializeBoxPool, releaseBoxId } from "./utils/box-id-pool";
import IsolateRunner from "./utils/isolate-runner";
import { logger } from "./utils/logger";
import { setupGracefulShutdown } from "./utils/shutdown";

// Initialize box pool on startup
initializeBoxPool(connection, MAX_BOX_ID).catch((err) => {
  logger.error("Failed to initialize box pool", { error: String(err) });
  process.exit(1);
});

const codeExecutionWorker = new Worker(
  QUEUE_NAMES.CODE_EXECUTION,
  async (job) => {
    const runner = new IsolateRunner();

    const { code, lang, stdin, timeLimit, memoryLimit, subProcessLimit } =
      job.data;

    if (!code || !lang) {
      throw new Error("Missing code or lang in job data");
    }

    // Acquire a box ID from the Redis-backed pool
    const boxId = await acquireBoxId(connection);
    logger.info("Job started", { jobId: job.id, boxId, lang });

    try {
      const result = await runner.runCode({
        code,
        lang: lang as Language,
        stdin: stdin || "",
        boxId,
        options: {
          timeLimit,
          memoryLimit,
          subProcessLimit,
        },
      });
      logger.info("Job completed", {
        jobId: job.id,
        boxId,
        lang,
        verdict: result.verdict,
        time: result.time,
      });
      return result;
    } catch (error) {
      logger.error("Code execution failed", {
        jobId: job.id,
        boxId,
        lang,
        error: String(error),
      });
      throw error;
    } finally {
      await releaseBoxId(connection, boxId);
    }
  },
  {
    connection,
    concurrency: env.WORKER_CONCURRENCY,
    lockDuration: 120_000,
    lockRenewTime: 30_000,
    limiter: {
      max: env.QUEUE_RATE_MAX,
      duration: env.QUEUE_RATE_DURATION,
    },
  },
);

// Move permanently failed jobs to dead letter queue
codeExecutionWorker.on("failed", async (job, err) => {
  if (job && job.attemptsMade >= (job.opts.attempts || 3)) {
    const { moveToDeadLetter } = await import("./queues/dead-letter");
    await moveToDeadLetter(job, err);
    logger.error("Job moved to DLQ after final failure", {
      jobId: job.id,
      attempts: job.attemptsMade,
      error: String(err),
    });
  }
});

// Graceful shutdown
setupGracefulShutdown([codeExecutionWorker]);

logger.info("Worker started", {
  concurrency: env.WORKER_CONCURRENCY,
  redis: env.REDIS_URL,
  pid: process.pid,
});
