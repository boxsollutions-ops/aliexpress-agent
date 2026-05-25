import { z } from "zod";
import { createRouter, publicQuery } from "./middleware";
import {
  findAllPosts,
  findPostById,
  findPostsByPlatform,
  findPostsByStatus,
  findPostsByProduct,
  updatePost,
  deletePost,
  getPostsStats,
  getPostsStatsByPlatform,
} from "./queries/posts";

export const postRouter = createRouter({
  list: publicQuery.query(async () => {
    return findAllPosts();
  }),

  byId: publicQuery
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      return findPostById(input.id);
    }),

  byPlatform: publicQuery
    .input(
      z.object({
        platform: z.enum(["pinterest", "linkedin", "telegram"]),
      })
    )
    .query(async ({ input }) => {
      return findPostsByPlatform(input.platform);
    }),

  byStatus: publicQuery
    .input(
      z.object({
        status: z.enum(["pending", "published", "failed", "scheduled"]),
      })
    )
    .query(async ({ input }) => {
      return findPostsByStatus(input.status);
    }),

  byProduct: publicQuery
    .input(z.object({ productId: z.number() }))
    .query(async ({ input }) => {
      return findPostsByProduct(input.productId);
    }),

  stats: publicQuery.query(async () => {
    return getPostsStats();
  }),

  statsByPlatform: publicQuery.query(async () => {
    return getPostsStatsByPlatform();
  }),

  update: publicQuery
    .input(
      z.object({
        id: z.number(),
        data: z.object({
          status: z.enum(["pending", "published", "failed", "scheduled"]).optional(),
          platformPostId: z.string().optional(),
          postUrl: z.string().optional(),
          errorMessage: z.string().nullable().optional(),
        }),
      })
    )
    .mutation(async ({ input }) => {
      await updatePost(input.id, input.data);
      return { success: true };
    }),

  delete: publicQuery
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await deletePost(input.id);
      return { success: true };
    }),
});
