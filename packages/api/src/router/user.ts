import type { TRPCRouterRecord } from "@trpc/server";
import { z } from "zod/v4";

import { eq, user } from "@acme/db";

import { protectedProcedure } from "../trpc";

export const userRouter = {
  getProfile: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.session.user.id;
    const profile = await ctx.db.query.user.findFirst({
      where: eq(user.id, userId),
    });
    return profile;
  }),

  updateProfile: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1),
        email: z.string().email(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      // Note: Changing email might require re-verification depending on auth setup
      // For now we just update it in the database
      const [updated] = await ctx.db
        .update(user)
        .set({
          name: input.name,
          email: input.email,
        })
        .where(eq(user.id, userId))
        .returning();

      return updated;
    }),

  updatePreferences: protectedProcedure
    .input(
      z.object({
        emailNotifications: z.boolean(),
        webhookUrl: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      const [updated] = await ctx.db
        .update(user)
        .set({
          emailNotifications: input.emailNotifications,
          webhookUrl: input.webhookUrl || null,
        })
        .where(eq(user.id, userId))
        .returning();

      return updated;
    }),

  getSessions: protectedProcedure.query(async ({ ctx }) => {
    // Using Better Auth API to list sessions
    const sessions = await ctx.authApi.listSessions({
      headers: new Headers(), // Empty headers as we're calling from server
    });
    return sessions;
  }),

  revokeSession: protectedProcedure
    .input(z.object({ token: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.authApi.revokeSession({
        headers: new Headers(),
        body: {
          token: input.token,
        },
      });
      return { success: true };
    }),

  revokeAllSessions: protectedProcedure.mutation(async ({ ctx }) => {
    const sessions = await ctx.authApi.listSessions({
      headers: new Headers(),
    });

    const currentToken = ctx.session.session.token;

    // Revoke all sessions except the current one
    const promises = sessions
      .filter((s) => s.token !== currentToken)
      .map((s) =>
        ctx.authApi.revokeSession({
          headers: new Headers(),
          body: {
            token: s.token,
          },
        }),
      );

    await Promise.all(promises);
    return { success: true };
  }),

  deleteAccount: protectedProcedure.mutation(async ({ ctx }) => {
    const userId = ctx.session.user.id;

    // Delete user from database - cascade will handle related data
    await ctx.db.delete(user).where(eq(user.id, userId));

    return { success: true };
  }),
} satisfies TRPCRouterRecord;
