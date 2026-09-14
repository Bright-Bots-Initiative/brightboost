import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import GameShell from "../shared/GameShell";
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

const GAME_KEY = "retry-test";
const RESULT = {
  gameKey: GAME_KEY,
  score: 7,
  total: 10,
  streakMax: 2,
  roundsCompleted: 4,
};

/**
 * #877 — after this fix a reward failure answers 500 instead of a silent
 * 200, so the player must be able to retry the save without losing the
 * play. `ActivityPlayer.handleComplete` releases its double-submit latch in
 * its catch; this pins the shell's half of the contract: the results screen
 * keeps the result and its Finish control after a failed save, and pressing
 * Finish again submits the same result.
 */
describe("GameShell keeps the result for a retry after a failed save (#877)", () => {
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
    (api.getGamePersonalBests as ReturnType<typeof vi.fn>).mockResolvedValue(
      [],
    );
  });

  it("RETRY-1: Finish can be pressed again after the first save fails, with the same result", async () => {
    const user = userEvent.setup();
    // The player's handler rejects once (a 500 from the server), then succeeds.
    const onComplete = vi
      .fn<(r: typeof RESULT) => Promise<boolean>>()
      .mockRejectedValueOnce(new Error("Request failed: 500"))
      .mockResolvedValueOnce(true);

    render(
      <GameShell gameKey={GAME_KEY} title="Retry Test" onComplete={onComplete}>
        {({ onFinish }) => (
          <button type="button" onClick={() => onFinish(RESULT)}>
            finish game
          </button>
        )}
      </GameShell>,
    );

    await user.click(screen.getByRole("button", { name: "finish game" }));
    const finish = await screen.findByRole("button", { name: /finish/i });

    await user.click(finish);
    expect(onComplete).toHaveBeenCalledTimes(1);

    // The failed save did not unmount the results screen or drop the result.
    const again = await screen.findByRole("button", { name: /finish/i });
    await user.click(again);
    expect(onComplete).toHaveBeenCalledTimes(2);
    expect(onComplete.mock.calls[1][0]).toMatchObject(RESULT);
    expect(onComplete.mock.calls[1][0]).toEqual(onComplete.mock.calls[0][0]);
  });
});
