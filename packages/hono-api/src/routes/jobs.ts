import { OpenAPIHono, createRoute, z } from "@hono/zod-openapi";

import { apiKey, db, eq } from "@acme/db";
import { codeExecutionQueue } from "@acme/jobs";

import type { AppEnv } from "../types";

const router = new OpenAPIHono<AppEnv>();

// --- Schemas ---

const SubmitJobBodySchema = z
  .object({
    code: z.string().openapi({ example: "print('hello')" }),
    language: z.string().openapi({ example: "py" }),
  })
  .openapi("SubmitJob");

const JobCreatedSchema = z
  .object({
    id: z.string().openapi({ example: "42" }),
  })
  .openapi("JobCreated");

const JobResultSchema = z
  .object({
    id: z.string(),
    status: z.string().openapi({ example: "completed" }),
    result: z
      .object({
        verdict: z.enum(["OK", "CE", "RE", "SG", "TO", "XX"]),
        time: z.number(),
        memory: z.number(),
        stdout: z.string().optional(),
        stderr: z.string().optional(),
        exitCode: z.number().optional(),
        exitSignal: z.number().optional(),
        errorType: z.string().optional(),
        lineNumber: z.number().nullable().optional(),
        cgMemory: z.number().optional(),
        wallTime: z.number().optional(),
        cswForced: z.number().optional(),
        cswVoluntary: z.number().optional(),
        cgOomKilled: z.boolean().optional(),
      })
      .nullable(),
    submittedAt: z.number().nullable(),
    processedAt: z.number().nullable(),
    finishedAt: z.number().nullable(),
  })
  .openapi("JobResult");

const ErrorSchema = z.object({ message: z.string() }).openapi("JobError");

// --- Routes ---

const submitJobRoute = createRoute({
  method: "post",
  path: "/",
  tags: ["Jobs"],
  summary: "Submit a code execution job",
  security: [{ Bearer: [] }],
  request: {
    body: {
      required: true,
      content: {
        "application/json": { schema: SubmitJobBodySchema },
      },
    },
  },
  responses: {
    200: {
      description: "Job created",
      content: { "application/json": { schema: JobCreatedSchema } },
    },
    400: {
      description: "Invalid request body",
      content: { "application/json": { schema: ErrorSchema } },
    },
    401: { description: "Unauthorized" },
    500: {
      description: "Internal server error",
      content: { "application/json": { schema: ErrorSchema } },
    },
  },
});

router.openapi(submitJobRoute, async (c) => {
  const existingKey = c.var.apiKey;
  const { code, language } = c.req.valid("json");

  // Update last used
  await db
    .update(apiKey)
    .set({ lastUsedAt: new Date() })
    .where(eq(apiKey.id, existingKey.id));

  try {
    const job = await codeExecutionQueue.add("execute", {
      code,
      lang: language,
      userId: existingKey.userId,
    });

    return c.json({ id: String(job.id) }, 200);
  } catch (error) {
    console.error(error);
    return c.json({ message: "Internal Server Error" }, 500);
  }
});

const getJobRoute = createRoute({
  method: "get",
  path: "/{id}",
  tags: ["Jobs"],
  summary: "Get job result",
  security: [{ Bearer: [] }],
  request: {
    params: z.object({
      id: z.string().openapi({ example: "42", description: "Job ID" }),
    }),
  },
  responses: {
    200: {
      description: "Job result",
      content: { "application/json": { schema: JobResultSchema } },
    },
    401: { description: "Unauthorized" },
    404: {
      description: "Job not found",
      content: { "application/json": { schema: ErrorSchema } },
    },
  },
});

router.openapi(getJobRoute, async (c) => {
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
