import type { apiKey } from "@acme/db";

export type ApiKeyRow = typeof apiKey.$inferSelect;

export type GetSessionFn = (
  headers: Headers,
) => Promise<{ user: { id: string } } | null>;

export interface AppEnv {
  Variables: {
    apiKey: ApiKeyRow;
  };
}
