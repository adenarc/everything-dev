import { z } from "zod";
import { appHrefSchema } from "./onboard-config";

export const MAX_PROFILE_SECTIONS = 5;
export const MAX_PROFILE_SECTION_ITEMS = 100;

const appPathSchema = appHrefSchema.refine((url) => url.startsWith("/"), "must be an app path");

export const profileSectionConfigSchema = z.object({
  id: z
    .string()
    .trim()
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "must be kebab-case"),
  title: z.string().trim().min(1),
  description: z.string().trim().min(1).optional(),
  url: appPathSchema,
});

export const profileConfigSchema = z.object({
  sections: z
    .array(profileSectionConfigSchema)
    .max(MAX_PROFILE_SECTIONS)
    .refine(
      (sections) => new Set(sections.map((section) => section.id)).size === sections.length,
      "section ids must be unique",
    )
    .optional(),
});

export const profileSectionContentSchema = z.object({
  items: z
    .array(
      z.object({
        title: z.string().trim().min(1),
        description: z.string().trim().min(1).optional(),
        meta: z.string().trim().min(1).optional(),
        href: appHrefSchema.optional(),
      }),
    )
    .max(MAX_PROFILE_SECTION_ITEMS),
  empty: z.string().trim().min(1).optional(),
  incomplete: z.string().trim().min(1).optional(),
  link: z.object({ href: appHrefSchema, label: z.string().trim().min(1) }).optional(),
});

export type ProfileConfig = z.infer<typeof profileConfigSchema>;
export type ProfileSectionConfig = z.infer<typeof profileSectionConfigSchema>;
export type ProfileSectionContent = z.infer<typeof profileSectionContentSchema>;
