import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import GameShell from "../shared/GameShell";
import {
  updatePersonalBestCache,
  __resetPersonalBestCache,
} from "@/hooks/usePersonalBest";
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

const GAME_KEY = "pb-claim-test";

/** No `briefing` → GameShell starts in the playing phase, so the test can go
 *  straight to the results screen where the "New Record!" claim lives. */
function renderShell(score: number) {
  return render(
    <GameShell gameKey={GAME_KEY} title="PB Claim Test" onComplete={() => {}}>
      {({ onFinish }) => (
        <button
          type="button"
          onClick={() =>
            onFinish({
              gameKey: GAME_KEY,
              score,
              total: 20,
              streakMax: 3,
              roundsCompleted: 5,
            })
          }
        >
          finish
        </button>
      )}
    </GameShell>,
  );
}

/**
 * #640 — the results screen may only claim a record the server actually kept.
 *
 * The session cache used to be written once at first mount and never
 * invalidated, so after a completion every later screen still compared against
 * the pre-play best: a replay that beat it claimed "New Record!" again and the
 * briefing chip kept showing the stale number.
 */
describe("GameShell personal-best claim (#640)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    __resetPersonalBestCache();
    localStorage.setItem("bb_access_token", "test-token");
    vi.stubGlobal(
      "matchMedia",
      vi.fn().mockReturnValue({
        matches: false,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      }),
    );
    (api.getGamePersonalBests as ReturnType<typeof vi.fn>).mockResolvedValue([
      { gameKey: GAME_KEY, bestScore: 10, bestStreak: 2, playCount: 1 },
    ]);
  });

  it("claims a record for a score above the persisted best, then stops claiming it once that best is persisted", async () => {
    const user = userEvent.setup();

    // Play 1 — 12 beats the persisted best of 10, so the claim is honest.
    const first = renderShell(12);
    await waitFor(() =>
      expect(api.getGamePersonalBests).toHaveBeenCalledTimes(1),
    );
    await user.click(screen.getByRole("button", { name: "finish" }));
    expect(await screen.findByText("New Record!")).toBeInTheDocument();

    // The completion POST resolves and the client adopts the persisted record.
    updatePersonalBestCache(GAME_KEY, {
      bestScore: 12,
      bestStreak: 3,
      playCount: 2,
    });
    first.unmount();

    // Play 2 — same 12. It is no longer a record, and the screen must say so.
    const second = renderShell(12);
    await user.click(screen.getByRole("button", { name: "finish" }));
    await waitFor(() =>
      expect(second.container.textContent).toContain("Personal Best: 12"),
    );
    expect(second.container.textContent).not.toContain("New Record!");

    // Served from the synced cache — no refetch was needed to tell the truth.
    expect(api.getGamePersonalBests).toHaveBeenCalledTimes(1);
  });

  it("still claims a record when the replay genuinely beats the persisted best", async () => {
    const user = userEvent.setup();

    const first = renderShell(12);
    await waitFor(() =>
      expect(api.getGamePersonalBests).toHaveBeenCalledTimes(1),
    );
    await user.click(screen.getByRole("button", { name: "finish" }));
    expect(await screen.findByText("New Record!")).toBeInTheDocument();

    updatePersonalBestCache(GAME_KEY, {
      bestScore: 12,
      bestStreak: 3,
      playCount: 2,
    });
    first.unmount();

    const second = renderShell(15);
    await user.click(screen.getByRole("button", { name: "finish" }));
    expect(await screen.findByText("New Record!")).toBeInTheDocument();
  });
});
