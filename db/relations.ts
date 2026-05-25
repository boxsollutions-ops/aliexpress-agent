import { relations } from "drizzle-orm";
import { products, posts } from "./schema";

export const productsRelations = relations(products, ({ many }) => ({
  posts: many(posts),
}));

export const postsRelations = relations(posts, ({ one }) => ({
  product: one(products, {
    fields: [posts.productId],
    references: [products.id],
  }),
}));
