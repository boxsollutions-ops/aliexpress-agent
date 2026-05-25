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
  for (const s of DEFAULTS) memoryStore.set(s.key, s.value ?? "");
  try {
    const db = getDb();
    for (const s of DEFAULTS) {
      await db.insert(settings).values(s).onDuplicateKeyUpdate({ set: { updatedAt: new Date() } });
    }
  } catch (e: any) {
    console.warn("DB init failed, using memory:", e.message);
  }
}

export async function getSettingValue(key: string): Promise<string | null> {
  const mem = memoryStore.get(key);
  if (mem !== undefined) return mem;
  try {
    const db = getDb();
    const row = await db.query.settings.findFirst({ where: eq(settings.key, key) });
    if (row?.value != null) { memoryStore.set(key, row.value); return row.value; }
  } catch {}
  return memoryStore.get(key) ?? null;
}

export async function setSettingValue(key: string, value: string): Promise<void> {
  memoryStore.set(key, value);
  try {
    const db = getDb();
    const existing = await db.query.settings.findFirst({ where: eq(settings.key, key) });
    if (existing) {
      await db.update(settings).set({ value, updatedAt: new Date() }).where(eq(settings.key, key));
    } else {
      await db.insert(settings).values({ key, value });
    }
  } catch (e: any) {
    console.warn(`DB save failed for ${key}:`, e.message);
  }
}

export async function getSettingJson<T>(key: string): Promise<T | null> {
  const v = await getSettingValue(key);
  if (!v) return null;
  try { return JSON.parse(v) as T; } catch { return null; }
}

export async function findAllSettings(): Promise<Setting[]> {
  await initializeDefaultSettings();
  try {
    const db = getDb();
    const rows = await db.select().from(settings);
    for (const r of rows) memoryStore.set(r.key, r.value ?? "");
  } catch {}
  return DEFAULTS.map((s, i) => ({
    id: i, key: s.key, value: memoryStore.get(s.key) ?? s.value ?? "",
    description: s.description ?? null, isEncrypted: false, updatedAt: new Date(),
  } as Setting));
}

export async function findSettingByKey(key: string): Promise<Setting | undefined> {
  const all = await findAllSettings();
  return all.find(s => s.key === key);
}

export async function upsertSetting(key: string, value: string, _desc?: string): Promise<void> {
  await setSettingValue(key, value);
}

export async function getConnectionStatus() {
  const pt = await getSettingValue("pinterestAccessToken");
  const pb = await getSettingValue("pinterestBoardId");
  const lt = await getSettingValue("linkedinAccessToken");
  const lu = await getSettingValue("linkedinUserId");
  const tt = await getSettingValue("telegramBotToken");
  const tc = await getSettingValue("telegramChannelId");
  const ref = await getSettingValue("referralBaseUrl");
  const aref = await getSettingValue("amazonReferralUrl");
  return {
    pinterest: { connected: !!(pt && pb), hasToken: !!pt, hasBoard: !!pb },
    linkedin: { connected: !!(lt && lu), hasToken: !!lt, hasUser: !!lu },
    telegram: { connected: !!(tt && tc), hasToken: !!tt, hasChannel: !!tc },
    referral: { configured: !!ref, url: ref },
    amazonReferral: { configured: !!aref, url: aref },
  };
}