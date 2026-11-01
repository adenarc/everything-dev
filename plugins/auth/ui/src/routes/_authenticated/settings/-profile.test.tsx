// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ProfileSettings } from "./-components/profile-settings";

const harness = vi.hoisted(() => ({
  session: null as {
    user: { id: string; name: string; email: string; locale?: string | null };
  } | null,
  updateUser: vi.fn(),
  getSession: vi.fn(),
  success: vi.fn(),
  error: vi.fn(),
}));

vi.mock("everything-dev/ui/auth", () => ({
  sessionQueryKey: ["session"],
  sessionQueryOptions: (auth: { getSession: typeof harness.getSession }) => ({
    queryKey: ["session"],
    queryFn: async () => {
      const { data } = await auth.getSession();
      return data;
    },
    staleTime: 0,
  }),
  useAuthClient: () => ({
    getSession: harness.getSession,
    updateUser: harness.updateUser,
  }),
}));

vi.mock("@tanstack/react-router", () => ({
  Link: (props: Record<string, unknown>) => <a {...props} />,
}));

vi.mock("sonner", () => ({
  toast: { success: harness.success, error: harness.error },
}));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("profile settings", () => {
  it("refreshes the authoritative session after changing the display name", async () => {
    const oldSession = {
      user: { id: "user-1", name: "Old name", email: "person@example.com" },
    };
    const freshSession = {
      user: { id: "user-1", name: "New name", email: "person@example.com" },
    };
    harness.session = oldSession;
    harness.getSession.mockImplementation(async () => ({ data: harness.session, error: null }));
    harness.updateUser.mockImplementation(async ({ name }: { name: string }) => {
      harness.session = { ...freshSession, user: { ...freshSession.user, name } };
      return { data: null, error: null };
    });
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

    render(
      <QueryClientProvider client={queryClient}>
        <ProfileSettings />
      </QueryClientProvider>,
    );

    const nameInput = await screen.findByPlaceholderText("Your display name");
    fireEvent.change(nameInput, { target: { value: "New name" } });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => expect(harness.updateUser).toHaveBeenCalledWith({ name: "New name" }));
    await waitFor(() => expect(queryClient.getQueryData(["session"])).toEqual(freshSession));
    expect(harness.success).toHaveBeenCalledWith("Profile updated");
  });

  it("saves the selected language to the user profile", async () => {
    harness.session = {
      user: {
        id: "user-1",
        name: "Tester",
        email: "person@example.com",
        locale: "en",
      },
    };
    harness.getSession.mockImplementation(async () => ({ data: harness.session, error: null }));
    harness.updateUser.mockImplementation(async ({ locale }: { locale: string }) => {
      if (harness.session) {
        harness.session = {
          ...harness.session,
          user: { ...harness.session.user, locale },
        };
      }
      return { data: null, error: null };
    });
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

    render(
      <QueryClientProvider client={queryClient}>
        <ProfileSettings />
      </QueryClientProvider>,
    );

    const selector = await screen.findByTestId("settings.language-select");
    fireEvent.change(selector, { target: { value: "fr" } });

    await waitFor(() => expect(harness.updateUser).toHaveBeenCalledWith({ locale: "fr" }));
    await waitFor(() => expect(harness.success).toHaveBeenCalledWith("Language updated"));
  });
});

describe("profile sections from the child app", () => {
  const fetchMock = vi.fn();

  function renderWithSections(sections: Parameters<typeof ProfileSettings>[0]["sections"]) {
    harness.session = { user: { id: "user-1", name: "Tester", email: "person@example.com" } };
    harness.getSession.mockImplementation(async () => ({ data: harness.session, error: null }));
    vi.stubGlobal("fetch", fetchMock);
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={queryClient}>
        <ProfileSettings sections={sections} />
      </QueryClientProvider>,
    );
  }

  function respond(body: unknown, status = 200) {
    return Promise.resolve(new Response(JSON.stringify(body), { status }));
  }

  afterEach(() => {
    fetchMock.mockReset();
    vi.unstubAllGlobals();
  });

  it("renders a section's items, link and incomplete note below the profile fields", async () => {
    fetchMock.mockImplementation(() =>
      respond({
        items: [
          {
            title: "Builder night",
            description: "Lisbon",
            meta: "Oct 12",
            href: "/n/lisbon",
          },
          { title: "Demo day" },
        ],
        incomplete: "Some events may be missing.",
        link: { href: "/dashboard", label: "See all" },
      }),
    );

    renderWithSections([
      {
        id: "attendance",
        title: "Events you attended",
        description: "Across your communities",
        url: "/api/attendance",
      },
    ]);

    const section = await screen.findByTestId("settings.profile-section.attendance");
    expect(await screen.findByText("Builder night")).toBeTruthy();
    expect(screen.getByText("Lisbon")).toBeTruthy();
    expect(screen.getByText("Oct 12")).toBeTruthy();
    expect(screen.getByText("Demo day")).toBeTruthy();
    expect(screen.getByText("Builder night").closest("a")?.getAttribute("to")).toBe("/n/lisbon");
    expect(screen.getByText("Demo day").closest("a")).toBeNull();
    expect(screen.getByTestId("settings.profile-section-incomplete").textContent).toBe(
      "Some events may be missing.",
    );
    expect(screen.getByText("See all").closest("a")?.getAttribute("to")).toBe("/dashboard");
    expect(screen.getByText("Events you attended")).toBeTruthy();
    expect(
      screen.getByTestId("settings.profile-heading").compareDocumentPosition(section) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/attendance",
      expect.objectContaining({ credentials: "same-origin" }),
    );
  });

  it("keeps the page working when one section fails, and retries it", async () => {
    let attendanceCalls = 0;
    fetchMock.mockImplementation((url: string) => {
      if (url === "/api/attendance") {
        attendanceCalls += 1;
        return attendanceCalls === 1 ? respond({}, 500) : respond({ items: [{ title: "Back" }] });
      }
      return respond({ items: [{ title: "Badge" }] });
    });

    renderWithSections([
      { id: "attendance", title: "Events", url: "/api/attendance" },
      { id: "badges", title: "Badges", url: "/api/badges" },
    ]);

    expect(await screen.findByTestId("settings.profile-section-error")).toBeTruthy();
    expect(screen.getByText("Couldn't load Events")).toBeTruthy();
    expect(await screen.findByText("Badge")).toBeTruthy();
    expect(screen.getByTestId("settings.display-name-input")).toBeTruthy();

    fireEvent.click(screen.getByTestId("settings.profile-section-retry"));

    expect(await screen.findByText("Back")).toBeTruthy();
    expect(screen.queryByTestId("settings.profile-section-error")).toBeNull();
  });

  it("treats a response that doesn't match the contract as an error", async () => {
    fetchMock.mockImplementation(() =>
      respond({ items: [{ title: "Bad", href: "javascript:alert(1)" }] }),
    );

    renderWithSections([{ id: "attendance", title: "Events", url: "/api/attendance" }]);

    expect(await screen.findByTestId("settings.profile-section-error")).toBeTruthy();
    expect(screen.queryByText("Bad")).toBeNull();
  });

  it("shows the section's empty text, or a default", async () => {
    fetchMock.mockImplementation((url: string) =>
      respond(url === "/api/a" ? { items: [], empty: "No check-ins yet." } : { items: [] }),
    );

    renderWithSections([
      { id: "a", title: "A", url: "/api/a" },
      { id: "b", title: "B", url: "/api/b" },
    ]);

    expect(await screen.findByText("No check-ins yet.")).toBeTruthy();
    expect(await screen.findByText("Nothing here yet.")).toBeTruthy();
  });

  it("requests nothing when no sections are configured", async () => {
    renderWithSections([]);

    expect(await screen.findByTestId("settings.profile-heading")).toBeTruthy();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
