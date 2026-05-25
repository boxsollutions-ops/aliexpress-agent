import { z } from "zod";
import { createRouter, publicQuery } from "./middleware";
import {
  findAllSettings,
  findSettingByKey,
  upsertSetting,
  getSettingValue,
  getSettingJson,
  initializeDefaultSettings,
} from "./queries/settings";

export const settingsRouter = createRouter({
  list: publicQuery.query(async () => {
    await initializeDefaultSettings();
    return findAllSettings();
  }),

  getByKey: publicQuery
    .input(z.object({ key: z.string() }))
    .query(async ({ input }) => {
      return findSettingByKey(input.key);
    }),

  getValue: publicQuery
    .input(z.object({ key: z.string() }))
    .query(async ({ input }) => {
      const value = await getSettingValue(input.key);
      return { key: input.key, value };
    }),

  getJson: publicQuery
    .input(z.object({ key: z.string() }))
    .query(async ({ input }) => {
      const value = await getSettingJson(input.key);
      return { key: input.key, value };
    }),

  update: publicQuery
    .input(
      z.object({
        key: z.string(),
        value: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      await upsertSetting(input.key, input.value);
      return { success: true };
    }),

  upsert: publicQuery
    .input(
      z.object({
        key: z.string(),
        value: z.string(),
        description: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      await upsertSetting(input.key, input.value, input.description);
      return { success: true };
    }),

  updateBulk: publicQuery
    .input(
      z.array(
        z.object({
          key: z.string(),
          value: z.string(),
        })
      )
    )
    .mutation(async ({ input }) => {
      for (const item of input) {
        await upsertSetting(item.key, item.value);
      }
      return { success: true };
    }),

  initialize: publicQuery.mutation(async () => {
    await initializeDefaultSettings();
    return { success: true };
  }),

  connectionStatus: publicQuery.query(async () => {
    await initializeDefaultSettings();
    const pinterestToken = await getSettingValue("pinterestAccessToken");
    const pinterestBoard = await getSettingValue("pinterestBoardId");
    const linkedinToken = await getSettingValue("linkedinAccessToken");
    const linkedinUser = await getSettingValue("linkedinUserId");
    const telegramToken = await getSettingValue("telegramBotToken");
    const telegramChannel = await getSettingValue("telegramChannelId");
    const referralUrl = await getSettingValue("referralBaseUrl");
    const amazonReferralUrl = await getSettingValue("amazonReferralUrl");

    return {
      pinterest: {
        connected: !!(pinterestToken && pinterestBoard),
        hasToken: !!pinterestToken,
        hasBoard: !!pinterestBoard,
      },
      linkedin: {
        connected: !!(linkedinToken && linkedinUser),
        hasToken: !!linkedinToken,
        hasUser: !!linkedinUser,
      },
      telegram: {
        connected: !!(telegramToken && telegramChannel),
        hasToken: !!telegramToken,
        hasChannel: !!telegramChannel,
      },
      referral: {
        configured: !!referralUrl,
        url: referralUrl,
      },
      amazonReferral: {
        configured: !!amazonReferralUrl,
        url: amazonReferralUrl,
      },
    };
  }),
});