/**
 * /try public demo — isolation contract tests.
 *
 * The page's defining property: it renders for a fully anonymous visitor
 * with NO AuthProvider, NO api mocks, and NO fetch activity. If any of
 * these tests start needing an auth/api mock to pass, the demo's
 * zero-signup contract has been broken — fix the page, not the test.
 */
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { MemoryRouter } from "react-router-dom";
import TryDemo, { readDemoBest, writeDemoBest } from "../TryDemo";

// jsdom does not implement Canvas 2D. The game logic and controls remain real.
vi.mock("@/components/games/qubitCove/scene", () => ({
  createCoveRenderer: () => ({ draw: () => {} }),
}));

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

  function renderTry(entry = "/try") {
    return render(
      <MemoryRouter initialEntries={[entry]}>
        <TryDemo />
      </MemoryRouter>,
    );
  }

  it("renders without an AuthProvider and without any fetch calls", async () => {
    renderTry();
    // The game briefing (GameShell) is on screen — title appears in both
    // the ActivityHeader and the briefing card.
    expect((await screen.findAllByText("Tank Trek")).length).toBeGreaterThan(0);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("keeps the grades 3–5 link and unknown game links on Tank Trek", async () => {
    const view = renderTry("/try?band=g3_5");
    expect((await screen.findAllByText("Tank Trek")).length).toBeGreaterThan(0);
    view.unmount();
    renderTry("/try?game=unknown");
    expect((await screen.findAllByText("Tank Trek")).length).toBeGreaterThan(0);
  });

  it("counts a movement press but ignores scrolling, background taps, and secondary clicks", async () => {
    renderTry("/try?game=qubit_cove");
    const heading = await screen.findByRole("heading", { name: "Qubit Cove" });
    const map = screen.getByRole("button", { name: "Island map" });
    const canvas = screen.getByRole("img", {
      name: "Qubit Cove island playground",
    });
    const move = screen.getByRole("button", { name: "Move left" });
    // jsdom has mouse events; give the dispatched pointer event a button and primary flag.
    function press(target: Element, button: number, primary = true) {
      const event = new MouseEvent("pointerdown", { bubbles: true, button });
      Object.defineProperty(event, "isPrimary", { value: primary });
      fireEvent(target, event);
    }
    move.setPointerCapture = vi.fn();
    press(canvas, 0);
    fireEvent.pointerCancel(canvas);
    fireEvent.click(canvas);
    fireEvent.click(heading);
    press(map, 0);
    fireEvent.pointerCancel(map);
    fireEvent.click(map, { button: 2 });
    press(move, 2);
    press(move, 0, false);
    expect(
      trackSpy.mock.calls.filter(
        ([event]) => event.kind === "demo_game_started",
      ),
    ).toHaveLength(0);
    press(move, 0);
    fireEvent.click(move);
    expect(
      trackSpy.mock.calls.filter(
        ([event]) => event.kind === "demo_game_started",
      ),
    ).toEqual([[{ kind: "demo_game_started", game_id: "qubit_cove_demo" }]]);
  });

  it("plays, completes and replays Qubit Cove as a guest without changing Tank Trek’s record", async () => {
    const existingBest = JSON.stringify({ stars: 1 });
    localStorage.setItem("bb_try_demo_best_v2", existingBest);
    localStorage.setItem("bb_access_token", "test-stale-token");
    try {
      renderTry("/try?game=qubit_cove");
      await screen.findByRole("heading", { name: "Qubit Cove" });
      expect(document.title).toContain("Qubit Cove");
      expect(screen.queryByText("Tank Trek")).toBeNull();
      const click = (name: string | RegExp) =>
        fireEvent.click(screen.getByRole("button", { name }));
      fireEvent.keyDown(document.body, { code: "ArrowLeft" });
      fireEvent.keyUp(document.body, { code: "ArrowLeft" });
      expect(trackSpy).toHaveBeenCalledWith({
        kind: "demo_game_started",
        game_id: "qubit_cove_demo",
      });
      for (const [name, answer, count] of [
        ["Zero Garden", "Only 0", 1],
        ["One Peak", "Only 1", 1],
        ["Chance Harbor", "0 or 1", 3],
      ] as const) {
        click("Island map");
        click(new RegExp(`Ride to ${name}`));
        click("Use beacon");
        for (let i = 0; i < count; i++) {
          click(i ? "Prepare a fresh qubit" : "Prepare qubit");
          click("Measure");
        }
        click(answer);
        click("Back to the cove");
      }
      click("Finish adventure");
      await screen.findByRole("link", { name: "For teachers and families" });
      expect(trackSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          kind: "demo_game_completed",
          game_id: "qubit_cove_demo",
          stars: 3,
        }),
      );
      expect(localStorage.getItem("bb_try_demo_best_v2")).toBe(existingBest);
      click("Play again");
      await screen.findByRole("heading", { name: "Qubit Cove" });
      expect(trackSpy).toHaveBeenCalledWith({
        kind: "demo_replayed",
        game_id: "qubit_cove_demo",
      });
      expect(
        screen.queryByRole("button", { name: "Finish adventure" }),
      ).toBeNull();
      expect(fetchSpy).not.toHaveBeenCalled();
    } finally {
      localStorage.removeItem("bb_try_demo_best_v2");
      localStorage.removeItem("bb_access_token");
    }
  });

  it("shows the no-signup tagline and a home link", () => {
    renderTry();
    expect(screen.getByText(/no signup needed/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /bright boost/i })).toHaveAttribute(
      "href",
      "/",
    );
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

  it("offers a start affordance (GameShell briefing button)", async () => {
    renderTry();
    // GameShell briefing renders the Start Mission button — the one-tap gate.
    expect(
      await screen.findByRole("button", { name: /start mission/i }),
    ).toBeInTheDocument();
  });
});

describe("demo-local best (versioned, anonymous, defensive)", () => {
  const KEY = "bb_try_demo_best_v2";

  beforeEach(() => {
    localStorage.removeItem(KEY);
  });

  it("ignores junk and out-of-range values instead of displaying them", () => {
    localStorage.setItem(KEY, "not json{");
    expect(readDemoBest()).toBeNull();
    localStorage.setItem(KEY, JSON.stringify({ stars: 55 })); // stale-era nonsense
    expect(readDemoBest()).toBeNull();
    localStorage.setItem(KEY, JSON.stringify({ stars: -1 }));
    expect(readDemoBest()).toBeNull();
    localStorage.setItem(KEY, JSON.stringify({ score: 55 })); // wrong shape
    expect(readDemoBest()).toBeNull();
  });

  it("only ever improves — a worse run never overwrites the best", () => {
    writeDemoBest(2);
    expect(readDemoBest()).toEqual({ stars: 2 });
    writeDemoBest(1);
    expect(readDemoBest()).toEqual({ stars: 2 });
    writeDemoBest(3);
    expect(readDemoBest()).toEqual({ stars: 3 });
  });

  it("old unversioned keys are simply invisible (version bump = clean slate)", () => {
    localStorage.setItem("bb_try_demo_best", JSON.stringify({ stars: 3 }));
    expect(readDemoBest()).toBeNull(); // v2 reader never touches v1 junk
  });
});
