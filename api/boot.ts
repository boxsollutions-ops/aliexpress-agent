import { Hono } from "hono";
import { bodyLimit } from "hono/body-limit";
import type { HttpBindings } from "@hono/node-server";
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { appRouter } from "./router";
import { createContext } from "./context";
import { env } from "./lib/env";
import { createOAuthCallbackHandler } from "./kimi/auth";
import { Paths } from "@contracts/constants";
import { initializeDefaultSettings } from "./queries/settings";
import { startScheduler } from "./services/agent";

const app = new Hono<{ Bindings: HttpBindings }>();

let settingsInitialized = false;

app.use(bodyLimit({ maxSize: 50 * 1024 * 1024 }));

// Lazy initialize settings on first request
app.use("/api/*", async (c, next) => {
  if (!settingsInitialized) {
    settingsInitialized = true;
    initializeDefaultSettings().catch((err) => {
      console.warn("[Boot] Settings init warning:", err.message);
    });
  }
  await next();
});

app.get(Paths.oauthCallback, createOAuthCallbackHandler());
app.use("/api/trpc/*", async (c) => {
  return fetchRequestHandler({
    endpoint: "/api/trpc",
    req: c.req.raw,
    router: appRouter,
    createContext,
  });
});
app.all("/api/*", (c) => c.json({ error: "Not Found" }, 404));

export default app;

if (env.isProduction) {
  const { serve } = await import("@hono/node-server");
  const { serveStaticFiles } = await import("./lib/vite");
  serveStaticFiles(app);

  const port = parseInt(process.env.PORT || "3000");
  serve({ fetch: app.fetch, port }, () => {
    console.log(`Server running on http://localhost:${port}/`);
    // Start background scheduler in production
    startScheduler().catch((err) => {
      console.warn("[Boot] Scheduler start warning:", err.message);
    });
  });
}
