/**
 * /try public demo — isolation contract tests.
 *
 * The page's defining property: it renders for a fully anonymous visitor
 * with NO AuthProvider, NO api mocks, and NO fetch activity. If any of
 * these tests start needing an auth/api mock to pass, the demo's
 * zero-signup contract has been broken — fix the page, not the test.
 */
import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { MemoryRouter } from "react-router-dom";
import TryDemo from "../TryDemo";

// Resolve i18n keys against en/common.json so assertions match real text.
vi.mock("react-i18next", async () => {
  const { enMock } = await import("@/test/i18nMock");
  return enMock();
});

// Track analytics calls without a PostHog key.
const trackSpy = vi.hoisted(() => vi.fn());
vi.mock("@/lib/analytics", () => ({
  track: trackSpy,
}));

describe("TryDemo (public /try route)", () => {
  let fetchSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    trackSpy.mockClear();
    // Any fetch from the demo path is an isolation bug (PostHog is mocked
    // out via the analytics mock above, so nothing should call fetch).
    fetchSpy = vi.spyOn(globalThis, "fetch");
  });

  afterEach(() => {
    fetchSpy.mockRestore();
  });

  function renderTry() {
    return render(
      <MemoryRouter initialEntries={["/try"]}>
        <TryDemo />
      </MemoryRouter>,
    );
  }

  it("renders without an AuthProvider and without any fetch calls", () => {
    renderTry();
    // The game briefing (GameShell) is on screen — title appears in both
    // the ActivityHeader and the briefing card.
    expect(screen.getAllByText("Tank Trek").length).toBeGreaterThan(0);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("shows the no-signup tagline and a home link", () => {
    renderTry();
    expect(
      screen.getByText(/no signup needed/i),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /bright boost/i }),
    ).toHaveAttribute("href", "/");
  });

  it("fires demo_page_viewed on mount and nothing else", () => {
    renderTry();
    expect(trackSpy).toHaveBeenCalledWith({
      kind: "demo_page_viewed",
      source: "direct",
    });
    // No game_started yet — that needs a user interaction.
    expect(trackSpy).not.toHaveBeenCalledWith(
      expect.objectContaining({ kind: "demo_game_started" }),
    );
  });

  it("sets the shareable document title", () => {
    renderTry();
    expect(document.title).toMatch(/Try Bright Boost/);
  });

  it("offers a start affordance (GameShell briefing button)", () => {
    renderTry();
    // GameShell briefing renders the Start Mission button — the one-tap gate.
    expect(
      screen.getByRole("button", { name: /start mission/i }),
    ).toBeInTheDocument();
  });
});
