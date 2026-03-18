import { OpenAPIHono, createRoute, z } from "@hono/zod-openapi";

import { apiKey, apiKeyUsage, db, eq, sql } from "@acme/db";
import { codeExecutionQueue, QUEUE_NAMES } from "@acme/jobs";

import type { AppEnv } from "../types";

const router = new OpenAPIHono<AppEnv>();

// --- Schemas ---

const SubmitBodySchema = z
  .object({
    code: z.string().openapi({ example: "print('hello')" }),
    lang: z.string().openapi({ example: "py" }),
  })
  .openapi("SubmitSubmission");

const SubmitResponseSchema = z
  .object({
    id: z.string().openapi({ example: "42" }),
  })
  .openapi("SubmissionCreated");

const ExecutionResultSchema = z
  .object({
    verdict: z
      .enum(["OK", "CE", "RE", "SG", "TO", "XX"])
      .openapi({ example: "OK" }),
    time: z.number().openapi({ example: 150 }),
    memory: z.number().openapi({ example: 2048 }),
    stdout: z.string().optional().openapi({ example: "hello\n" }),
    stderr: z.string().optional().openapi({ example: "" }),
    exitCode: z.number().optional().openapi({ example: 0 }),
    exitSignal: z.number().optional(),
    errorType: z.string().optional(),
    lineNumber: z.number().nullable().optional(),
    cgMemory: z.number().optional().openapi({ description: "cgroup memory usage in KB" }),
    wallTime: z.number().optional().openapi({ description: "Wall clock time in ms" }),
    cswForced: z.number().optional().openapi({ description: "Forced context switches" }),
    cswVoluntary: z.number().optional().openapi({ description: "Voluntary context switches" }),
    cgOomKilled: z.boolean().optional().openapi({ description: "Whether OOM killer was triggered" }),
  })
  .openapi("ExecutionResult");

const SubmissionResultSchema = z
  .object({
    id: z.string(),
    status: z.string().openapi({ example: "completed" }),
    result: ExecutionResultSchema.nullable(),
    submittedAt: z.number().nullable(),
    processedAt: z.number().nullable(),
    finishedAt: z.number().nullable(),
  })
  .openapi("SubmissionResult");

const ErrorSchema = z
  .object({
    message: z.string(),
  })
  .openapi("Error");

// --- Routes ---

const submitRoute = createRoute({
  method: "post",
  path: "/",
  tags: ["Submissions"],
  summary: "Submit code for execution",
  security: [{ Bearer: [] }],
  request: {
    body: {
      required: true,
      content: {
        "application/json": { schema: SubmitBodySchema },
      },
    },
  },
  responses: {
    200: {
      description: "Job created",
      content: {
        "application/json": { schema: SubmitResponseSchema },
      },
    },
    400: {
      description: "Invalid request body",
      content: {
        "application/json": { schema: ErrorSchema },
      },
    },
    401: { description: "Unauthorized" },
    500: {
      description: "Internal server error",
      content: {
        "application/json": { schema: ErrorSchema },
      },
    },
  },
});

router.openapi(submitRoute, async (c) => {
  const existingKey = c.var.apiKey;
  const { code, lang } = c.req.valid("json");

  try {
    const job = await codeExecutionQueue.add(QUEUE_NAMES.CODE_EXECUTION, {
      code,
      lang,
      userId: existingKey.userId,
    });

    // Track success
    const today = new Date().toISOString().slice(0, 10);
    await db.transaction(async (tx) => {
      await tx
        .update(apiKey)
        .set({
          lastUsedAt: new Date(),
          totalRequests: sql`${apiKey.totalRequests} + 1`,
          successfulRequests: sql`${apiKey.successfulRequests} + 1`,
        })
        .where(eq(apiKey.id, existingKey.id));

      await tx
        .insert(apiKeyUsage)
        .values({
          apiKeyId: existingKey.id,
          day: today,
          language: lang,
          count: 1,
          successful: 1,
          failed: 0,
        })
        .onConflictDoUpdate({
          target: [
            apiKeyUsage.apiKeyId,
            apiKeyUsage.day,
            apiKeyUsage.language,
          ],
          set: {
            count: sql`${apiKeyUsage.count} + 1`,
            successful: sql`${apiKeyUsage.successful} + 1`,
          },
        });
    });

    return c.json({ id: String(job.id) }, 200);
  } catch (error) {
    // Track failure
    const failedLang = lang || "unknown";
    const today = new Date().toISOString().slice(0, 10);
    await db.transaction(async (tx) => {
      await tx
        .update(apiKey)
        .set({
          lastUsedAt: new Date(),
          totalRequests: sql`${apiKey.totalRequests} + 1`,
          failedRequests: sql`${apiKey.failedRequests} + 1`,
        })
        .where(eq(apiKey.id, existingKey.id));

      await tx
        .insert(apiKeyUsage)
        .values({
          apiKeyId: existingKey.id,
          day: today,
          language: failedLang,
          count: 1,
          successful: 0,
          failed: 1,
        })
        .onConflictDoUpdate({
          target: [
            apiKeyUsage.apiKeyId,
            apiKeyUsage.day,
            apiKeyUsage.language,
          ],
          set: {
            count: sql`${apiKeyUsage.count} + 1`,
            failed: sql`${apiKeyUsage.failed} + 1`,
          },
        });
    });

    console.error(error);
    return c.json({ message: "Internal Server Error" }, 500);
  }
});

const getResultRoute = createRoute({
  method: "get",
  path: "/{id}",
  tags: ["Submissions"],
  summary: "Get submission result",
  security: [{ Bearer: [] }],
  request: {
    params: z.object({
      id: z.string().openapi({ example: "42", description: "Job ID" }),
    }),
  },
  responses: {
    200: {
      description: "Submission result",
      content: {
        "application/json": { schema: SubmissionResultSchema },
      },
    },
    401: { description: "Unauthorized" },
    404: {
      description: "Job not found",
      content: {
        "application/json": { schema: ErrorSchema },
      },
    },
  },
});

router.openapi(getResultRoute, async (c) => {
  const existingKey = c.var.apiKey;
  const { id } = c.req.valid("param");

  // Update last used
  await db
    .update(apiKey)
    .set({ lastUsedAt: new Date() })
    .where(eq(apiKey.id, existingKey.id));

  const job = await codeExecutionQueue.getJob(id);

  if (!job) {
    return c.json({ message: "Job not found" }, 404);
  }

  const state = await job.getState();
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const result = job.returnvalue;

  return c.json(
    {
      id: String(job.id),
      status: state,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      result: result ?? null,
      submittedAt: job.timestamp,
      processedAt: job.processedOn ?? null,
      finishedAt: job.finishedOn ?? null,
    },
    200,
  );
});

export default router;
