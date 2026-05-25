import { getDb } from "./connection";
import { settings } from "@db/schema";
import { eq } from "drizzle-orm";
import type { Setting, InsertSetting } from "@db/schema";

// In-memory store (works even if DB fails)
const memoryStore: Map<string, string> = new Map();
let initDone = false;

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

export async function initializeDefaultSettings(): Promise<void> {
  if (initDone) return;
  initDone = true;

  // Step 1: Load existing values from DB FIRST (so they take priority over defaults)
  try {
    const db = getDb();
    const rows = await db.select().from(settings);
    console.log(`[Settings] Loaded ${rows.length} settings from DB`);
    for (const row of rows) {
      if (row.value !== null && row.value !== undefined) {
        memoryStore.set(row.key, row.value);
      }
    }
  } catch (e: any) {
    console.warn("[Settings] DB load failed:", e.message);
  }

  // Step 2: Set defaults only for keys NOT already in DB/memory
  for (const s of DEFAULTS) {
    if (!memoryStore.has(s.key)) {
      memoryStore.set(s.key, s.value ?? "");
    }
  }

  // Step 3: Insert defaults into DB (onDuplicateKeyUpdate won't overwrite existing values)
  try {
    const db = getDb();
    for (const s of DEFAULTS) {
      await db.insert(settings).values(s).onDuplicateKeyUpdate({
        set: { updatedAt: new Date() },
      });
    }
  } catch (e: any) {
    console.warn("[Settings] DB init failed:", e.message);
  }
}

export async function getSettingValue(key: string): Promise<string | null> {
  // Check memory first
  const mem = memoryStore.get(key);
  if (mem !== undefined) {
    return mem;
  }

  // Try DB
  try {
    const db = getDb();
    const rows = await db.select().from(settings).where(eq(settings.key, key)).limit(1);
    const row = rows[0];
    if (row?.value !== null && row?.value !== undefined) {
      memoryStore.set(key, row.value);
      return row.value;
    }
  } catch (e: any) {
    console.warn(`[Settings] DB read failed for ${key}:`, e.message);
  }

  return memoryStore.get(key) ?? null;
}

export async function setSettingValue(key: string, value: string): Promise<void> {
  // Always update memory
  memoryStore.set(key, value);

  // Try DB
  try {
    const db = getDb();
    const existing = await db.select().from(settings).where(eq(settings.key, key)).limit(1);

    if (existing.length > 0) {
      await db.update(settings).set({ value, updatedAt: new Date() }).where(eq(settings.key, key));
      console.log(`[Settings] Updated ${key} in DB`);
    } else {
      const def = DEFAULTS.find((s) => s.key === key);
      await db.insert(settings).values({
        key,
        value,
        description: def?.description ?? "",
      });
      console.log(`[Settings] Inserted ${key} into DB`);
    }
  } catch (e: any) {
    console.error(`[Settings] DB save failed for ${key}:`, e.message);
  }
}

export async function findAllSettings(): Promise<Setting[]> {
  await initializeDefaultSettings();

  try {
    const db = getDb();
    const rows = await db.select().from(settings);
    // Sync to memory
    for (const row of rows) {
      memoryStore.set(row.key, row.value ?? "");
    }
    // Return merged (defaults + DB)
    const result: Setting[] = [];
    for (const s of DEFAULTS) {
      const dbRow = rows.find((r) => r.key === s.key);
      result.push({
        id: dbRow?.id ?? 0,
        key: s.key,
        value: memoryStore.get(s.key) ?? s.value,
        description: s.description ?? null,
        isEncrypted: false,
        updatedAt: dbRow?.updatedAt ?? new Date(),
      } as Setting);
    }
    return result;
  } catch {
    // Return from memory
    return DEFAULTS.map((s, i) => ({
      id: i,
      key: s.key,
      value: memoryStore.get(s.key) ?? s.value ?? "",
      description: s.description ?? null,
      isEncrypted: false,
      updatedAt: new Date(),
    } as Setting));
  }
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
