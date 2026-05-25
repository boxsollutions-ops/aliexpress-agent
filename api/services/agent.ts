/**
 * Core Agent Service
 * Manages the automated workflow: find products → add referral → publish to social
 */

import {
  findUnpostedProducts,
  updateProduct,
  updateProductStatus,
  createProductsBulk,
} from "../queries/products";
import { createPost, updatePostStatus } from "../queries/posts";
import {
  createAgentRun,
  completeAgentRun,
  findRunningAgentRun,
} from "../queries/agentRuns";
import { getSettingValue, getSettingJson } from "../queries/settings";
import { searchTrendingProducts, generateReferralUrl } from "./aliexpress";
import { searchTrendingAmazonProducts, generateAmazonReferralUrl } from "./amazon";
import { publishToPlatform } from "./social";
import type { InsertProduct } from "@db/schema";

let agentInterval: ReturnType<typeof setInterval> | null = null;
let isRunning = false;

export function isAgentRunning(): boolean {
  return isRunning;
}

export async function startAgent(): Promise<{ success: boolean; message: string }> {
  const enabled = await getSettingValue("agentEnabled");
  console.log(`[Agent] startAgent called, agentEnabled=${enabled}`);
  if (enabled !== "true") {
    return { success: false, message: "Agent is disabled. Enable it in Settings first." };
  }

  if (isRunning && agentInterval) {
    return { success: false, message: "Agent is already running" };
  }

  // Stop any stale run
  const existingRun = await findRunningAgentRun();
  if (existingRun) {
    await completeAgentRun(existingRun.id, { status: "stopped", errorLog: "Restarted by startAgent" });
  }

  isRunning = true;

  // Run first cycle immediately
  const firstRun = await createAgentRun({ triggeredBy: "manual" });
  console.log(`[Agent] Starting — created run #${firstRun.id}`);
  const firstResult = await executeAgentCycle(firstRun.id);
  console.log(`[Agent] First cycle result: ${firstResult.message}`);

  // Setup recurring interval — each cycle gets its own agentRun
  const intervalMinutes = parseInt((await getSettingValue("agentIntervalMinutes")) ?? "15", 10);
  const intervalMs = Math.max(intervalMinutes, 1) * 60 * 1000;
  console.log(`[Agent] Scheduling every ${intervalMinutes} min (${intervalMs}ms)`);

  agentInterval = setInterval(async () => {
    if (!isRunning) return;
    try {
      const newRun = await createAgentRun({ triggeredBy: "scheduler" });
      console.log(`[Agent] Scheduled cycle — run #${newRun.id}`);
      const result = await executeAgentCycle(newRun.id);
      console.log(`[Agent] Scheduled cycle result: ${result.message}`);
    } catch (err: any) {
      console.error(`[Agent] Scheduled cycle crashed:`, err.message);
    }
  }, intervalMs);

  return { success: true, message: `Agent started (${intervalMinutes} min interval). ${firstResult.message}` };
}

export async function stopAgent(): Promise<{ success: boolean; message: string }> {
  isRunning = false;
  if (agentInterval) { clearInterval(agentInterval); agentInterval = null; }
  const existingRun = await findRunningAgentRun();
  if (existingRun) {
    await completeAgentRun(existingRun.id, { status: "stopped", errorLog: "Stopped by user" });
  }
  return { success: true, message: "Agent stopped" };
}

export async function runOnce(): Promise<{ success: boolean; message: string }> {
  const enabled = await getSettingValue("agentEnabled");
  console.log(`[Agent] runOnce called, agentEnabled=${enabled}`);
  if (enabled !== "true") {
    return { success: false, message: "Agent is disabled. Enable it in Settings first." };
  }
  try {
    const agentRun = await createAgentRun({ triggeredBy: "manual" });
    console.log(`[Agent] RunOnce — created run #${agentRun.id}`);
    const result = await executeAgentCycle(agentRun.id);
    console.log(`[Agent] RunOnce result: ${result.message}`);
    return result;
  } catch (err: any) {
    console.error(`[Agent] RunOnce crashed:`, err.message);
    return { success: false, message: `RunOnce failed: ${err.message}` };
  }
}

async function executeAgentCycle(runId: number): Promise<{ success: boolean; message: string }> {
  console.log(`[Agent] === executeAgentCycle #${runId} START ===`);
  let productsFound = 0;
  let productsPosted = 0;
  let errorsCount = 0;
  const errorLogs: string[] = [];

  try {
    // ── Step 1: Choose source ──
    let sources: ("aliexpress" | "amazon")[];
    try {
      sources = await getSettingJson<("aliexpress" | "amazon")[]>("productSources") ?? ["aliexpress", "amazon"];
    } catch (e: any) {
      console.warn(`[Agent] Failed to read productSources, using default: ${e.message}`);
      sources = ["aliexpress", "amazon"];
    }
    const source = sources[Math.floor(Math.random() * sources.length)];
    console.log(`[Agent] Selected source: ${source}`);

    // ── Step 2: Fetch trending products ──
    let trendingProducts: Array<{
      productId: string; title: string; description: string;
      price: number; originalPrice?: number; currency: string;
      imageUrl: string; productUrl: string; category: string;
      rating: number; reviewsCount: number; ordersCount: number;
      storeName: string; isTrending: boolean; trendingRank?: number;
    }>;

    try {
      if (source === "amazon") {
        const cats = await getSettingJson<string[]>("amazonProductCategories");
        trendingProducts = await searchTrendingAmazonProducts(cats?.[0], 5);
      } else {
        const cats = await getSettingJson<string[]>("productCategories");
        trendingProducts = await searchTrendingProducts(cats?.[0], 5);
      }
      productsFound = trendingProducts.length;
      console.log(`[Agent] Found ${productsFound} ${source} products`);
    } catch (err: any) {
      console.error(`[Agent] Product search failed: ${err.message}`);
      await completeAgentRun(runId, { status: "failed", productsFound: 0, productsPosted: 0, errorsCount: 1, errorLog: `Search failed: ${err.message}` });
      return { success: false, message: `Product search failed: ${err.message}` };
    }

    // ── Step 3: Insert to DB ──
    try {
      const insertData: InsertProduct[] = trendingProducts.map((p) => ({
        source: source as "aliexpress" | "amazon",
        productId: p.productId,
        title: p.title,
        description: p.description,
        price: String(p.price),
        originalPrice: p.originalPrice ? String(p.originalPrice) : null,
        currency: p.currency,
        imageUrl: p.imageUrl,
        productUrl: p.productUrl,
        category: p.category,
        rating: String(p.rating),
        reviewsCount: p.reviewsCount,
        ordersCount: p.ordersCount,
        storeName: p.storeName,
        isTrending: p.isTrending,
        trendingRank: p.trendingRank,
        status: "new" as const,
      }));
      await createProductsBulk(insertData);
      console.log(`[Agent] Inserted ${insertData.length} products into DB`);
    } catch (err: any) {
      console.error(`[Agent] Product insert failed: ${err.message}`);
      errorLogs.push(`Insert: ${err.message}`);
      errorsCount++;
    }

    // ── Step 4: Get unposted products ──
    let unpostedProducts: Awaited<ReturnType<typeof findUnpostedProducts>>;
    try {
      unpostedProducts = await findUnpostedProducts();
      console.log(`[Agent] Unposted products: ${unpostedProducts.length}`);
    } catch (err: any) {
      console.error(`[Agent] findUnpostedProducts failed: ${err.message}`);
      await completeAgentRun(runId, { status: "failed", productsFound, productsPosted: 0, errorsCount: errorsCount + 1, errorLog: `DB query failed: ${err.message}` });
      return { success: false, message: `DB query failed: ${err.message}` };
    }

    if (unpostedProducts.length === 0) {
      console.log(`[Agent] No unposted products to process`);
      await completeAgentRun(runId, { status: "completed", productsFound, productsPosted: 0 });
      return { success: true, message: `Found ${productsFound} ${source} products. None to post.` };
    }

    // ── Step 5: Add referral and post ──
    const aliReferral = await getSettingValue("referralBaseUrl");
    const amazonReferral = await getSettingValue("amazonReferralUrl");
    const productsToPost = unpostedProducts.slice(0, 1);

    for (const product of productsToPost) {
      console.log(`[Agent] Processing product #${product.id}: ${product.title?.slice(0, 60)}`);

      try {
        // 5a: Generate referral URL
        let referralUrl: string;
        try {
          if (product.source === "amazon" && amazonReferral) {
            referralUrl = generateAmazonReferralUrl(product.productUrl, amazonReferral);
          } else {
            referralUrl = generateReferralUrl(product.productUrl, aliReferral ?? "");
          }
          console.log(`[Agent] Referral URL: ${referralUrl.slice(0, 80)}...`);
        } catch (err: any) {
          referralUrl = product.productUrl;
          console.warn(`[Agent] Referral generation failed, using productUrl: ${err.message}`);
        }

        // 5b: Update product
        try {
          await updateProduct(product.id, { referralUrl, status: "processed" });
          console.log(`[Agent] Product #${product.id} marked as processed`);
        } catch (err: any) {
          console.error(`[Agent] Failed to update product: ${err.message}`);
          errorLogs.push(`Product update: ${err.message}`);
          errorsCount++;
          continue;
        }

        // 5c: Get target platforms
        let targetPlatforms: ("pinterest" | "linkedin" | "telegram")[];
        try {
          targetPlatforms = await getSettingJson<("pinterest" | "linkedin" | "telegram")[]>("targetPlatforms") ?? ["pinterest", "linkedin", "telegram"];
        } catch (e: any) {
          targetPlatforms = ["pinterest", "linkedin", "telegram"];
        }
        if (targetPlatforms.length === 0) {
          console.warn(`[Agent] No target platforms configured`);
          errorLogs.push("No target platforms configured");
          errorsCount++;
          continue;
        }
        console.log(`[Agent] Target platforms: ${targetPlatforms.join(", ")}`);

        // 5d: Post to each platform
        for (const platform of targetPlatforms) {
          try {
            console.log(`[Agent] Posting to ${platform}...`);
            const post = await createPost({ productId: product.id, platform, status: "pending", scheduledAt: new Date() });
            console.log(`[Agent] Created post #${post.id} for ${platform}`);

            const result = await publishToPlatform(platform, {
              title: product.title,
              description: product.description ?? "",
              imageUrl: product.imageUrl ?? "",
              destinationUrl: referralUrl || product.productUrl,
              price: product.price ? String(product.price) : "",
              rating: product.rating ? String(product.rating) : "",
              orders: product.ordersCount ? String(product.ordersCount) : "",
            });

            if (result.success) {
              await updatePostStatus(post.id, "published", { platformPostId: result.platformPostId, postUrl: result.postUrl });
              console.log(`[Agent] ✅ Published to ${platform}: ${result.postUrl ?? "no url"}`);
              productsPosted++;
            } else {
              await updatePostStatus(post.id, "failed", { errorMessage: result.error });
              console.warn(`[Agent] ❌ ${platform}: ${result.error}`);
              errorLogs.push(`${platform}: ${result.error}`);
              errorsCount++;
            }
          } catch (err: any) {
            console.error(`[Agent] ${platform} error: ${err.message}`);
            errorLogs.push(`${platform}: ${err.message}`);
            errorsCount++;
          }
        }

        // 5e: Mark as posted
        try {
          await updateProductStatus(product.id, "posted");
          console.log(`[Agent] Product #${product.id} marked as posted`);
        } catch (err: any) {
          console.error(`[Agent] Failed to mark posted: ${err.message}`);
        }

      } catch (err: any) {
        console.error(`[Agent] Product ${product.id} error: ${err.message}`);
        errorLogs.push(`Product ${product.id}: ${err.message}`);
        errorsCount++;
        try {
          await updateProductStatus(product.id, "error");
        } catch {
          // ignore
        }
      }
    }

    // ── Step 6: Complete run ──
    const finalStatus = errorsCount > 0 && productsPosted === 0 ? "failed" : "completed";
    await completeAgentRun(runId, {
      status: finalStatus,
      productsFound, productsPosted, errorsCount,
      errorLog: errorLogs.join("\n") || undefined,
    });

    const message = `Source: ${source}. Found: ${productsFound}, Posted: ${productsPosted}, Errors: ${errorsCount}`;
    console.log(`[Agent] === Cycle #${runId} END: ${finalStatus} — ${message} ===`);
    return { success: productsPosted > 0, message };

  } catch (err: any) {
    console.error(`[Agent] === Cycle #${runId} CRASHED: ${err.message} ===`);
    await completeAgentRun(runId, {
      status: "failed",
      productsFound, productsPosted, errorsCount: errorsCount + 1,
      errorLog: err.message,
    });
    return { success: false, message: `Agent cycle crashed: ${err.message}` };
  }
}

// ─── Background Scheduler ─────────────────────────────────────────
let schedulerInterval: ReturnType<typeof setInterval> | null = null;
let schedulerStarted = false;

export async function startScheduler(): Promise<void> {
  if (schedulerStarted) return;
  schedulerStarted = true;

  if (schedulerInterval) { clearInterval(schedulerInterval); schedulerInterval = null; }

  const intervalMinutes = parseInt((await getSettingValue("agentIntervalMinutes")) ?? "15", 10);
  const intervalMs = Math.max(intervalMinutes, 1) * 60 * 1000;

  console.log(`[Agent] Background scheduler started (${intervalMinutes} min interval)`);

  schedulerInterval = setInterval(async () => {
    try {
      const enabled = await getSettingValue("agentEnabled");
      if (enabled !== "true") {
        console.log(`[Agent] Scheduler: agent disabled, skipping`);
        return;
      }
      const existingRun = await findRunningAgentRun();
      if (existingRun) {
        console.log(`[Agent] Scheduler: run #${existingRun.id} already active, skipping`);
        return;
      }
      const agentRun = await createAgentRun({ triggeredBy: "scheduler" });
      console.log(`[Agent] Scheduler: starting cycle #${agentRun.id}`);
      const result = await executeAgentCycle(agentRun.id);
      console.log(`[Agent] Scheduler: cycle #${agentRun.id} result: ${result.message}`);
    } catch (err: any) {
      console.error(`[Agent] Scheduler error:`, err.message);
    }
  }, intervalMs);
}

export function stopScheduler(): void {
  schedulerStarted = false;
  if (schedulerInterval) { clearInterval(schedulerInterval); schedulerInterval = null; }
}
