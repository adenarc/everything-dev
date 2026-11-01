import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { readProfileSections } from "@/lib/profile-sections";
import { ProfileSettings } from "./-components/profile-settings";

export const Route = createFileRoute("/_authenticated/settings/profile")({
  component: ProfileRoute,
});

function ProfileRoute() {
  const { runtimeConfig } = Route.useRouteContext();
  const sections = useMemo(() => readProfileSections(runtimeConfig), [runtimeConfig]);
  return <ProfileSettings sections={sections} />;
}
