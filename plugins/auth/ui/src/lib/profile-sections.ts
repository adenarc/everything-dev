import type { RouterContext } from "@/context";
import {
  type ProfileSectionConfig,
  type ProfileSectionContent,
  profileConfigSchema,
  profileSectionContentSchema,
} from "../../../src/profile-config";

export type { ProfileSectionConfig, ProfileSectionContent };

export function readProfileSections(
  runtimeConfig: RouterContext["runtimeConfig"],
): ProfileSectionConfig[] {
  const parsed = profileConfigSchema.safeParse(runtimeConfig?.auth?.variables?.profile);
  return parsed.success ? (parsed.data.sections ?? []) : [];
}

export async function fetchProfileSection(url: string): Promise<ProfileSectionContent> {
  const response = await fetch(url, {
    credentials: "same-origin",
    headers: { accept: "application/json" },
  });
  if (!response.ok) throw new Error(`Profile section request failed (${response.status})`);
  const parsed = profileSectionContentSchema.safeParse(await response.json());
  if (!parsed.success) throw new Error("Profile section response is invalid");
  return parsed.data;
}
