import { authRouter } from "./auth-router";
import { productRouter } from "./productRouter";
import { postRouter } from "./postRouter";
import { settingsRouter } from "./settingsRouter";
import { agentRouter } from "./agentRouter";
import { templateRouter } from "./templateRouter";
import { createRouter, publicQuery } from "./middleware";
import { initializeDefaultSettings } from "./queries/settings";

// Initialize default settings on first load
initializeDefaultSettings().catch(() => {
  // Will be initialized on first API call
});

export const appRouter = createRouter({
  ping: publicQuery.query(() => ({ ok: true, ts: Date.now() })),
  auth: authRouter,
  product: productRouter,
  post: postRouter,
  settings: settingsRouter,
  agent: agentRouter,
  template: templateRouter,
});

export type AppRouter = typeof appRouter;
