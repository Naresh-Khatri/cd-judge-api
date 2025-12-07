import { relations, sql } from "drizzle-orm";
import { index, pgTable } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import * as z from "zod";

import { user } from "./auth-schema";

export const apiKey = pgTable(
  "api_key",
  (t) => ({
    id: t.uuid().notNull().primaryKey().defaultRandom(),
    userId: t
      .text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    name: t.varchar({ length: 256 }).notNull(),
    keyHash: t.text("key_hash").notNull(),
    prefix: t.varchar({ length: 32 }).notNull(),
    status: t.text().$type<"active" | "revoked">().notNull().default("active"),
    lastUsedAt: t.timestamp("last_used_at"),
    createdAt: t.timestamp("created_at").defaultNow().notNull(),
    updatedAt: t
      .timestamp("updated_at", { mode: "date", withTimezone: true })
      .$onUpdateFn(() => sql`now()`),
  }),
  (table) => [index("api_key_user_id_idx").on(table.userId)],
);

export const apiKeyRelations = relations(apiKey, ({ one }) => ({
  user: one(user, {
    fields: [apiKey.userId],
    references: [user.id],
  }),
}));

export const CreateApiKeySchema = createInsertSchema(apiKey, {
  name: z.string().min(1).max(256),
}).omit({
  id: true,
  userId: true,
  keyHash: true,
  prefix: true,
  status: true,
  lastUsedAt: true,
  createdAt: true,
  updatedAt: true,
});
