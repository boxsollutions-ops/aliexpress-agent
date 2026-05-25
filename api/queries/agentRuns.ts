import { getDb } from "./connection";
import { agentRuns } from "@db/schema";
import { eq, desc } from "drizzle-orm";
import type { AgentRun, InsertAgentRun } from "@db/schema";

export async function findAllAgentRuns(limit = 50): Promise<AgentRun[]> {
  return getDb().query.agentRuns.findMany({
    orderBy: [desc(agentRuns.startedAt)],
    limit,
  });
}

export async function findAgentRunById(id: number): Promise<AgentRun | undefined> {
  return getDb().query.agentRuns.findFirst({
    where: eq(agentRuns.id, id),
  });
}

export async function findLatestAgentRun(): Promise<AgentRun | undefined> {
  return getDb().query.agentRuns.findFirst({
    orderBy: [desc(agentRuns.startedAt)],
  });
}

export async function findRunningAgentRun(): Promise<AgentRun | undefined> {
  return getDb().query.agentRuns.findFirst({
    where: eq(agentRuns.status, "running"),
    orderBy: [desc(agentRuns.startedAt)],
  });
}

export async function createAgentRun(data: Partial<InsertAgentRun> = {}): Promise<AgentRun> {
  const db = getDb();
  const [result] = await db
    .insert(agentRuns)
    .values({
      status: "running",
      triggeredBy: data.triggeredBy ?? "scheduler",
      ...data,
    } as InsertAgentRun)
    .$returningId();

  const run = await db.query.agentRuns.findFirst({
    where: eq(agentRuns.id, result.id),
  });
  if (!run) throw new Error("Failed to create agent run");
  return run;
}

export async function updateAgentRun(
  id: number,
  data: Partial<InsertAgentRun>
): Promise<void> {
  await getDb()
    .update(agentRuns)
    .set(data)
    .where(eq(agentRuns.id, id));
}

export async function completeAgentRun(
  id: number,
  data: {
    status: "completed" | "failed" | "stopped";
    productsFound?: number;
    productsPosted?: number;
    errorsCount?: number;
    errorLog?: string;
  }
): Promise<void> {
  await getDb()
    .update(agentRuns)
    .set({
      ...data,
      completedAt: new Date(),
    })
    .where(eq(agentRuns.id, id));
}

export async function getAgentRunsStats(): Promise<{
  totalRuns: number;
  successfulRuns: number;
  failedRuns: number;
  totalProductsFound: number;
  totalProductsPosted: number;
  totalErrors: number;
}> {
  const db = getDb();
  const allRuns = await db.select().from(agentRuns);

  return {
    totalRuns: allRuns.length,
    successfulRuns: allRuns.filter((r) => r.status === "completed").length,
    failedRuns: allRuns.filter((r) => r.status === "failed").length,
    totalProductsFound: allRuns.reduce((sum, r) => sum + (r.productsFound ?? 0), 0),
    totalProductsPosted: allRuns.reduce((sum, r) => sum + (r.productsPosted ?? 0), 0),
    totalErrors: allRuns.reduce((sum, r) => sum + (r.errorsCount ?? 0), 0),
  };
}
