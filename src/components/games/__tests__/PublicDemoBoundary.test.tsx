/**
 * The public-demo boundary in the shared game chrome.
 *
 * `usePersonalBest` asks one question — "is there a `bb_access_token` in this
 * browser" — and fetches if the answer is yes. That is the right question for
 * a signed-in learner and the wrong one for a public page: a visitor can be
 * carrying a stale token from an earlier session, or a synthetic one, and the
 * homepage demo would then issue an authenticated request from a page nobody
 * signed in to. `publicDemo` states the answer instead of inferring it.
 *
 * Both directions are proved here, because a boundary that also removes
 * something from the real games is not a boundary, it is a regression:
 *   - `publicDemo` set, token present → no api call, no fetch, no "Best" chip;
 *   - default (authenticated) → the same token still produces the call.
 *
 * The third case is the other thing a public panel does that a game page never
 * does: it gets unmounted mid-run, when a visitor navigates away or replays.
 */
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import GameShell from "../shared/GameShell";
import TankTrekGame from "../TankTrekGame";
import { DEMO_CONFIG } from "../tankTrekDemo";
import { __resetPersonalBestCache } from "@/hooks/usePersonalBest";
import { api } from "@/services/api";

vi.mock("react-i18next", async () => {
  const { enMock } = await import("@/test/i18nMock");
  return enMock();
});

vi.mock("@/components/activities/ActivityHeader", () => ({
  default: ({ title }: { title: string }) => <div>{title}</div>,
}));

vi.mock("@/services/api", () => ({
  api: { getGamePersonalBests: vi.fn() },
}));

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

const GAME_KEY = "public-demo-boundary";

function renderShell(publicDemo: boolean) {
  return render(
    <GameShell
      gameKey={GAME_KEY}
      title="Boundary Test"
      onComplete={() => {}}
      publicDemo={publicDemo}
    >
      {() => <p>playing</p>}
    </GameShell>,
  );
}

let fetchSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  vi.clearAllMocks();
  scrollIntoView.mockClear();
  localStorage.clear();
  localStorage.setItem("user", JSON.stringify({ id: "synthetic-learner" }));
  __resetPersonalBestCache();
  personalBests.mockResolvedValue([
    { gameKey: GAME_KEY, bestScore: 41, bestStreak: 2, playCount: 3 },
  ]);
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

describe("GameShell publicDemo → usePersonalBest boundary", () => {
  it("reads no personal best on a public mount, even with a token present", async () => {
    localStorage.setItem("bb_access_token", "synthetic");
    renderShell(true);

    await screen.findByText("playing");
    await waitFor(() => expect(personalBests).not.toHaveBeenCalled());
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("still reads it for an ordinary authenticated game with the same token", async () => {
    localStorage.setItem("bb_access_token", "synthetic");
    renderShell(false);

    await waitFor(() => expect(personalBests).toHaveBeenCalledTimes(1));
  });

  it("shows no Best chip on a public mount even when the session cache is warm", async () => {
    // An authenticated game filled the cache earlier in this session.
    localStorage.setItem("bb_access_token", "synthetic");
    const authenticated = renderShell(false);
    await waitFor(() => expect(personalBests).toHaveBeenCalledTimes(1));
    authenticated.unmount();

    personalBests.mockClear();
    renderShell(true);
    await screen.findByText("playing");
    expect(personalBests).not.toHaveBeenCalled();
    expect(screen.queryByText(/^Best:/)).toBeNull();
  });

  /**
   * A panel inside a longer page may not take the keyboard when the page
   * loads: a visitor who presses Tab expects the header, not the middle of a
   * game. Once they have started, focus follows the phase exactly as it does
   * for a signed-in player.
   */
  it("takes no focus on a public mount, and takes it once the player starts", async () => {
    render(
      <GameShell
        gameKey={GAME_KEY}
        title="Boundary Test"
        briefing={{ title: "Mission", story: "Story", icon: "🤖" }}
        onComplete={() => {}}
        publicDemo
      >
        {() => <p>playing</p>}
      </GameShell>,
    );

    const start = await screen.findByRole("button", {
      name: /start mission/i,
    });
    expect(start).not.toHaveFocus();
    expect(document.body).toHaveFocus();

    fireEvent.click(start);
    await screen.findByText("playing");
    expect(screen.getByRole("region", { name: /game area/i })).toHaveFocus();
    // The briefing fits the fold; the board and the command row below it do
    // not. One scroll, minimal, instant — and only on the public mount.
    expect(scrollIntoView).toHaveBeenCalledTimes(1);
    expect(scrollIntoView).toHaveBeenCalledWith({
      block: "nearest",
      behavior: "auto",
    });
  });

  it("still focuses the start button for an ordinary game", async () => {
    render(
      <GameShell
        gameKey={GAME_KEY}
        title="Boundary Test"
        briefing={{ title: "Mission", story: "Story", icon: "🤖" }}
        onComplete={() => {}}
      >
        {() => <p>playing</p>}
      </GameShell>,
    );

    const start = await screen.findByRole("button", {
      name: /start mission/i,
    });
    await waitFor(() => expect(start).toHaveFocus());

    // An authenticated game IS its page: the browser's own focus-driven
    // scroll is what it has always had, and nothing scrolls it for it.
    fireEvent.click(start);
    await screen.findByText("playing");
    expect(scrollIntoView).not.toHaveBeenCalled();
  });

  it("asks nothing when there is no token either", async () => {
    renderShell(true);
    await screen.findByText("playing");
    expect(personalBests).not.toHaveBeenCalled();
  });
});

/**
 * Tank Trek's run loop is a chain of awaited timeouts that each set state.
 * Nothing used to cancel it, so an unmount in the middle of a run left the
 * remaining steps queued — the homepage panel unmounts exactly there when a
 * visitor leaves the page or presses Play again. The property is the timer
 * queue itself: after the step that is already in flight resolves, the loop
 * must schedule nothing more.
 */
describe("Tank Trek stops running when it is unmounted", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // `fireEvent`, not `userEvent`: user-event's own delays do not mix with a
  // fake clock, and every click here is a plain click.
  it("queues no further steps once the panel is gone", async () => {
    const view = render(
      <TankTrekGame config={DEMO_CONFIG} onComplete={() => {}} publicDemo />,
    );

    fireEvent.click(screen.getByRole("button", { name: /start mission/i }));
    const forward = screen.getByRole("button", { name: /forward/i });
    // Three steps: enough that an unguarded loop would still have work queued
    // after the step already in flight finishes.
    fireEvent.click(forward);
    fireEvent.click(forward);
    fireEvent.click(forward);
    fireEvent.click(screen.getByRole("button", { name: /run/i }));

    // The run is now sitting on its first awaited timeout.
    expect(vi.getTimerCount()).toBeGreaterThan(0);

    view.unmount();
    // Just past the step in flight (200ms) and well short of the next one
    // (350ms): an unguarded loop schedules that next step here, a stopped one
    // schedules nothing. Advancing far enough to drain the whole run would
    // prove nothing — the queue empties either way once the level ends.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(250);
    });

    expect(vi.getTimerCount()).toBe(0);
  });
});
