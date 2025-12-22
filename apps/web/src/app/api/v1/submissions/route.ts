import crypto from "crypto";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";

import { apiKey, db, eq } from "@acme/db";
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

  // Update last used at
  await db
    .update(apiKey)
    .set({ lastUsedAt: new Date() })
    .where(eq(apiKey.id, existingKey.id));

  try {
    const body = await req.json();
    const { code, lang } = submitJobSchema.parse(body);

    const job = await codeExecutionQueue.add(QUEUE_NAMES.CODE_EXECUTION, {
      code,
      lang,
      userId: existingKey.userId,
    });

    return NextResponse.json({ id: job.id });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return new NextResponse("Invalid request body", { status: 400 });
    }
    console.error(error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
