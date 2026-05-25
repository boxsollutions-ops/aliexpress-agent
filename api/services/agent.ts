/**
 * Core Agent Service
 * Manages the automated workflow: find products (AliExpress + Amazon) → add referral → publish to social
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
  if (enabled !== "true") {
    return { success: false, message: "Agent is disabled in settings. Enable it first." };
  }

  if (isRunning && agentInterval) {
    return { success: false, message: "Agent is already running" };
  }

  // Check for running agent in DB
  const existingRun = await findRunningAgentRun();
  if (existingRun) {
    await completeAgentRun(existingRun.id, {
      status: "stopped",
      errorLog: "Stopped by new start request",
    });
  }

  isRunning = true;

  // Create a new agent run record
  const agentRun = await createAgentRun({ triggeredBy: "manual" });

  // Run immediately
  await executeAgentCycle(agentRun.id);

  // Get interval from settings
  const intervalMinutes = parseInt((await getSettingValue("agentIntervalMinutes")) ?? "15", 10);
  const intervalMs = Math.max(intervalMinutes, 1) * 60 * 1000;

  // Schedule recurring runs
  agentInterval = setInterval(async () => {
    if (!isRunning) return;
    await executeAgentCycle(agentRun.id);
  }, intervalMs);

  return {
    success: true,
    message: `Agent started with ${intervalMinutes} minute interval`,
  };
}

export async function stopAgent(): Promise<{ success: boolean; message: string }> {
  isRunning = false;

  if (agentInterval) {
    clearInterval(agentInterval);
    agentInterval = null;
  }

  // Mark any running agent runs as stopped
  const existingRun = await findRunningAgentRun();
  if (existingRun) {
    await completeAgentRun(existingRun.id, {
      status: "stopped",
      errorLog: "Stopped by user",
    });
  }

  return { success: true, message: "Agent stopped" };
}

export async function runOnce(): Promise<{ success: boolean; message: string }> {
  const enabled = await getSettingValue("agentEnabled");
  if (enabled !== "true") {
    return { success: false, message: "Agent is disabled in settings. Enable it first." };
  }

  const agentRun = await createAgentRun({ triggeredBy: "manual" });
  const result = await executeAgentCycle(agentRun.id);

  return {
    success: result.success,
    message: result.message,
  };
}

async function executeAgentCycle(
  runId: number
): Promise<{ success: boolean; message: string }> {
  let productsFound = 0;
  let productsPosted = 0;
  let errorsCount = 0;
  const errorLogs: string[] = [];

  try {
    // Determine which source to use this cycle
    const sources = await getSettingJson<("aliexpress" | "amazon")[]>("productSources");
    const activeSources = sources ?? ["aliexpress", "amazon"];
    const source = activeSources[Math.floor(Math.random() * activeSources.length)];

    // Get category based on source
    let trendingProducts: Array<{
      productId: string;
      title: string;
      description: string;
      price: number;
      originalPrice?: number;
      currency: string;
      imageUrl: string;
      productUrl: string;
      category: string;
      rating: number;
      reviewsCount: number;
      ordersCount: number;
      storeName: string;
      isTrending: boolean;
      trendingRank?: number;
    }>;

    if (source === "amazon") {
      const categories = await getSettingJson<string[]>("amazonProductCategories");
      const category = categories?.[Math.floor(Math.random() * (categories?.length ?? 1))];
      trendingProducts = await searchTrendingAmazonProducts(category, 5);
    } else {
      const categories = await getSettingJson<string[]>("productCategories");
      const category = categories?.[Math.floor(Math.random() * (categories?.length ?? 1))];
      trendingProducts = await searchTrendingProducts(category, 5);
    }

    productsFound = trendingProducts.length;

    // Insert products into DB
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

    // Step 2: Process unposted products
    const unpostedProducts = await findUnpostedProducts();

    if (unpostedProducts.length === 0) {
      await completeAgentRun(runId, {
        status: "completed",
        productsFound,
        productsPosted: 0,
      });
      return { success: true, message: `Found ${productsFound} ${source} products. No new products to post.` };
    }

    // Step 3: Add referral links
    const aliReferralBase = await getSettingValue("referralBaseUrl");
    const amazonReferralBase = await getSettingValue("amazonReferralUrl");
    const productsToPost = unpostedProducts.slice(0, 1); // Post 1 product per cycle

    for (const product of productsToPost) {
      try {
        // Generate referral URL based on product source
        let referralUrl: string;
        if (product.source === "amazon" && amazonReferralBase) {
          referralUrl = generateAmazonReferralUrl(product.productUrl, amazonReferralBase);
        } else if (product.source === "amazon") {
          referralUrl = product.productUrl;
        } else {
          referralUrl = generateReferralUrl(product.productUrl, aliReferralBase ?? "");
        }

        await updateProduct(product.id, {
          referralUrl,
          status: "processed",
        });

        // Step 4: Post to enabled platforms
        const platforms = await getSettingJson<("pinterest" | "linkedin" | "telegram")[]>(
          "targetPlatforms"
        );

        if (!platforms || platforms.length === 0) {
          errorLogs.push("No target platforms configured");
          errorsCount++;
          continue;
        }

        for (const platform of platforms) {
          try {
            // Create post record
            const post = await createPost({
              productId: product.id,
              platform,
              status: "pending",
              scheduledAt: new Date(),
            });

            // Publish to platform
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
              await updatePostStatus(post.id, "published", {
                platformPostId: result.platformPostId,
                postUrl: result.postUrl,
              });
              productsPosted++;
            } else {
              await updatePostStatus(post.id, "failed", {
                errorMessage: result.error,
              });
              errorLogs.push(`${platform}: ${result.error}`);
              errorsCount++;
            }
          } catch (error) {
            const msg = error instanceof Error ? error.message : "Unknown error";
            errorLogs.push(`${platform}: ${msg}`);
            errorsCount++;
          }
        }

        // Mark product as posted
        await updateProductStatus(product.id, "posted");
      } catch (error) {
        const msg = error instanceof Error ? error.message : "Unknown error";
        errorLogs.push(`Product ${product.id}: ${msg}`);
        errorsCount++;
        await updateProductStatus(product.id, "error");
      }
    }

    // Update agent run with results
    await completeAgentRun(runId, {
      status: errorsCount > 0 && productsPosted === 0 ? "failed" : "completed",
      productsFound,
      productsPosted,
      errorsCount,
      errorLog: errorLogs.join("\n") || undefined,
    });

    return {
      success: productsPosted > 0,
      message: `Cycle complete. Source: ${source}. Found ${productsFound} products, posted ${productsPosted}. Errors: ${errorsCount}`,
    };
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    await completeAgentRun(runId, {
      status: "failed",
      productsFound,
      productsPosted,
      errorsCount: errorsCount + 1,
      errorLog: msg,
    });
    return { success: false, message: `Agent cycle failed: ${msg}` };
  }
}

// Scheduler for automatic background runs
let schedulerInterval: ReturnType<typeof setInterval> | null = null;

export async function startScheduler(): Promise<void> {
  // Stop existing scheduler
  if (schedulerInterval) {
    clearInterval(schedulerInterval);
    schedulerInterval = null;
  }

  const intervalMinutes = parseInt((await getSettingValue("agentIntervalMinutes")) ?? "15", 10);
  const intervalMs = Math.max(intervalMinutes, 1) * 60 * 1000;

  schedulerInterval = setInterval(async () => {
    const enabled = await getSettingValue("agentEnabled");
    if (enabled !== "true") return;

    const existingRun = await findRunningAgentRun();
    if (existingRun) return; // Don't run if already running

    const agentRun = await createAgentRun({ triggeredBy: "scheduler" });
    await executeAgentCycle(agentRun.id);
  }, intervalMs);
}

export function stopScheduler(): void {
  if (schedulerInterval) {
    clearInterval(schedulerInterval);
    schedulerInterval = null;
  }
}

// Initialize scheduler on module load
startScheduler().catch(() => {
  // Silently fail - scheduler will be started when settings are configured
});
