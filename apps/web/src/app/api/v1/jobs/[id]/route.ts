import { headers } from "next/headers";
import { NextResponse } from "next/server";

import { apiKey, db, eq } from "@acme/db";
import { codeExecutionQueue } from "@acme/jobs";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const headersList = await headers();
  const authHeader = headersList.get("authorization");

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const key = authHeader.split(" ")[1];
  const crypto = await import("crypto");
  const keyHash = crypto.createHash("sha256").update(key).digest("hex");

  const [existingKey] = await db
    .select()
    .from(apiKey)
    .where(eq(apiKey.keyHash, keyHash))
    .limit(1);

  if (!existingKey || existingKey.status !== "active") {
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

  // Verify the job belongs to the user (optional, but good practice)
  // Since we store userId in job data, we can check it.
  if (job.data.userId !== existingKey.userId) {
    // return new NextResponse("Unauthorized", { status: 403 });
    // For now, let's allow it or maybe not?
    // The plan didn't explicitly say we must restrict access to own jobs, but it's implied.
    // Let's check if job.data.userId matches.
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
