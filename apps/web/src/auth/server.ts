import "server-only";

import { cache } from "react";
import { headers } from "next/headers";
import { nextCookies } from "better-auth/next-js";

import { initAuth } from "@acme/auth";

import { env } from "~/env";

const baseUrl = env.BASE_URL;

export const auth = initAuth({
  baseUrl,
  productionUrl: env.PRODUCTION_URL,
  secret: env.BETTER_AUTH_SECRET,
  githubClientId: env.BETTER_AUTH_GITHUB_ID,
  githubClientSecret: env.BETTER_AUTH_GITHUB_SECRET,
  extraPlugins: [nextCookies()],
});

export const getSession = cache(async () =>
  auth.api.getSession({ headers: await headers() }),
);
