import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");

  if (!code || !state) {
    return new NextResponse("Missing code or state", { status: 400 });
  }

  // The state is in the format: {originalState}__{baseUrl}
  const [originalState, targetBaseUrl] = state.split("__");

  if (!targetBaseUrl) {
    return new NextResponse("Invalid state format: missing target base URL", {
      status: 400,
    });
  }

  // Ensure targetBaseUrl is safe (optional: check against a whitelist)
  try {
    const targetUrl = new URL(targetBaseUrl);
    targetUrl.pathname = "/api/auth/callback/github";
    targetUrl.searchParams.set("code", code);
    targetUrl.searchParams.set("state", originalState!);

    return NextResponse.redirect(targetUrl.toString());
  } catch (e) {
    return new NextResponse("Invalid target base URL in state", {
      status: 400,
    });
  }
}
