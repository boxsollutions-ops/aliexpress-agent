import { z } from "zod";
import { createRouter, publicQuery } from "./middleware";
import {
  findAllProducts,
  findProductById,
  findProductsByStatus,
  findProductsBySource,
  updateProduct,
  updateProductStatus,
  deleteProduct,
  getProductsStats,
} from "./queries/products";

export const productRouter = createRouter({
  list: publicQuery.query(async () => {
    return findAllProducts();
  }),

  byId: publicQuery
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      return findProductById(input.id);
    }),

  byStatus: publicQuery
    .input(z.object({ status: z.enum(["new", "processed", "posted", "skipped", "error"]) }))
    .query(async ({ input }) => {
      return findProductsByStatus(input.status);
    }),

  bySource: publicQuery
    .input(z.object({ source: z.enum(["aliexpress", "amazon"]) }))
    .query(async ({ input }) => {
      return findProductsBySource(input.source);
    }),

  stats: publicQuery.query(async () => {
    return getProductsStats();
  }),

  update: publicQuery
    .input(
      z.object({
        id: z.number(),
        data: z.object({
          title: z.string().optional(),
          description: z.string().optional(),
          price: z.string().optional(),
          originalPrice: z.string().nullable().optional(),
          imageUrl: z.string().optional(),
          referralUrl: z.string().nullable().optional(),
          status: z.enum(["new", "processed", "posted", "skipped", "error"]).optional(),
        }),
      })
    )
    .mutation(async ({ input }) => {
      await updateProduct(input.id, input.data);
      return { success: true };
    }),

  updateStatus: publicQuery
    .input(
      z.object({
        id: z.number(),
        status: z.enum(["new", "processed", "posted", "skipped", "error"]),
      })
    )
    .mutation(async ({ input }) => {
      await updateProductStatus(input.id, input.status);
      return { success: true };
    }),

  delete: publicQuery
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await deleteProduct(input.id);
      return { success: true };
    }),
});
