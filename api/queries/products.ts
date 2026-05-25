import { getDb } from "./connection";
import { products } from "@db/schema";
import { eq, desc, and, isNull } from "drizzle-orm";
import type { Product, InsertProduct } from "@db/schema";

export async function findAllProducts(): Promise<Product[]> {
  return getDb().query.products.findMany({
    orderBy: [desc(products.createdAt)],
  });
}

export async function findProductById(id: number): Promise<Product | undefined> {
  return getDb().query.products.findFirst({
    where: eq(products.id, id),
  });
}

export async function findProductByProductId(productId: string): Promise<Product | undefined> {
  return getDb().query.products.findFirst({
    where: eq(products.productId, productId),
  });
}

export async function findProductsByStatus(status: Product["status"]): Promise<Product[]> {
  return getDb().query.products.findMany({
    where: eq(products.status, status),
    orderBy: [desc(products.createdAt)],
  });
}

export async function findProductsBySource(source: Product["source"]): Promise<Product[]> {
  return getDb().query.products.findMany({
    where: eq(products.source, source),
    orderBy: [desc(products.createdAt)],
  });
}

export async function findUnpostedProducts(): Promise<Product[]> {
  return getDb().query.products.findMany({
    where: and(
      eq(products.status, "new"),
      isNull(products.referralUrl)
    ),
    orderBy: [desc(products.trendingRank)],
    limit: 10,
  });
}

export async function createProduct(data: InsertProduct): Promise<Product> {
  const db = getDb();
  const [result] = await db.insert(products).values(data).$returningId();
  const product = await db.query.products.findFirst({
    where: eq(products.id, result.id),
  });
  if (!product) throw new Error("Failed to create product");
  return product;
}

export async function createProductsBulk(data: InsertProduct[]): Promise<void> {
  if (data.length === 0) return;
  const db = getDb();
  const batchSize = 50;
  for (let i = 0; i < data.length; i += batchSize) {
    const batch = data.slice(i, i + batchSize);
    const first = batch[0];
    await db.insert(products).values(batch).onDuplicateKeyUpdate({
      set: {
        title: first?.title,
        price: first?.price,
        originalPrice: first?.originalPrice,
        imageUrl: first?.imageUrl,
        rating: first?.rating,
        ordersCount: first?.ordersCount,
        reviewsCount: first?.reviewsCount,
        isTrending: first?.isTrending,
        updatedAt: new Date(),
      },
    });
  }
}

export async function updateProduct(id: number, data: Partial<InsertProduct>): Promise<void> {
  await getDb()
    .update(products)
    .set(data)
    .where(eq(products.id, id));
}

export async function updateProductStatus(
  id: number,
  status: Product["status"]
): Promise<void> {
  await getDb()
    .update(products)
    .set({ status, updatedAt: new Date() })
    .where(eq(products.id, id));
}

export async function deleteProduct(id: number): Promise<void> {
  await getDb().delete(products).where(eq(products.id, id));
}

export async function getProductsStats(): Promise<{
  total: number;
  new: number;
  posted: number;
  processed: number;
  skipped: number;
  error: number;
  aliexpress: number;
  amazon: number;
}> {
  const db = getDb();
  const allProducts = await db.select().from(products);

  return {
    total: allProducts.length,
    new: allProducts.filter((p) => p.status === "new").length,
    posted: allProducts.filter((p) => p.status === "posted").length,
    processed: allProducts.filter((p) => p.status === "processed").length,
    skipped: allProducts.filter((p) => p.status === "skipped").length,
    error: allProducts.filter((p) => p.status === "error").length,
    aliexpress: allProducts.filter((p) => p.source === "aliexpress").length,
    amazon: allProducts.filter((p) => p.source === "amazon").length,
  };
}
