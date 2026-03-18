import { apiKeyRouter } from "./routers/api-key";
import { authRouter } from "./routers/auth";
import { postRouter } from "./routers/post";
import { userRouter } from "./routers/user";
import { createTRPCRouter } from "./trpc";

export const appRouter = createTRPCRouter({
  auth: authRouter,
  post: postRouter,
  apiKey: apiKeyRouter,
  user: userRouter,
});

export type AppRouter = typeof appRouter;
