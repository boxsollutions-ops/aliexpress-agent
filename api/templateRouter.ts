import { z } from "zod";
import { createRouter, publicQuery } from "./middleware";
import {
  findAllTemplates,
  findTemplatesByPlatform,
  findTemplateById,
  createTemplate,
  updateTemplate,
  deleteTemplate,
} from "./queries/postTemplates";

export const templateRouter = createRouter({
  list: publicQuery.query(async () => {
    return findAllTemplates();
  }),

  byPlatform: publicQuery
    .input(
      z.object({
        platform: z.enum(["pinterest", "linkedin", "telegram"]),
      })
    )
    .query(async ({ input }) => {
      return findTemplatesByPlatform(input.platform);
    }),

  byId: publicQuery
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      return findTemplateById(input.id);
    }),

  create: publicQuery
    .input(
      z.object({
        name: z.string().min(1),
        platform: z.enum(["pinterest", "linkedin", "telegram"]),
        template: z.string().min(1),
        isActive: z.boolean().optional(),
      })
    )
    .mutation(async ({ input }) => {
      return createTemplate({
        name: input.name,
        platform: input.platform,
        template: input.template,
        isActive: input.isActive ?? true,
      });
    }),

  update: publicQuery
    .input(
      z.object({
        id: z.number(),
        data: z.object({
          name: z.string().optional(),
          template: z.string().optional(),
          isActive: z.boolean().optional(),
        }),
      })
    )
    .mutation(async ({ input }) => {
      await updateTemplate(input.id, input.data);
      return { success: true };
    }),

  delete: publicQuery
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await deleteTemplate(input.id);
      return { success: true };
    }),
});
