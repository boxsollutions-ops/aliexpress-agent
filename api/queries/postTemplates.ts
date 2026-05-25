import { getDb } from "./connection";
import { postTemplates } from "@db/schema";
import { eq, and } from "drizzle-orm";
import type { PostTemplate, InsertPostTemplate } from "@db/schema";

export async function findAllTemplates(): Promise<PostTemplate[]> {
  return getDb().query.postTemplates.findMany({
    orderBy: [postTemplates.createdAt],
  });
}

export async function findTemplatesByPlatform(
  platform: PostTemplate["platform"]
): Promise<PostTemplate[]> {
  return getDb().query.postTemplates.findMany({
    where: and(
      eq(postTemplates.platform, platform),
      eq(postTemplates.isActive, true)
    ),
  });
}

export async function findTemplateById(id: number): Promise<PostTemplate | undefined> {
  return getDb().query.postTemplates.findFirst({
    where: eq(postTemplates.id, id),
  });
}

export async function createTemplate(data: InsertPostTemplate): Promise<PostTemplate> {
  const db = getDb();
  const [result] = await db.insert(postTemplates).values(data).$returningId();
  const template = await db.query.postTemplates.findFirst({
    where: eq(postTemplates.id, result.id),
  });
  if (!template) throw new Error("Failed to create template");
  return template;
}

export async function updateTemplate(
  id: number,
  data: Partial<InsertPostTemplate>
): Promise<void> {
  await getDb()
    .update(postTemplates)
    .set(data)
    .where(eq(postTemplates.id, id));
}

export async function deleteTemplate(id: number): Promise<void> {
  await getDb().delete(postTemplates).where(eq(postTemplates.id, id));
}
