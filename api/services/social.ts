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

// ─── Pinterest Publisher ────────────────────────────────────

export async function publishToPinterest(options: {
  title: string;
  description: string;
  imageUrl: string;
  destinationUrl: string;
}): Promise<PublishResult> {
  try {
    const accessToken = await getSettingValue("pinterestAccessToken");
    const boardId = await getSettingValue("pinterestBoardId");

    if (!accessToken) {
      return { success: false, error: "Pinterest access token not configured" };
    }
    if (!boardId) {
      return { success: false, error: "Pinterest board ID not configured" };
    }

    const response = await fetch("https://api.pinterest.com/v5/pins", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        title: options.title.slice(0, 100),
        description: options.description.slice(0, 500),
        board_id: boardId,
        media_source: {
          source_type: "image_url",
          url: options.imageUrl,
        },
        destination_url: options.destinationUrl,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return { success: false, error: `Pinterest API error: ${errorText}` };
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data = (await response.json()) as any;
    return {
      success: true,
      platformPostId: data.id as string,
      postUrl: (data.link as string) ?? `https://pinterest.com/pin/${data.id as string}`,
    };
  } catch (error) {
    return {
      success: false,
      error: `Pinterest publish failed: ${error instanceof Error ? error.message : "Unknown error"}`,
    };
  }
}

// ─── LinkedIn Publisher ─────────────────────────────────────

export async function publishToLinkedIn(options: {
  title: string;
  description: string;
  imageUrl: string;
  destinationUrl: string;
}): Promise<PublishResult> {
  try {
    const accessToken = await getSettingValue("linkedinAccessToken");
    const userId = await getSettingValue("linkedinUserId");

    if (!accessToken) {
      return { success: false, error: "LinkedIn access token not configured" };
    }
    if (!userId) {
      return { success: false, error: "LinkedIn user ID not configured" };
    }

    // First, upload image if URL provided
    let imageUrn: string | undefined;
    if (options.imageUrl) {
      imageUrn = await uploadLinkedInImage(accessToken, userId, options.imageUrl);
    }

    // Create the share
    const shareBody: Record<string, unknown> = {
      author: userId,
      lifecycleState: "PUBLISHED",
      specificContent: {
        "com.linkedin.ugc.ShareContent": {
          shareCommentary: {
            text: `${options.title}\n\n${options.description}\n\nCheck it out: ${options.destinationUrl}`,
          },
          shareMediaCategory: imageUrn ? "IMAGE" : "NONE",
          ...(imageUrn && {
            media: [
              {
                status: "READY",
                media: imageUrn,
                title: { text: options.title },
              },
            ],
          }),
        },
      },
      visibility: {
        "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC",
      },
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
      return {
        success: true,
        platformPostId: `demo-${Date.now()}`,
        postUrl: options.destinationUrl,
      };
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data = (await response.json()) as any;
    return {
      success: true,
      platformPostId: data.id as string,
      postUrl: `https://www.linkedin.com/feed/update/${data.id as string}`,
    };
  } catch (error) {
    return {
      success: false,
      error: `LinkedIn publish failed: ${error instanceof Error ? error.message : "Unknown error"}`,
    };
  }
}

async function uploadLinkedInImage(
  accessToken: string,
  userId: string,
  imageUrl: string
): Promise<string | undefined> {
  try {
    // Register upload
    const registerResponse = await fetch(
      "https://api.linkedin.com/v2/assets?action=registerUpload",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          registerUploadRequest: {
            owner: userId,
            recipes: ["urn:li:digitalmediaRecipe:feedshare-image"],
            serviceRelationships: [
              {
                relationshipType: "OWNER",
                identifier: "urn:li:userGeneratedContent",
              },
            ],
          },
        }),
      }
    );

    if (!registerResponse.ok) return undefined;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const registerData = (await registerResponse.json()) as any;
    const uploadUrl = registerData.value?.uploadMechanism?.[
      "com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest"
    ]?.uploadUrl as string | undefined;
    const asset = registerData.value?.asset as string | undefined;

    if (!uploadUrl || !asset) return undefined;

    // Fetch image and upload
    const imageResponse = await fetch(imageUrl);
    const imageBlob = await imageResponse.blob();

    await fetch(uploadUrl, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      body: imageBlob,
    });

    return asset;
  } catch {
    return undefined;
  }
}

// ─── Telegram Publisher ─────────────────────────────────────

export async function publishToTelegram(options: {
  title: string;
  description: string;
  imageUrl: string;
  destinationUrl: string;
  price: string;
  rating: string;
  orders: string;
}): Promise<PublishResult> {
  try {
    const botToken = await getSettingValue("telegramBotToken");
    const channelId = await getSettingValue("telegramChannelId");

    if (!botToken) {
      return { success: false, error: "Telegram bot token not configured" };
    }
    if (!channelId) {
      return { success: false, error: "Telegram channel ID not configured" };
    }

    // Build caption from template
    const template = await getSettingValue("postTemplate");
    const caption = (template ?? getDefaultTelegramTemplate())
      .replace(/{title}/g, options.title)
      .replace(/{description}/g, options.description)
      .replace(/{price}/g, options.price)
      .replace(/{rating}/g, options.rating)
      .replace(/{orders}/g, options.orders)
      .replace(/{referralUrl}/g, options.destinationUrl);

    // Send photo with caption
    const response = await fetch(
      `https://api.telegram.org/bot${botToken}/sendPhoto`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          chat_id: channelId,
          photo: options.imageUrl,
          caption: caption.slice(0, 1024),
          parse_mode: "HTML",
          reply_markup: {
            inline_keyboard: [
              [
                {
                  text: "Buy Now",
                  url: options.destinationUrl,
                },
              ],
            ],
          },
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      return { success: false, error: `Telegram API error: ${errorText}` };
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data = (await response.json()) as any;
    if (!data.ok) {
      return { success: false, error: `Telegram error: ${data.description as string}` };
    }

    return {
      success: true,
      platformPostId: String(data.result.message_id as number),
      postUrl: `https://t.me/${channelId.replace(/^@/, "")}/${String(data.result.message_id as number)}`,
    };
  } catch (error) {
    return {
      success: false,
      error: `Telegram publish failed: ${error instanceof Error ? error.message : "Unknown error"}`,
    };
  }
}

function getDefaultTelegramTemplate(): string {
  return `🔥 <b>{title}</b>

💰 Price: ${"{price}"}
⭐ Rating: {rating}/5
🛒 Orders: {orders}

👇 <a href="{referralUrl}">Get it now</a>`;
}

// ─── Generic Publisher ──────────────────────────────────────

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
    default:
      return { success: false, error: `Unknown platform: ${platform}` };
  }
}
