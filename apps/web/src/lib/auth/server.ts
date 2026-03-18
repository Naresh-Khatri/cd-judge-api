import "server-only";

import { cache } from "react";
import { headers } from "next/headers";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";

import { db } from "@acme/db/client";

import { env } from "~/env";

export const auth = betterAuth({
  database: drizzleAdapter(db, { provider: "pg" }),
  baseURL: env.BASE_URL,
  secret: env.BETTER_AUTH_SECRET,
  plugins: [nextCookies()],
  socialProviders: {
    google: {
      clientId: env.BETTER_AUTH_GOOGLE_ID,
      clientSecret: env.BETTER_AUTH_GOOGLE_SECRET,
    },
  },
});

export type Auth = typeof auth;
export type Session = Auth["$Infer"]["Session"];

export const getSession = cache(async () =>
  auth.api.getSession({ headers: await headers() }),
);
