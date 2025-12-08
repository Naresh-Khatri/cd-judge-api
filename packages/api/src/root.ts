import { apiKeyRouter } from "./router/api-key";
import { authRouter } from "./router/auth";
import { postRouter } from "./router/post";
import { userRouter } from "./router/user";
import { createTRPCRouter } from "./trpc";

export const appRouter = createTRPCRouter({
  auth: authRouter,
  post: postRouter,
  apiKey: apiKeyRouter,
  user: userRouter,
});

// export type definition of API
export type AppRouter = typeof appRouter;
