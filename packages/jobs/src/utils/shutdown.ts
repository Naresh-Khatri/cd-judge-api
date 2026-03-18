import type { Worker } from "bullmq";

import { logger } from "./logger";

const HARD_TIMEOUT_MS = 30_000;

export function setupGracefulShutdown(workers: Worker[]): void {
  let shutting = false;

  const shutdown = async (signal: string) => {
    if (shutting) return;
    shutting = true;
    logger.info(`Received ${signal}, shutting down gracefully...`);

    const hardTimer = setTimeout(() => {
      logger.error("Graceful shutdown timed out, forcing exit");
      process.exit(1);
    }, HARD_TIMEOUT_MS);
    // Unref so it doesn't keep the process alive if workers close quickly
    hardTimer.unref();

    try {
      await Promise.all(workers.map((w) => w.close()));
      logger.info("All workers closed");
      process.exit(0);
    } catch (err) {
      logger.error("Error during shutdown", { error: String(err) });
      process.exit(1);
    }
  };

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
}
