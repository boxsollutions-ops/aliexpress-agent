import { z } from "zod";
import { createRouter, publicQuery } from "./middleware";
import {
  startAgent,
  stopAgent,
  runOnce,
  isAgentRunning,
} from "./services/agent";
import {
  findAllAgentRuns,
  findLatestAgentRun,
  findRunningAgentRun,
  getAgentRunsStats,
} from "./queries/agentRuns";

export const agentRouter = createRouter({
  // Agent control
  start: publicQuery.mutation(async () => {
    return startAgent();
  }),

  stop: publicQuery.mutation(async () => {
    return stopAgent();
  }),

  runOnce: publicQuery.mutation(async () => {
    return runOnce();
  }),

  status: publicQuery.query(async () => {
    const running = isAgentRunning();
    const latestRun = await findLatestAgentRun();
    const currentRun = await findRunningAgentRun();

    return {
      isRunning: running,
      hasActiveRun: !!currentRun,
      currentRunId: currentRun?.id ?? null,
      latestRun: latestRun
        ? {
            id: latestRun.id,
            status: latestRun.status,
            startedAt: latestRun.startedAt,
            completedAt: latestRun.completedAt,
            productsFound: latestRun.productsFound,
            productsPosted: latestRun.productsPosted,
            errorsCount: latestRun.errorsCount,
            triggeredBy: latestRun.triggeredBy,
          }
        : null,
    };
  }),

  // Agent runs history
  runs: publicQuery
    .input(
      z
        .object({
          limit: z.number().min(1).max(100).optional(),
        })
        .optional()
    )
    .query(async ({ input }) => {
      return findAllAgentRuns(input?.limit ?? 50);
    }),

  latestRun: publicQuery.query(async () => {
    return findLatestAgentRun();
  }),

  // Stats
  stats: publicQuery.query(async () => {
    return getAgentRunsStats();
  }),
});
