import crypto from "crypto";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";

import { apiKey, apiKeyUsage, db, eq, sql } from "@acme/db";
import { codeExecutionQueue, QUEUE_NAMES } from "@acme/jobs";

import { auth } from "~/auth/server";

const submitJobSchema = z.object({
  code: z.string(),
  lang: z.string(),
});

export async function POST(req: Request) {
  const headersList = await headers();
  const authHeader = headersList.get("authorization");

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const token = authHeader.split(" ")[1];
  if (!token) return new NextResponse("Unauthorized", { status: 401 });

  let existingKey: typeof apiKey.$inferSelect | undefined;

  // 1. Try standard API Key Hash check (Public API usage)
  const keyHash = crypto
    .createHash("sha256")
    .update(token || "")
    .digest("hex");

  const [keyByHash] = await db
    .select()
    .from(apiKey)
    .where(eq(apiKey.keyHash, keyHash))
    .limit(1);

  if (keyByHash && keyByHash.status === "active") {
    existingKey = keyByHash;
  } else {
    // 2. Playground Bypass: Check Session + Key ID (Internal Playground usage)
    // If the token is a UUID (key ID) and we have a valid user session owning it.
    const session = await auth.api.getSession({ headers: headersList });
    if (session?.user) {
      // Check if token is a valid UUID to prevent unnecessary DB calls if it's clearly a secret
      const isUuid =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
          token,
        );
      if (isUuid) {
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
  }

  if (!existingKey) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    const body = await req.json();
    const { code, lang } = submitJobSchema.parse(body);

    const job = await codeExecutionQueue.add(QUEUE_NAMES.CODE_EXECUTION, {
      code,
      lang,
      userId: existingKey.userId,
    });

    // Success Update
    const today = new Date().toISOString().split("T")[0]!;
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

    return NextResponse.json({ id: job.id });
  } catch (error) {
    // Attempt to get lang from body if possible for failure tracking
    let failedLang = "unknown";
    try {
      const body = await req.clone().json();
      failedLang = body.lang || "unknown";
    } catch {
      // ignore
    }

    // Failure Update
    const today = new Date().toISOString().split("T")[0]!;
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

    if (error instanceof z.ZodError) {
      return new NextResponse("Invalid request body", { status: 400 });
    }
    console.error(error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
