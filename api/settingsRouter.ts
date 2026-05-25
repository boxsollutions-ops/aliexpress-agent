import { z } from "zod";
import { createRouter, publicQuery } from "./middleware";
import { findAllSettings, getSettingValue, getSettingJson, setSettingValue, initializeDefaultSettings, getConnectionStatus } from "./queries/settings";

export const settingsRouter = createRouter({
  list: publicQuery.query(async () => { await initializeDefaultSettings(); return findAllSettings(); }),
  getValue: publicQuery.input(z.object({ key: z.string() })).query(async ({ input }) => { await initializeDefaultSettings(); return { key: input.key, value: await getSettingValue(input.key) }; }),
  set: publicQuery.input(z.object({ key: z.string().min(1), value: z.string() })).mutation(async ({ input }) => { await initializeDefaultSettings(); await setSettingValue(input.key, input.value); return { success: true }; }),
  connectionStatus: publicQuery.query(async () => { await initializeDefaultSettings(); return getConnectionStatus(); }),
});