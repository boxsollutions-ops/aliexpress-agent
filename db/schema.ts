import {
  mysqlTable,
  mysqlEnum,
  serial,
  varchar,
  text,
  timestamp,
  bigint,
  decimal,
  boolean,
  json,
  int,
} from "drizzle-orm/mysql-core";

// ─── Users (auth) ───────────────────────────────────────────
export const users = mysqlTable("users", {
  id: serial("id").primaryKey(),
  unionId: varchar("unionId", { length: 255 }).notNull().unique(),
  name: varchar("name", { length: 255 }),
  email: varchar("email", { length: 320 }),
  avatar: text("avatar"),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt")
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
  lastSignInAt: timestamp("lastSignInAt").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// ─── Products (AliExpress / Amazon items) ───────────────────
export const products = mysqlTable("products", {
  id: serial("id").primaryKey(),
  source: mysqlEnum("source", ["aliexpress", "amazon"]).default("aliexpress").notNull(),
  productId: varchar("productId", { length: 100 }).notNull(),
  title: varchar("title", { length: 500 }).notNull(),
  description: text("description"),
  price: decimal("price", { precision: 10, scale: 2 }),
  originalPrice: decimal("originalPrice", { precision: 10, scale: 2 }),
  currency: varchar("currency", { length: 10 }).default("USD"),
  imageUrl: text("imageUrl"),
  additionalImages: json("additionalImages").$type<string[]>(),
  productUrl: text("productUrl").notNull(),
  referralUrl: text("referralUrl"),
  category: varchar("category", { length: 200 }),
  rating: decimal("rating", { precision: 3, scale: 2 }),
  reviewsCount: int("reviewsCount"),
  ordersCount: int("ordersCount"),
  storeName: varchar("storeName", { length: 255 }),
  isTrending: boolean("isTrending").default(false),
  trendingRank: int("trendingRank"),
  status: mysqlEnum("status", ["new", "processed", "posted", "skipped", "error"])
    .default("new")
    .notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt")
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
});

export type Product = typeof products.$inferSelect;
export type InsertProduct = typeof products.$inferInsert;

// ─── Posts (published to social networks) ───────────────────
export const posts = mysqlTable("posts", {
  id: serial("id").primaryKey(),
  productId: bigint("productId", { mode: "number", unsigned: true }).notNull(),
  platform: mysqlEnum("platform", ["pinterest", "linkedin", "telegram"]).notNull(),
  platformPostId: varchar("platformPostId", { length: 255 }),
  postUrl: text("postUrl"),
  status: mysqlEnum("status", ["pending", "published", "failed", "scheduled"])
    .default("pending")
    .notNull(),
  errorMessage: text("errorMessage"),
  scheduledAt: timestamp("scheduledAt"),
  publishedAt: timestamp("publishedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Post = typeof posts.$inferSelect;
export type InsertPost = typeof posts.$inferInsert;

// ─── Settings (agent configuration) ─────────────────────────
export const settings = mysqlTable("settings", {
  id: serial("id").primaryKey(),
  key: varchar("key", { length: 100 }).notNull().unique(),
  value: text("value"),
  description: varchar("description", { length: 500 }),
  isEncrypted: boolean("isEncrypted").default(false),
  updatedAt: timestamp("updatedAt")
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
});

export type Setting = typeof settings.$inferSelect;
export type InsertSetting = typeof settings.$inferInsert;

// ─── Agent Runs (scheduler tracking) ────────────────────────
export const agentRuns = mysqlTable("agentRuns", {
  id: serial("id").primaryKey(),
  status: mysqlEnum("status", ["running", "completed", "failed", "stopped"])
    .default("running")
    .notNull(),
  startedAt: timestamp("startedAt").defaultNow().notNull(),
  completedAt: timestamp("completedAt"),
  productsFound: int("productsFound").default(0),
  productsPosted: int("productsPosted").default(0),
  errorsCount: int("errorsCount").default(0),
  errorLog: text("errorLog"),
  triggeredBy: mysqlEnum("triggeredBy", ["scheduler", "manual"]).default("scheduler").notNull(),
});

export type AgentRun = typeof agentRuns.$inferSelect;
export type InsertAgentRun = typeof agentRuns.$inferInsert;

// ─── Post Templates ─────────────────────────────────────────
export const postTemplates = mysqlTable("postTemplates", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  platform: mysqlEnum("platform", ["pinterest", "linkedin", "telegram"]).notNull(),
  template: text("template").notNull(),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt")
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
});

export type PostTemplate = typeof postTemplates.$inferSelect;
export type InsertPostTemplate = typeof postTemplates.$inferInsert;
