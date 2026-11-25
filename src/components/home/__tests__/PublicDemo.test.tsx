import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { MemoryRouter } from "react-router-dom";
import PublicDemo, { type LoadGame } from "../PublicDemo";
import type { GameResult } from "@/components/games/shared/GameShell";
import { readDemoBest, writeDemoBest } from "@/components/games/tankTrekDemo";
import { track } from "@/lib/analytics";
import { api } from "@/services/api";
import { __resetPersonalBestCache } from "@/hooks/usePersonalBest";

vi.mock("react-i18next", async () => {
  const { enMock } = await import("@/test/i18nMock");
  return enMock();
});

// The real UI and world still run in jsdom; only the canvas paint surface is missing.
vi.mock("@/components/games/qubitCove/scene", () => ({
  createCoveRenderer: () => ({ draw: () => {} }),
}));
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

describe("PublicDemo with the shipped games", () => {
  it("loads a single playable Qubit Cove by default after the initial loading state", async () => {
    const user = userEvent.setup();
    renderPanel();
    expect(screen.getByText("Loading the game…")).toBeInTheDocument();
    expect(
      await screen.findByRole("heading", { name: "Qubit Cove" }),
    ).toBeVisible();
    expect(
      screen.getAllByRole("img", { name: "Qubit Cove island playground" }),
    ).toHaveLength(1);
    expect(screen.getByRole("button", { name: "Jump" })).toBeVisible();
    expect(screen.queryByText("Loading the game…")).toBeNull();
    expect(screen.queryByRole("button", { name: /start mission/i })).toBeNull();
    expect(trackMock).not.toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: "Island map" }));
    expect(
      screen.getByRole("button", { name: /ride to zero garden/i }),
    ).toBeVisible();
    expect(trackMock).not.toHaveBeenCalledWith(
      expect.objectContaining({ kind: "demo_page_viewed" }),
    );
  });

  it("ignores a swipe and neutral clicks, and counts a press on a movement control once", async () => {
    renderPanel();
    const canvas = await screen.findByRole("img", {
      name: "Qubit Cove island playground",
    });
    const jump = screen.getByRole("button", { name: "Jump" });
    jump.setPointerCapture = vi.fn();
    const touch = (target: Element, type: string) =>
      fireEvent(
        target,
        Object.assign(
          new MouseEvent(type, { bubbles: true, cancelable: true, button: 0 }),
          { pointerId: 4, pointerType: "touch", isPrimary: true },
        ),
      );
    touch(canvas, "pointerdown");
    touch(canvas, "pointermove");
    touch(canvas, "pointercancel");
    fireEvent.click(canvas);
    fireEvent.click(screen.getByRole("heading", { name: "Qubit Cove" }));
    expect(trackMock).not.toHaveBeenCalled();
    touch(jump.querySelector("svg")!, "pointerdown");
    expect(trackMock.mock.calls).toEqual([
      [{ kind: "demo_game_started", game_id: "qubit_cove_demo" }],
    ]);
    touch(jump, "pointerup");
    fireEvent.click(jump);
    expect(trackMock).toHaveBeenCalledTimes(1);
  });

  it("switches to the grade 3–5 Tank Trek and back without stacking games or carrying a start event", async () => {
    const user = userEvent.setup();
    const onBandChange = vi.fn();
    renderPanel({ onBandChange });
    const cove = await screen.findByRole("img", {
      name: "Qubit Cove island playground",
    });
    cove.focus();
    fireEvent.keyDown(cove, { code: "ArrowRight", key: "ArrowRight" });
    fireEvent.keyUp(cove, { code: "ArrowRight", key: "ArrowRight" });
    expect(trackMock).toHaveBeenCalledWith({
      kind: "demo_game_started",
      game_id: "qubit_cove_demo",
    });
    await user.click(screen.getByRole("button", { name: /3–5/i }));
    const start = await screen.findByRole("button", { name: /start mission/i });
    expect(cove).not.toBeInTheDocument();
    expect(screen.queryByRole("region", { name: /game area/i })).toBeNull();
    fireEvent.keyDown(start, { code: "ArrowLeft", key: "ArrowLeft" });
    expect(trackMock).not.toHaveBeenCalledWith({
      kind: "demo_game_started",
      game_id: "tank_trek_demo",
    });
    await user.click(start);
    expect(screen.getAllByRole("region", { name: /game area/i })).toHaveLength(
      1,
    );
    expect(
      await screen.findByRole("button", { name: /forward/i }),
    ).toBeVisible();
    expect(scrollIntoView).toHaveBeenCalledTimes(1);
    expect(trackMock).toHaveBeenCalledWith({
      kind: "demo_game_started",
      game_id: "tank_trek_demo",
    });
    await user.click(screen.getByRole("button", { name: /K–2/i }));
    expect(
      await screen.findByRole("button", { name: "Island map" }),
    ).toBeVisible();
    expect(screen.queryByRole("region", { name: /game area/i })).toBeNull();
    expect(onBandChange.mock.calls).toEqual([["g3_5"], ["k2"]]);
  });

  it("makes no learner request for either selectable game even with a stored token", async () => {
    const user = userEvent.setup();
    localStorage.setItem("bb_access_token", "synthetic");
    renderPanel();
    await user.click(await screen.findByRole("button", { name: "Island map" }));
    await user.click(screen.getByRole("button", { name: /ride to one peak/i }));
    await user.click(screen.getByRole("button", { name: /3–5/i }));
    await user.click(
      await screen.findByRole("button", { name: /start mission/i }),
    );
    await screen.findByRole("button", { name: /forward/i });
    await waitFor(() => expect(personalBests).not.toHaveBeenCalled());
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(screen.queryByText(/best/i)).toBeNull();
  });
});

/* ── The panel's own states, on a stub module ─────────────────────────────── */

interface StubProps {
  onComplete?: (result: GameResult) => void;
  storageScope: string;
  embedded?: boolean;
  onReplay?: () => void;
}

const RESULT: GameResult = {
  gameKey: "qubit_cove",
  score: 3,
  total: 3,
  streakMax: 3,
  roundsCompleted: 3,
  starsEarned: 3,
};

/** Mount counter: "Play again" must REMOUNT the one instance, not add one. */
let mounts = 0;
let lastProps: StubProps | undefined;

function StubGame(props: StubProps) {
  lastProps = props;
  mounts += 1;
  return (
    <div role="region" aria-label="Qubit Cove game area">
      <button type="button" onClick={() => {}}>
        in-game control
      </button>
      <button type="button" onClick={props.onReplay}>
        replay inside the game
      </button>
      <button type="button" onClick={() => props.onComplete?.(RESULT)}>
        finish the run
      </button>
    </div>
  );
}

function stubLoader(): LoadGame {
  return () => Promise.resolve({ default: StubGame });
}

describe("PublicDemo panel states", () => {
  beforeEach(() => {
    mounts = 0;
    lastProps = undefined;
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

  it("embeds Qubit Cove with a dedicated guest scope", async () => {
    renderPanel({ loadGame: stubLoader() });
    await screen.findByRole("region", { name: /game area/i });
    expect(lastProps?.storageScope).toBe("homepage-demo");
    expect(lastProps?.embedded).toBe(true);
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
      game_id: "qubit_cove_demo",
    });

    await user.click(screen.getByRole("button", { name: "in-game control" }));
    expect(trackMock).toHaveBeenCalledTimes(1);
  });

  it("shows the lighthouse completion and keeps the Tank Trek best separate", async () => {
    const user = userEvent.setup();
    writeDemoBest(1);
    renderPanel({ loadGame: stubLoader() });
    await screen.findByRole("region", { name: /game area/i });

    await user.click(screen.getByRole("button", { name: "finish the run" }));

    expect(screen.getByText("The lighthouse is shining!")).toBeVisible();
    expect(screen.getByText("Beacons lit: 3 of 3")).toBeVisible();
    expect(readDemoBest()).toEqual({ stars: 1 });
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
    ).toHaveAttribute("href", "/try?game=qubit_cove");
    // Nothing on this card claims the stars were saved or that finishing
    // unlocks anything.
    expect(screen.queryByText(/sign up/i)).toBeNull();
    expect(screen.queryByText(/save your/i)).toBeNull();
    expect(screen.queryByText(/unlock/i)).toBeNull();

    expect(trackMock).toHaveBeenCalledWith(
      expect.objectContaining({
        kind: "demo_game_completed",
        game_id: "qubit_cove_demo",
        score: 3,
        stars: 3,
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
      game_id: "qubit_cove_demo",
    });
    await screen.findByRole("region", { name: /game area/i });
    // One more mount, and still exactly one game area on the page.
    expect(mounts).toBe(mountsBefore + 1);
    expect(screen.getAllByRole("region", { name: /game area/i })).toHaveLength(
      1,
    );
    expect(screen.queryByText("The lighthouse is shining!")).toBeNull();

    // The replay itself is not a start: that waits for the next interaction.
    trackMock.mockClear();
    await user.click(screen.getByRole("button", { name: "in-game control" }));
    expect(trackMock).toHaveBeenCalledTimes(1);
    expect(trackMock).toHaveBeenCalledWith({
      kind: "demo_game_started",
      game_id: "qubit_cove_demo",
    });
  });

  it("counts a native Qubit replay before Finish as a new play", async () => {
    const user = userEvent.setup();
    renderPanel({ loadGame: stubLoader() });
    await user.click(
      await screen.findByRole("button", { name: "in-game control" }),
    );
    await user.click(
      screen.getByRole("button", { name: "replay inside the game" }),
    );
    await user.click(screen.getByRole("button", { name: "in-game control" }));
    expect(trackMock.mock.calls.map(([e]) => e.kind)).toEqual([
      "demo_game_started",
      "demo_replayed",
      "demo_game_started",
    ]);
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
    ).toHaveAttribute("href", "/try?game=qubit_cove");

    await user.click(within(panel).getByRole("button", { name: "Try again" }));

    expect(
      await screen.findByRole("region", { name: /game area/i }),
    ).toBeInTheDocument();
    expect(calls).toBe(2);
    expect(trackMock).not.toHaveBeenCalled();
    consoleError.mockRestore();
  });
});
