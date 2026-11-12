/**
 * The homepage's playable panel.
 *
 * Two halves. The first mounts the REAL Tank Trek through the panel, because
 * the claim on the homepage is that this is the game and not a rendering of
 * one: the briefing has to be the game's briefing, exactly one game area may
 * exist, and an anonymous visitor's browser must produce no request even when
 * it is carrying a token. The second half swaps in a stub module so the
 * panel's own states — loading, failure, completion, replay — can be driven
 * without playing three mazes on a timer.
 */
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { MemoryRouter } from "react-router-dom";
import PublicDemo, { type LoadGame } from "../PublicDemo";
import type { GameResult } from "@/components/games/shared/GameShell";
import { track } from "@/lib/analytics";
import { api } from "@/services/api";
import { __resetPersonalBestCache } from "@/hooks/usePersonalBest";

vi.mock("react-i18next", async () => {
  const { enMock } = await import("@/test/i18nMock");
  return enMock();
});

vi.mock("@/lib/analytics", () => ({ track: vi.fn() }));

vi.mock("@/services/api", () => ({
  api: { getGamePersonalBests: vi.fn().mockResolvedValue([]) },
}));

const trackMock = vi.mocked(track);
const personalBests = vi.mocked(api.getGamePersonalBests);

/**
 * jsdom implements no `scrollIntoView`, so it is installed rather than spied
 * on. The public panel calls it exactly once, when play starts.
 */
const scrollIntoView = vi.fn();
Object.defineProperty(Element.prototype, "scrollIntoView", {
  value: scrollIntoView,
  writable: true,
  configurable: true,
});

function renderPanel(props: Parameters<typeof PublicDemo>[0] = {}) {
  return render(
    <MemoryRouter>
      <PublicDemo {...props} />
    </MemoryRouter>,
  );
}

let fetchSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  trackMock.mockClear();
  scrollIntoView.mockClear();
  personalBests.mockClear();
  localStorage.clear();
  __resetPersonalBestCache();
  fetchSpy = vi.spyOn(globalThis, "fetch");
  vi.stubGlobal(
    "matchMedia",
    vi.fn().mockReturnValue({
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
    }),
  );
});

afterEach(() => {
  fetchSpy.mockRestore();
  vi.unstubAllGlobals();
});

/* ── The real game, through the panel ─────────────────────────────────────── */

describe("PublicDemo with the shipped Tank Trek", () => {
  it("shows a loading state first, then the game's own briefing", async () => {
    renderPanel();
    expect(screen.getByText("Loading the game…")).toBeInTheDocument();

    expect(
      await screen.findByRole(
        "button",
        { name: /start mission/i },
        { timeout: 5000 },
      ),
    ).toBeInTheDocument();
    expect(screen.queryByText("Loading the game…")).toBeNull();
    // The briefing is the game's, not a retelling of it.
    expect(screen.getAllByText("Tank Trek").length).toBeGreaterThan(0);
    expect(screen.getByText(/Bolt needs YOUR help/i)).toBeInTheDocument();
  });

  it("mounts exactly one game area, and only after the player starts", async () => {
    const user = userEvent.setup();
    renderPanel();
    const start = await screen.findByRole(
      "button",
      { name: /start mission/i },
      { timeout: 5000 },
    );
    expect(
      screen.queryAllByRole("region", { name: /game area/i }),
    ).toHaveLength(0);

    await user.click(start);
    expect(screen.getAllByRole("region", { name: /game area/i })).toHaveLength(
      1,
    );
    // …and the page moves to it once, so the controls are not below the fold.
    expect(scrollIntoView).toHaveBeenCalledTimes(1);
    // The real controls, not a picture of them.
    expect(
      screen.getByRole("button", { name: /forward/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /run/i })).toBeInTheDocument();
  });

  /**
   * The boundary that matters on a public page: `usePersonalBest` fetches
   * whenever `bb_access_token` is present, and a visitor's browser can be
   * carrying a stale or synthetic one. The panel passes `publicDemo`, so the
   * question is never asked.
   */
  it("issues no request even with a token in localStorage", async () => {
    localStorage.setItem("bb_access_token", "synthetic");
    renderPanel();
    await screen.findByRole(
      "button",
      { name: /start mission/i },
      { timeout: 5000 },
    );
    await waitFor(() => expect(personalBests).not.toHaveBeenCalled());
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(screen.queryByText(/best/i)).toBeNull();
  });

  it("never fires the /try page view from the homepage panel", async () => {
    const user = userEvent.setup();
    renderPanel();
    const start = await screen.findByRole(
      "button",
      { name: /start mission/i },
      { timeout: 5000 },
    );
    await user.click(start);
    expect(trackMock).not.toHaveBeenCalledWith(
      expect.objectContaining({ kind: "demo_page_viewed" }),
    );
  });

  it("unmounts without leaving the game running", async () => {
    const user = userEvent.setup();
    const view = renderPanel();
    const start = await screen.findByRole(
      "button",
      { name: /start mission/i },
      { timeout: 5000 },
    );
    await user.click(start);
    await user.click(screen.getByRole("button", { name: /forward/i }));
    view.unmount();
    expect(document.body.querySelector(".bb-public-demo")).toBeNull();
  });
});

/* ── The panel's own states, on a stub module ─────────────────────────────── */

interface StubProps {
  onComplete?: (result: GameResult) => void;
  publicDemo?: boolean;
}

const RESULT: GameResult = {
  gameKey: "tank_trek",
  score: 7,
  total: 9,
  streakMax: 3,
  roundsCompleted: 3,
  starsEarned: 2,
};

/** Mount counter: "Play again" must REMOUNT the one instance, not add one. */
let mounts = 0;
let lastProps: StubProps = {};

function StubGame(props: StubProps) {
  lastProps = props;
  mounts += 1;
  return (
    <div role="region" aria-label="Tank Trek game area">
      <button type="button" onClick={() => {}}>
        in-game control
      </button>
      <button type="button" onClick={() => props.onComplete?.(RESULT)}>
        finish the run
      </button>
    </div>
  );
}

function stubLoader(): LoadGame {
  return () =>
    Promise.resolve({ default: StubGame } as unknown as Awaited<
      ReturnType<LoadGame>
    >);
}

describe("PublicDemo panel states", () => {
  beforeEach(() => {
    mounts = 0;
    lastProps = {};
  });

  /**
   * The homepage re-settles a legacy anchor on this signal, so it has to mean
   * exactly one thing: the game is on screen. Not the reserved box, not the
   * failure card, and not once per replay.
   */
  it("reports ready once, after the lazy game has rendered", async () => {
    const onReady = vi.fn();
    renderPanel({ loadGame: stubLoader(), onReady });
    expect(onReady).not.toHaveBeenCalled();

    await screen.findByRole("region", { name: /game area/i });
    expect(onReady).toHaveBeenCalledTimes(1);
  });

  /**
   * The reserved height exists for the wait. Holding it for the life of the
   * panel left the completion card floating in half a screen of empty box, so
   * `data-ready` releases it the moment the game is on screen.
   */
  it("holds the reserved box until the game is on screen, then releases it", async () => {
    renderPanel({ loadGame: stubLoader() });
    expect(screen.getByTestId("public-demo")).toHaveAttribute(
      "data-ready",
      "false",
    );

    await screen.findByRole("region", { name: /game area/i });
    expect(screen.getByTestId("public-demo")).toHaveAttribute(
      "data-ready",
      "true",
    );
  });

  it("keeps the reserved box when the game fails to load", async () => {
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});
    renderPanel({ loadGame: () => Promise.reject(new Error("chunk 404")) });

    await screen.findByText("The game did not load");
    expect(screen.getByTestId("public-demo")).toHaveAttribute(
      "data-ready",
      "false",
    );
    consoleError.mockRestore();
  });

  it("does not report ready again when the game is replayed", async () => {
    const user = userEvent.setup();
    const onReady = vi.fn();
    renderPanel({ loadGame: stubLoader(), onReady });
    await screen.findByRole("region", { name: /game area/i });
    await user.click(screen.getByRole("button", { name: "finish the run" }));
    await user.click(screen.getByRole("button", { name: "Play again" }));

    await screen.findByRole("region", { name: /game area/i });
    expect(onReady).toHaveBeenCalledTimes(1);
  });

  it("never reports ready when the game fails to load", async () => {
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});
    const onReady = vi.fn();
    renderPanel({
      loadGame: () => Promise.reject(new Error("chunk 404")),
      onReady,
    });

    await screen.findByText("The game did not load");
    expect(onReady).not.toHaveBeenCalled();
    consoleError.mockRestore();
  });

  it("passes publicDemo down to the game it mounts", async () => {
    renderPanel({ loadGame: stubLoader() });
    await screen.findByRole("region", { name: /game area/i });
    expect(lastProps.publicDemo).toBe(true);
  });

  it("fires demo_game_started once on the first interaction inside the game", async () => {
    const user = userEvent.setup();
    renderPanel({ loadGame: stubLoader() });
    await screen.findByRole("region", { name: /game area/i });
    expect(trackMock).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "in-game control" }));
    expect(trackMock).toHaveBeenCalledTimes(1);
    expect(trackMock).toHaveBeenCalledWith({
      kind: "demo_game_started",
      game_id: "tank_trek_demo",
    });

    await user.click(screen.getByRole("button", { name: "in-game control" }));
    expect(trackMock).toHaveBeenCalledTimes(1);
  });

  it("shows the completion card with the stars the run earned", async () => {
    const user = userEvent.setup();
    renderPanel({ loadGame: stubLoader() });
    await screen.findByRole("region", { name: /game area/i });

    await user.click(screen.getByRole("button", { name: "finish the run" }));

    expect(screen.getByText("You finished all three mazes!")).toBeVisible();
    expect(screen.getByTestId("demo-stars")).toHaveTextContent("2");
    expect(
      screen.getByRole("button", { name: "Play again" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "For teachers" })).toHaveAttribute(
      "href",
      "/for-teachers",
    );
    expect(screen.getByRole("link", { name: "For families" })).toHaveAttribute(
      "href",
      "/for-families",
    );
    expect(
      screen.getByRole("link", { name: "Open the full-screen demo" }),
    ).toHaveAttribute("href", "/try");
    // Nothing on this card claims the stars were saved or that finishing
    // unlocks anything.
    expect(screen.queryByText(/sign up/i)).toBeNull();
    expect(screen.queryByText(/save your/i)).toBeNull();
    expect(screen.queryByText(/unlock/i)).toBeNull();

    expect(trackMock).toHaveBeenCalledWith(
      expect.objectContaining({
        kind: "demo_game_completed",
        game_id: "tank_trek_demo",
        score: 7,
        stars: 2,
      }),
    );
  });

  it("fires the adult-path events from the completion card", async () => {
    const user = userEvent.setup();
    renderPanel({ loadGame: stubLoader() });
    await screen.findByRole("region", { name: /game area/i });
    await user.click(screen.getByRole("button", { name: "finish the run" }));

    trackMock.mockClear();
    await user.click(screen.getByRole("link", { name: "For teachers" }));
    expect(trackMock).toHaveBeenCalledWith({ kind: "teacher_page_clicked" });

    trackMock.mockClear();
    await user.click(screen.getByRole("link", { name: "For families" }));
    expect(trackMock).toHaveBeenCalledWith({ kind: "parent_page_clicked" });
  });

  it("remounts the one instance on Play again and fires demo_replayed once", async () => {
    const user = userEvent.setup();
    renderPanel({ loadGame: stubLoader() });
    await screen.findByRole("region", { name: /game area/i });
    await user.click(screen.getByRole("button", { name: "in-game control" }));
    await user.click(screen.getByRole("button", { name: "finish the run" }));
    const mountsBefore = mounts;

    trackMock.mockClear();
    await user.click(screen.getByRole("button", { name: "Play again" }));

    expect(trackMock).toHaveBeenCalledTimes(1);
    expect(trackMock).toHaveBeenCalledWith({
      kind: "demo_replayed",
      game_id: "tank_trek_demo",
    });
    await screen.findByRole("region", { name: /game area/i });
    // One more mount, and still exactly one game area on the page.
    expect(mounts).toBe(mountsBefore + 1);
    expect(screen.getAllByRole("region", { name: /game area/i })).toHaveLength(
      1,
    );
    expect(screen.queryByText("You finished all three mazes!")).toBeNull();

    // The replay itself is not a start: that waits for the next interaction.
    trackMock.mockClear();
    await user.click(screen.getByRole("button", { name: "in-game control" }));
    expect(trackMock).toHaveBeenCalledTimes(1);
    expect(trackMock).toHaveBeenCalledWith({
      kind: "demo_game_started",
      game_id: "tank_trek_demo",
    });
  });

  it("offers a retry and a way out when the game chunk fails, and re-imports on retry", async () => {
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});
    const user = userEvent.setup();
    let calls = 0;
    const loadGame: LoadGame = () => {
      calls += 1;
      return calls === 1
        ? Promise.reject(new Error("chunk 404"))
        : (Promise.resolve({ default: StubGame }) as ReturnType<LoadGame>);
    };

    renderPanel({ loadGame });

    const failure = await screen.findByText("The game did not load");
    const panel = failure.closest(".bb-public-demo") as HTMLElement;
    // The failure is ours, said as ours — and it is not a lost game.
    expect(
      within(panel).getByText(/Something went wrong on our side/i),
    ).toBeInTheDocument();
    expect(
      within(panel).getByRole("link", { name: /full-screen demo/i }),
    ).toHaveAttribute("href", "/try");

    await user.click(within(panel).getByRole("button", { name: "Try again" }));

    expect(
      await screen.findByRole("region", { name: /game area/i }),
    ).toBeInTheDocument();
    expect(calls).toBe(2);
    consoleError.mockRestore();
  });
});
