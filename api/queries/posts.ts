import { getDb } from "./connection";
import { posts } from "@db/schema";
import { eq, desc } from "drizzle-orm";
import type { Post, InsertPost } from "@db/schema";

export async function findAllPosts(): Promise<Post[]> {
  return getDb().query.posts.findMany({
    orderBy: [desc(posts.createdAt)],
    with: {
      product: true,
    },
  });
}

export async function findPostById(id: number): Promise<Post | undefined> {
  return getDb().query.posts.findFirst({
    where: eq(posts.id, id),
    with: {
      product: true,
    },
  });
}

export async function findPostsByPlatform(platform: Post["platform"]): Promise<Post[]> {
  return getDb().query.posts.findMany({
    where: eq(posts.platform, platform),
    orderBy: [desc(posts.createdAt)],
    with: {
      product: true,
    },
  });
}

export async function findPostsByStatus(status: Post["status"]): Promise<Post[]> {
  return getDb().query.posts.findMany({
    where: eq(posts.status, status),
    orderBy: [desc(posts.createdAt)],
    with: {
      product: true,
    },
  });
}

export async function findPostsByProduct(productId: number): Promise<Post[]> {
  return getDb().query.posts.findMany({
    where: eq(posts.productId, productId),
    orderBy: [desc(posts.createdAt)],
  });
}

export async function createPost(data: InsertPost): Promise<Post> {
  const db = getDb();
  const [result] = await db.insert(posts).values(data).$returningId();
  const post = await db.query.posts.findFirst({
    where: eq(posts.id, result.id),
    with: {
      product: true,
    },
  });
  if (!post) throw new Error("Failed to create post");
  return post;
}

export async function updatePost(id: number, data: Partial<InsertPost>): Promise<void> {
  await getDb()
    .update(posts)
    .set(data)
    .where(eq(posts.id, id));
}

export async function updatePostStatus(
  id: number,
  status: Post["status"],
  extra?: { platformPostId?: string; postUrl?: string; errorMessage?: string }
): Promise<void> {
  const update: Partial<InsertPost> = { status };
  if (status === "published") {
    update.publishedAt = new Date();
  }
  if (extra?.platformPostId) update.platformPostId = extra.platformPostId;
  if (extra?.postUrl) update.postUrl = extra.postUrl;
  if (extra?.errorMessage) update.errorMessage = extra.errorMessage;

  await getDb()
    .update(posts)
    .set(update)
    .where(eq(posts.id, id));
}

export async function deletePost(id: number): Promise<void> {
  await getDb().delete(posts).where(eq(posts.id, id));
}

export async function getPostsStats(): Promise<{
  total: number;
  pending: number;
  published: number;
  failed: number;
  scheduled: number;
}> {
  const db = getDb();
  const allPosts = await db.select().from(posts);

  return {
    total: allPosts.length,
    pending: allPosts.filter((p) => p.status === "pending").length,
    published: allPosts.filter((p) => p.status === "published").length,
    failed: allPosts.filter((p) => p.status === "failed").length,
    scheduled: allPosts.filter((p) => p.status === "scheduled").length,
  };
}

export async function getPostsStatsByPlatform(): Promise<
  { platform: string; total: number; published: number; failed: number }[]
> {
  const db = getDb();
  const allPosts = await db.select().from(posts);

  const platforms = ["pinterest", "linkedin", "telegram"] as const;
  return platforms.map((platform) => ({
    platform,
    total: allPosts.filter((p) => p.platform === platform).length,
    published: allPosts.filter((p) => p.platform === platform && p.status === "published").length,
    failed: allPosts.filter((p) => p.platform === platform && p.status === "failed").length,
  }));
}
