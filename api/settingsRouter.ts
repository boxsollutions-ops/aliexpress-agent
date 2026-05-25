import { z } from "zod";
import { createRouter, publicQuery } from "./middleware";
import {
  findAllSettings,
  getSettingValue,
  getSettingJson,
  setSettingValue,
  getConnectionStatus,
} from "./queries/settings";

export const settingsRouter = createRouter({
  list: publicQuery.query(async () => {
    return findAllSettings();
  }),

  getByKey: publicQuery
    .input(z.object({ key: z.string() }))
    .query(async ({ input }) => {
      const all = await findAllSettings();
      return all.find((s) => s.key === input.key);
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

  set: publicQuery
    .input(z.object({ key: z.string().min(1), value: z.string() }))
    .mutation(async ({ input }) => {
      await setSettingValue(input.key, input.value);
      return { success: true };
    }),

  initialize: publicQuery.mutation(async () => {
    const { initializeDefaultSettings } = await import("./queries/settings");
    await initializeDefaultSettings();
    return { success: true };
  }),

  connectionStatus: publicQuery.query(async () => {
    return getConnectionStatus();
  }),
});
