import type { Job } from "bullmq";
import { Queue } from "bullmq";

import { connection } from "../connection";

export const deadLetterQueue = new Queue("code-execution-dlq", { connection });

export async function moveToDeadLetter(
  job: Job,
  error: Error,
): Promise<void> {
  await deadLetterQueue.add("dead-letter", {
    originalJobId: job.id,
    originalJobName: job.name,
    data: job.data,
    failedReason: error.message,
    attemptsMade: job.attemptsMade,
    failedAt: new Date().toISOString(),
  });
}
