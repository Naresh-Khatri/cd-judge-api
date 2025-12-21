import { headers } from "next/headers";
import { NextResponse } from "next/server";

import { apiKey, db, eq } from "@acme/db";
import { codeExecutionQueue } from "@acme/jobs";

import { auth } from "~/auth/server";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const headersList = await headers();
  const authHeader = headersList.get("authorization");

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const token = authHeader.split(" ")[1];
  if (!token) return new NextResponse("Unauthorized", { status: 401 });

  const crypto = await import("crypto");
  let existingKey: typeof apiKey.$inferSelect | undefined;

  // 1. Try standard API Key Hash check
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
    // 2. Playground Bypass
    const session = await auth.api.getSession({ headers: headersList });
    if (session?.user) {
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

  const { id } = await params;
  const job = await codeExecutionQueue.getJob(id);

  if (!job) {
    return new NextResponse("Job not found", { status: 404 });
  }

  const state = await job.getState();
  const result = job.returnvalue;

  return NextResponse.json({
    id: job.id,
    status: state,
    result,
    submittedAt: job.timestamp,
    processedAt: job.processedOn,
    finishedAt: job.finishedOn,
  });
}
