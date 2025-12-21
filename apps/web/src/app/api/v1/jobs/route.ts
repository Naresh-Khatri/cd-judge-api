import crypto from "crypto";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";

import { apiKey, db, eq } from "@acme/db";
import { codeExecutionQueue } from "@acme/jobs";

const submitJobSchema = z.object({
  code: z.string(),
  language: z.string(),
});

export async function POST(req: Request) {
  const headersList = await headers();
  const authHeader = headersList.get("authorization");

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const key = authHeader.split(" ")[1];

  // In a real app, we should hash the key and compare with the stored hash
  // But for now, we'll assume the key is stored as is or we need to hash it here
  // Based on api-key.ts, we store keyHash.
  // We need to import crypto to hash the incoming key.
  // Wait, api-key.ts uses crypto. Let's check if we can use it here.
  // Yes, we can use 'crypto' in Next.js Edge/Node runtime.

  const keyHash = crypto
    .createHash("sha256")
    .update(key || "")
    .digest("hex");

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

  try {
    const body = await req.json();
    const { code, language } = submitJobSchema.parse(body);

    const job = await codeExecutionQueue.add("execute", {
      code,
      language,
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
