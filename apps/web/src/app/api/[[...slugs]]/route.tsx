import { createApp } from "@acme/hono-api";

import { auth } from "~/lib/auth/server";

const app = createApp((headers) => auth.api.getSession({ headers }));

const handler = (req: Request) => app.fetch(req);

export const GET = handler;
export const POST = handler;
export const PUT = handler;
export const DELETE = handler;
export const PATCH = handler;
