import { OpenAPIHono } from "@hono/zod-openapi";
import { logger } from "hono/logger";

import { createAuthMiddleware } from "./middleware/auth";
import { rateLimitMiddleware } from "./middleware/rate-limit";
import healthRouter from "./routes/health";
import jobsRouter from "./routes/jobs";
import submissionsRouter from "./routes/submissions";
import type { AppEnv, GetSessionFn } from "./types";

export type { AppEnv, GetSessionFn } from "./types";

export function createApp(getSession: GetSessionFn) {
  const app = new OpenAPIHono<AppEnv>().basePath("/api");

  app.use("*", logger());

  // Auth middleware for all /v1 routes
  app.use("/v1/*", createAuthMiddleware(getSession));

  // Rate limiting for submission endpoints (applied after auth so userId is available)
  app.use("/v1/submissions", rateLimitMiddleware);
  app.use("/v1/jobs", rateLimitMiddleware);

  // Routes
  app.route("/health", healthRouter);
  app.route("/v1/submissions", submissionsRouter);
  app.route("/v1/jobs", jobsRouter);

  // OpenAPI spec
  app.doc("/openapi.json", {
    openapi: "3.0.0",
    info: {
      title: "CD Judge API",
      version: "1.0.0",
      description:
        "Secure multi-language code execution engine. Submit code via the `/v1/submissions` or `/v1/jobs` endpoints and poll for results. All `/v1` routes require a Bearer token (API key or playground session).",
    },
    servers: [{ url: "/api" }],
    security: [{ Bearer: [] }],
  });

  // Register Bearer auth security scheme
  app.openAPIRegistry.registerComponent("securitySchemes", "Bearer", {
    type: "http",
    scheme: "bearer",
    description:
      "API key (sk_live_...) or playground session key ID (UUID). Pass as: Authorization: Bearer <token>",
  });

  // Scalar API reference UI
  app.get("/docs", (c) => {
    return c.html(`<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>CD Judge API Docs</title>
  </head>
  <body>
    <script
      id="api-reference"
      data-url="/api/openapi.json"
      data-configuration='${JSON.stringify({
        theme: "saturn",
        layout: "modern",
        darkMode: true,
        defaultHttpClient: {
          targetKey: "js",
          clientKey: "fetch",
        },
      })}'
    ></script>
    <script src="https://cdn.jsdelivr.net/npm/@scalar/api-reference"></script>
  </body>
</html>`);
  });

  return app;
}
