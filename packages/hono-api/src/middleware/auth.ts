import crypto from "crypto";
import type { Context, Next } from "hono";

import { apiKey, db, eq } from "@acme/db";

import type { AppEnv, GetSessionFn } from "../types";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function createAuthMiddleware(getSession: GetSessionFn) {
  return async (c: Context<AppEnv>, next: Next) => {
    const authHeader = c.req.header("authorization");

    if (!authHeader?.startsWith("Bearer ")) {
      return c.text("Unauthorized", 401);
    }

    const token = authHeader.split(" ")[1];
    if (!token) return c.text("Unauthorized", 401);

    let existingKey: typeof apiKey.$inferSelect | undefined;

    // 1. Standard API key hash check
    const keyHash = crypto
      .createHash("sha256")
      .update(token)
      .digest("hex");

    const [keyByHash] = await db
      .select()
      .from(apiKey)
      .where(eq(apiKey.keyHash, keyHash))
      .limit(1);

    if (keyByHash?.status === "active") {
      existingKey = keyByHash;
    } else {
      // 2. Playground bypass: session + UUID key ID
      const session = await getSession(c.req.raw.headers);
      if (session?.user && UUID_RE.test(token)) {
        const [keyById] = await db
          .select()
          .from(apiKey)
          .where(eq(apiKey.id, token))
          .limit(1);

        if (
          keyById &&
          keyById.userId === session.user.id &&
          keyById.status === "active"
        ) {
          existingKey = keyById;
        }
      }
    }

    if (!existingKey) {
      return c.text("Unauthorized", 401);
    }

    c.set("apiKey", existingKey);
    await next();
  };
}
