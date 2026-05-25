/**
 * Social Media Publishing Services
 * Pinterest, LinkedIn, Telegram publishers
 */

import { getSettingValue } from "../queries/settings";

export interface PublishResult {
  success: boolean;
  platformPostId?: string;
  postUrl?: string;
  error?: string;
}

// ─── TEST MODE ────────────────────────────────────────────────────
// When true, simulates posting without real API calls
let testMode = false;
export function setTestMode(enabled: boolean) {
  testMode = enabled;
}

// ─── Pinterest Publisher ──────────────────────────────────────────

export async function publishToPinterest(options: {
  title: string;
  description: string;
  imageUrl: string;
  destinationUrl: string;
}): Promise<PublishResult> {
  const accessToken = await getSettingValue("pinterestAccessToken");
  const boardId = await getSettingValue("pinterestBoardId");

  if (!accessToken) return { success: false, error: "Pinterest access token not configured" };
  if (!boardId) return { success: false, error: "Pinterest board ID not configured" };

  if (testMode || accessToken.startsWith("pina_test")) {
    console.log("[TEST] Pinterest pin would be created:", options.title);
    return {
      success: true,
      platformPostId: `test-pin-${Date.now()}`,
      postUrl: `https://pinterest.com/pin/test-${Date.now()}`,
    };
  }

  try {
    const response = await fetch("https://api.pinterest.com/v5/pins", {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        title: options.title.slice(0, 100),
        description: options.description.slice(0, 500),
        board_id: boardId,
        media_source: { source_type: "image_url", url: options.imageUrl },
        destination_url: options.destinationUrl,
      }),
    });
    if (!response.ok) {
      const err = await response.text();
      return { success: false, error: `Pinterest API: ${err.slice(0, 200)}` };
    }
    const data = (await response.json()) as { id: string; link?: string };
    return { success: true, platformPostId: data.id, postUrl: data.link ?? `https://pinterest.com/pin/${data.id}` };
  } catch (e: any) {
    return { success: false, error: `Pinterest: ${e.message}` };
  }
}

// ─── LinkedIn Publisher ───────────────────────────────────────────

export async function publishToLinkedIn(options: {
  title: string;
  description: string;
  imageUrl: string;
  destinationUrl: string;
}): Promise<PublishResult> {
  const accessToken = await getSettingValue("linkedinAccessToken");
  const userId = await getSettingValue("linkedinUserId");

  if (!accessToken) return { success: false, error: "LinkedIn access token not configured" };
  if (!userId) return { success: false, error: "LinkedIn user ID not configured" };

  if (testMode || accessToken.startsWith("test_")) {
    console.log("[TEST] LinkedIn post would be created:", options.title);
    return { success: true, platformPostId: `test-li-${Date.now()}`, postUrl: options.destinationUrl };
  }

  try {
    const shareBody = {
      author: userId,
      lifecycleState: "PUBLISHED" as const,
      specificContent: {
        "com.linkedin.ugc.ShareContent": {
          shareCommentary: { text: `${options.title}\n\n${options.description}\n\n${options.destinationUrl}` },
          shareMediaCategory: "NONE" as const,
        },
      },
      visibility: { "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC" as const },
    };

    const response = await fetch("https://api.linkedin.com/v2/ugcPosts", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        "X-Restli-Protocol-Version": "2.0.0",
      },
      body: JSON.stringify(shareBody),
    });

    if (!response.ok) {
      const err = await response.text();
      return { success: false, error: `LinkedIn API: ${response.status} ${err.slice(0, 200)}` };
    }
    const data = (await response.json()) as { id: string };
    return { success: true, platformPostId: data.id, postUrl: `https://www.linkedin.com/feed/update/${data.id}` };
  } catch (e: any) {
    return { success: false, error: `LinkedIn: ${e.message}` };
  }
}

// ─── Telegram Publisher ───────────────────────────────────────────

export async function publishToTelegram(options: {
  title: string;
  description: string;
  imageUrl: string;
  destinationUrl: string;
  price: string;
  rating: string;
  orders: string;
}): Promise<PublishResult> {
  const botToken = await getSettingValue("telegramBotToken");
  const channelId = await getSettingValue("telegramChannelId");

  if (!botToken) return { success: false, error: "Telegram bot token not configured" };
  if (!channelId) return { success: false, error: "Telegram channel ID not configured" };

  if (testMode || botToken.startsWith("test_")) {
    console.log("[TEST] Telegram message would be sent:", options.title);
    return { success: true, platformPostId: `test-tg-${Date.now()}`, postUrl: `https://t.me/${channelId.replace(/^@/, "")}/test` };
  }

  try {
    const template = (await getSettingValue("postTemplate")) ?? getDefaultTelegramTemplate();
    const caption = template
      .replace(/{title}/g, options.title)
      .replace(/{description}/g, options.description)
      .replace(/{price}/g, options.price)
      .replace(/{rating}/g, options.rating)
      .replace(/{orders}/g, options.orders)
      .replace(/{referralUrl}/g, options.destinationUrl)
      .slice(0, 1024);

    const response = await fetch(`https://api.telegram.org/bot${botToken}/sendPhoto`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: channelId,
        photo: options.imageUrl,
        caption,
        parse_mode: "HTML",
        reply_markup: { inline_keyboard: [[{ text: "Buy Now", url: options.destinationUrl }]] },
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      return { success: false, error: `Telegram API: ${err.slice(0, 200)}` };
    }
    const data = (await response.json()) as { ok: boolean; result?: { message_id: number }; description?: string };
    if (!data.ok) return { success: false, error: `Telegram: ${data.description ?? "unknown error"}` };
    if (!data.result) return { success: false, error: "Telegram: no result" };
    return {
      success: true,
      platformPostId: String(data.result.message_id),
      postUrl: `https://t.me/${channelId.replace(/^@/, "")}/${data.result.message_id}`,
    };
  } catch (e: any) {
    return { success: false, error: `Telegram: ${e.message}` };
  }
}

function getDefaultTelegramTemplate(): string {
  return `🔥 <b>{title}</b>\n\n💰 Price: {price}\n⭐ Rating: {rating}/5\n🛒 Orders: {orders}\n\n👇 <a href="{referralUrl}">Get it now</a>`;
}

// ─── Generic Publisher ────────────────────────────────────────────

export async function publishToPlatform(
  platform: "pinterest" | "linkedin" | "telegram",
  options: {
    title: string;
    description: string;
    imageUrl: string;
    destinationUrl: string;
    price?: string;
    rating?: string;
    orders?: string;
  }
): Promise<PublishResult> {
  switch (platform) {
    case "pinterest":
      return publishToPinterest({
        title: options.title,
        description: options.description,
        imageUrl: options.imageUrl,
        destinationUrl: options.destinationUrl,
      });
    case "linkedin":
      return publishToLinkedIn({
        title: options.title,
        description: options.description,
        imageUrl: options.imageUrl,
        destinationUrl: options.destinationUrl,
      });
    case "telegram":
      return publishToTelegram({
        title: options.title,
        description: options.description,
        imageUrl: options.imageUrl,
        destinationUrl: options.destinationUrl,
        price: options.price ?? "",
        rating: options.rating ?? "",
        orders: options.orders ?? "",
      });
  }
}
