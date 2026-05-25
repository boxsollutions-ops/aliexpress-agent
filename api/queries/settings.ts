import { getDb } from "./connection";
import { settings } from "@db/schema";
import { eq } from "drizzle-orm";
import type { Setting, InsertSetting } from "@db/schema";

// In-memory store (works even if DB fails)
const memoryStore: Map<string, string> = new Map();
let initDone = false;
let dbAvailable = false;

const DEFAULTS: InsertSetting[] = [
  { key: "referralBaseUrl", value: "https://s.click.aliexpress.com/e/_oCz4l5B" },
  { key: "amazonReferralUrl", value: "boxsolutions-20" },
  { key: "pinterestAccessToken", value: "" },
  { key: "pinterestBoardId", value: "trending-products" },
  { key: "linkedinAccessToken", value: "" },
  { key: "linkedinUserId", value: "" },
  { key: "telegramBotToken", value: "" },
  { key: "telegramChannelId", value: "" },
  { key: "agentEnabled", value: "false" },
  { key: "agentIntervalMinutes", value: "15" },
  { key: "maxPostsPerDay", value: "96" },
  { key: "targetPlatforms", value: '["pinterest","linkedin","telegram"]' },
  { key: "productSources", value: '["aliexpress","amazon"]' },
  { key: "productCategories", value: '["electronics","home","fashion","beauty","toys"]' },
  { key: "amazonProductCategories", value: '["electronics","home-kitchen","fashion","beauty","sports-outdoors"]' },
  { key: "minProductRating", value: "4.0" },
  { key: "minOrdersCount", value: "100" },
  { key: "postTemplate", value: "{title}\n\nPrice: ${price}\nRating: {rating}/5\nOrders: {orders}\n\n{referralUrl}" },
];

// Fast initialization: defaults in memory immediately, DB async
export async function initializeDefaultSettings(): Promise<void> {
  if (initDone) return;
  initDone = true;

  // Step 1: Set defaults immediately (API can respond right away)
  for (const s of DEFAULTS) {
    if (!memoryStore.has(s.key)) {
      memoryStore.set(s.key, s.value ?? "");
    }
  }

  // Step 2: Load from DB in background with timeout
  try {
    const db = getDb();
    // Quick check if DB is reachable (5 second timeout)
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("DB timeout")), 5000)
    );
    const rowsPromise = db.select().from(settings).limit(100);
    const rows = await Promise.race([rowsPromise, timeoutPromise]);

    dbAvailable = true;
    for (const row of rows) {
      if (row.value !== null && row.value !== undefined) {
        memoryStore.set(row.key, row.value);
      }
    }
    console.log(`[Settings] Loaded ${rows.length} values from DB`);

    // Insert defaults into DB (won't overwrite existing)
    for (const s of DEFAULTS) {
      try {
        await db.insert(settings).values(s).onDuplicateKeyUpdate({
          set: { updatedAt: new Date() },
        });
      } catch {
        // Skip if this insert fails
      }
    }
  } catch (e: any) {
    console.warn(`[Settings] DB unavailable (${e.message}), using memory only`);
    dbAvailable = false;
  }
}

export async function getSettingValue(key: string): Promise<string | null> {
  // Memory first (always fast)
  const mem = memoryStore.get(key);
  if (mem !== undefined) return mem;

  // If DB is known unavailable, skip
  if (!dbAvailable) return null;

  // Try DB
  try {
    const rows = await getDb().select().from(settings).where(eq(settings.key, key)).limit(1);
    const row = rows[0];
    if (row?.value !== null && row?.value !== undefined) {
      memoryStore.set(key, row.value);
      return row.value;
    }
  } catch {
    dbAvailable = false;
  }
  return null;
}

export async function setSettingValue(key: string, value: string): Promise<void> {
  // Always update memory immediately
  memoryStore.set(key, value);

  // Skip DB if known unavailable
  if (!dbAvailable) {
    console.log(`[Settings] ${key} saved to memory only (DB offline)`);
    return;
  }

  // Try DB with timeout
  try {
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("timeout")), 5000)
    );

    const db = getDb();
    const checkPromise = db.select().from(settings).where(eq(settings.key, key)).limit(1);
    const existing = await Promise.race([checkPromise, timeoutPromise]);

    if (existing.length > 0) {
      const updatePromise = db.update(settings).set({ value, updatedAt: new Date() }).where(eq(settings.key, key));
      await Promise.race([updatePromise, timeoutPromise]);
      console.log(`[Settings] Updated ${key} in DB`);
    } else {
      const def = DEFAULTS.find((s) => s.key === key);
      const insertPromise = db.insert(settings).values({ key, value, description: def?.description ?? "" });
      await Promise.race([insertPromise, timeoutPromise]);
      console.log(`[Settings] Inserted ${key} into DB`);
    }
  } catch (e: any) {
    console.error(`[Settings] DB save failed for ${key}: ${e.message}`);
    dbAvailable = false;
  }
}

export async function findAllSettings(): Promise<Setting[]> {
  // Fast return from memory (no DB blocking)
  const result: Setting[] = [];
  for (const s of DEFAULTS) {
    result.push({
      id: 0,
      key: s.key,
      value: memoryStore.get(s.key) ?? s.value ?? "",
      description: s.description ?? null,
      isEncrypted: false,
      updatedAt: new Date(),
    } as Setting);
  }
  // Background: try to sync with DB
  initializeDefaultSettings().catch(() => {});
  return result;
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

export async function findSettingByKey(key: string): Promise<Setting | undefined> {
  const all = await findAllSettings();
  return all.find((s) => s.key === key);
}

export async function upsertSetting(key: string, value: string, _description?: string): Promise<void> {
  await setSettingValue(key, value);
}

export async function getConnectionStatus() {
  const r = {
    pinterest: { connected: false, hasToken: false, hasBoard: false },
    linkedin: { connected: false, hasToken: false, hasUser: false },
    telegram: { connected: false, hasToken: false, hasChannel: false },
    referral: { configured: false, url: "" as string | null },
    amazonReferral: { configured: false, url: "" as string | null },
  };

  const pt = await getSettingValue("pinterestAccessToken");
  const pb = await getSettingValue("pinterestBoardId");
  r.pinterest = { connected: !!(pt && pb), hasToken: !!pt, hasBoard: !!pb };

  const lt = await getSettingValue("linkedinAccessToken");
  const lu = await getSettingValue("linkedinUserId");
  r.linkedin = { connected: !!(lt && lu), hasToken: !!lt, hasUser: !!lu };

  const tt = await getSettingValue("telegramBotToken");
  const tc = await getSettingValue("telegramChannelId");
  r.telegram = { connected: !!(tt && tc), hasToken: !!tt, hasChannel: !!tc };

  const ref = await getSettingValue("referralBaseUrl");
  r.referral = { configured: !!ref, url: ref };

  const aref = await getSettingValue("amazonReferralUrl");
  r.amazonReferral = { configured: !!aref, url: aref };

  return r;
}
