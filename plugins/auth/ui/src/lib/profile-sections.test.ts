import { describe, expect, it } from "vitest";
import { readProfileSections } from "./profile-sections";

const withProfile = (profile: unknown) =>
  ({ auth: { variables: { profile } } }) as unknown as Parameters<typeof readProfileSections>[0];

describe("readProfileSections", () => {
  it("returns the configured sections in order", () => {
    const sections = [
      { id: "attendance", title: "Events you attended", url: "/api/me/attendance" },
      { id: "badges", title: "Badges", description: "Earned at events", url: "/api/me/badges" },
    ];
    expect(readProfileSections(withProfile({ sections }))).toEqual(sections);
  });

  it("returns no sections when none are configured", () => {
    expect(readProfileSections(undefined)).toEqual([]);
    expect(readProfileSections(withProfile(undefined))).toEqual([]);
    expect(readProfileSections(withProfile({}))).toEqual([]);
  });

  it.each([
    ["an external url", [{ id: "a", title: "A", url: "https://example.com/a" }]],
    ["a protocol-relative url", [{ id: "a", title: "A", url: "//example.com/a" }]],
    ["a non-kebab id", [{ id: "Attendance", title: "A", url: "/a" }]],
    [
      "duplicate ids",
      [
        { id: "a", title: "A", url: "/a" },
        { id: "a", title: "B", url: "/b" },
      ],
    ],
    [
      "more than five sections",
      Array.from({ length: 6 }, (_, i) => ({ id: `s${i}`, title: "S", url: "/s" })),
    ],
  ])("ignores a config with %s", (_label, sections) => {
    expect(readProfileSections(withProfile({ sections }))).toEqual([]);
  });
});
