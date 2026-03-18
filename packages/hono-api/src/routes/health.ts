import { OpenAPIHono, createRoute, z } from "@hono/zod-openapi";

const router = new OpenAPIHono();

const healthRoute = createRoute({
  method: "get",
  path: "/",
  tags: ["Health"],
  summary: "Health check",
  responses: {
    200: {
      description: "Service is healthy",
      content: {
        "application/json": {
          schema: z.object({
            status: z.string().openapi({ example: "ok" }),
            timestamp: z.number().openapi({ example: 1710000000000 }),
          }),
        },
      },
    },
  },
});

router.openapi(healthRoute, (c) => {
  return c.json({ status: "ok" as const, timestamp: Date.now() }, 200);
});

export default router;
