import { getDb } from "./connection";
import { settings } from "@db/schema";
import { eq } from "drizzle-orm";
import type { Setting, InsertSetting } from "@db/schema";

const DEFAULT_SETTINGS: InsertSetting[] = [
  {
    key: "referralBaseUrl",
    value: "",
    description: "Base referral URL for AliExpress (e.g., https://s.click.aliexpress.com/e/______)",
  },
  {
    key: "amazonReferralUrl",
    value: "",
    description: "Amazon Associates referral URL/tag (e.g., https://www.amazon.com?tag=yourtag-20)",
  },
  {
    key: "pinterestAccessToken",
    value: "",
    description: "Pinterest API Access Token",
    isEncrypted: true,
  },
  {
    key: "pinterestBoardId",
    value: "",
    description: "Pinterest Board ID to post to",
  },
  {
    key: "linkedinAccessToken",
    value: "",
    description: "LinkedIn API Access Token",
    isEncrypted: true,
  },
  {
    key: "linkedinUserId",
    value: "",
    description: "LinkedIn User URN (e.g., urn:li:person:xxx)",
  },
  {
    key: "telegramBotToken",
    value: "",
    description: "Telegram Bot Token",
    isEncrypted: true,
  },
  {
    key: "telegramChannelId",
    value: "",
    description: "Telegram Channel ID (e.g., @mychannel or -100xxxx)",
  },
  {
    key: "agentEnabled",
    value: "false",
    description: "Whether the auto-posting agent is enabled",
  },
  {
    key: "agentIntervalMinutes",
    value: "15",
    description: "Interval between posts in minutes",
  },
  {
    key: "maxPostsPerDay",
    value: "96",
    description: "Maximum number of posts per day (96 = every 15 min)",
  },
  {
    key: "targetPlatforms",
    value: JSON.stringify(["pinterest", "linkedin", "telegram"]),
    description: "Platforms to post to (JSON array)",
  },
  {
    key: "productSources",
    value: JSON.stringify(["aliexpress", "amazon"]),
    description: "Product sources to search (JSON array: aliexpress, amazon)",
  },
  {
    key: "productCategories",
    value: JSON.stringify(["electronics", "home", "fashion", "beauty", "toys"]),
    description: "AliExpress product categories to search for (JSON array)",
  },
  {
    key: "amazonProductCategories",
    value: JSON.stringify(["electronics", "home-kitchen", "fashion", "beauty", "sports-outdoors"]),
    description: "Amazon product categories to search for (JSON array)",
  },
  {
    key: "minProductRating",
    value: "4.0",
    description: "Minimum product rating to include",
  },
  {
    key: "minOrdersCount",
    value: "100",
    description: "Minimum number of orders for a product",
  },
  {
    key: "postTemplate",
    value: "🔥 {title}\n\n💰 Price: ${price}\n⭐ Rating: {rating}/5\n🛒 Orders: {orders}\n\n👇 Get it now:\n{referralUrl}",
    description: "Default post template for Telegram",
  },
];

export async function initializeDefaultSettings(): Promise<void> {
  const db = getDb();
  for (const setting of DEFAULT_SETTINGS) {
    await db
      .insert(settings)
      .values(setting)
      .onDuplicateKeyUpdate({
        set: { updatedAt: new Date() },
      });
  }
}

export async function findAllSettings(): Promise<Setting[]> {
  return getDb().query.settings.findMany();
}

export async function findSettingByKey(key: string): Promise<Setting | undefined> {
  return getDb().query.settings.findFirst({
    where: eq(settings.key, key),
  });
}

export async function getSettingValue(key: string): Promise<string | null> {
  const setting = await findSettingByKey(key);
  return setting?.value ?? null;
}

export async function getSettingJson<T = unknown>(key: string): Promise<T | null> {
  const value = await getSettingValue(key);
  if (!value) return null;
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

export async function updateSetting(key: string, value: string): Promise<void> {
  await getDb()
    .update(settings)
    .set({ value, updatedAt: new Date() })
    .where(eq(settings.key, key));
}

export async function upsertSetting(
  key: string,
  value: string,
  description?: string
): Promise<void> {
  const db = getDb();
  const existing = await findSettingByKey(key);
  if (existing) {
    await db
      .update(settings)
      .set({ value, updatedAt: new Date() })
      .where(eq(settings.key, key));
  } else {
    await db.insert(settings).values({ key, value, description });
  }
}
