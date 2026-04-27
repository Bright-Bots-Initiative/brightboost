import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it, beforeEach, vi } from "vitest";
import BrightRallyCoopQuest, {
  applyRallyUpgradeConfig,
  buildBrightRallyResult,
  buildRallyUpgrades,
  calculateRallyScore,
  getCpuHelperDirection,
  getDifficultySettings,
  shouldUseCpuHelper,
} from "../BrightRallyCoopQuest";
import PlayHub from "../PlayHub";
import { api } from "@/services/api";

vi.mock("@/services/api", () => ({
  api: {
    getAvatar: vi.fn(),
    getProgress: vi.fn(),
  },
}));

vi.mock("../SpacewarArena", () => ({
  default: () => <div>Spacewar mock</div>,
}));

describe("BrightRallyCoopQuest", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.stubGlobal("matchMedia", vi.fn().mockReturnValue({
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }));
    (api.getAvatar as any).mockResolvedValue({ archetype: "explorer" });
    (api.getProgress as any).mockResolvedValue([
      { activityId: "bounce-buds", status: "COMPLETED" },
      { activityId: "gotcha-gears", status: "COMPLETED" },
      { activityId: "rhyme-ride", status: "COMPLETED" },
    ]);
  });

  it("calculates rally score deterministically", () => {
    expect(
      calculateRallyScore({
        rallyCount: 12,
        bestStreak: 6,
        teamBoosts: 2,
        rhythmBonusMultiplier: 1.15,
      }),
    ).toBe(235);
  });

  it("maps completed activity ids to upgrades", () => {
    const upgrades = buildRallyUpgrades([
      "bounce-buds",
      "quantum-quest",
      "something-else",
    ]);
    expect(upgrades.map((upgrade) => upgrade.key)).toEqual([
      "softBounce",
      "teamShield",
    ]);

    const config = applyRallyUpgradeConfig(upgrades);
    expect(config.paddleHeight).toBeGreaterThan(20);
    expect(config.shieldSaves).toBe(1);
    expect(config.cpuWakeDelayMs).toBeGreaterThanOrEqual(1400);
  });

  it("scales difficulty in a gradual deterministic curve", () => {
    expect(getDifficultySettings(0)).toEqual({ speedMultiplier: 1, paddleSpeed: 82, maxVerticalSpeed: 32 });
    expect(getDifficultySettings(6)).toEqual({ speedMultiplier: 1.03, paddleSpeed: 84, maxVerticalSpeed: 34 });
    expect(getDifficultySettings(11)).toEqual({ speedMultiplier: 1.08, paddleSpeed: 86, maxVerticalSpeed: 36 });
    expect(getDifficultySettings(16)).toEqual({ speedMultiplier: 1.15, paddleSpeed: 90, maxVerticalSpeed: 38 });
  });

  it("uses cpu helper fallback only after inactivity while ball moves right", () => {
    expect(shouldUseCpuHelper({
      now: 4000,
      lastP2InputAt: 1000,
      p2InputActive: false,
      ballHeadingRight: true,
      cpuWakeDelayMs: 1800,
    })).toBe(true);

    expect(shouldUseCpuHelper({
      now: 2500,
      lastP2InputAt: 1000,
      p2InputActive: false,
      ballHeadingRight: true,
      cpuWakeDelayMs: 1800,
    })).toBe(false);

    expect(getCpuHelperDirection({ ballY: 60, paddleY: 50, ballX: 70 })).toBeGreaterThan(0);
    expect(getCpuHelperDirection({ ballY: 49.3, paddleY: 50, ballX: 70 })).toBe(0);
  });

  it("builds result payload shape", () => {
    const result = buildBrightRallyResult({
      rallyCount: 20,
      bestStreak: 9,
      teamBoosts: 3,
      livesRemaining: 2,
      upgrades: buildRallyUpgrades(["tank-trek"]),
    });

    expect(result).toMatchObject({
      rallyCount: 20,
      bestStreak: 9,
      teamBoosts: 3,
      livesRemaining: 2,
    });
    expect(Array.isArray(result.modulesUsed)).toBe(true);
  });

  it("renders intro and instructions", async () => {
    render(<BrightRallyCoopQuest />);

    expect(screen.getByRole("heading", { name: /bright rally: pickleball co-op quest/i })).toBeInTheDocument();
    expect(screen.getByText("How to play")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /start rally/i })).toBeInTheDocument();

    await waitFor(() => {
      expect(api.getProgress).toHaveBeenCalled();
    });

    const wrapper = screen.getByRole("region", { name: /bright rally co-op game/i });
    expect(wrapper).toHaveAttribute("data-reduced-effects", "false");
  });

  it("does not crash when progress or avatar fetch fails", async () => {
    (api.getAvatar as any).mockRejectedValue(new Error("avatar down"));
    (api.getProgress as any).mockRejectedValue(new Error("progress down"));

    render(<BrightRallyCoopQuest />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /start rally/i })).toBeInTheDocument();
    });
  });

  it("shows friendly unlock hint when no boost modules are completed", async () => {
    (api.getProgress as any).mockResolvedValue([]);
    render(<BrightRallyCoopQuest />);

    expect(await screen.findByText(/complete stem games to unlock boosts/i)).toBeInTheDocument();
  });

  it("prevents default keyboard scrolling controls while playing", async () => {
    render(<BrightRallyCoopQuest />);
    fireEvent.click(screen.getByRole("button", { name: /start rally/i }));

    const event = new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true, cancelable: true });
    window.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(true);
  });

  it("renders Bright Rally in PlayHub co-op tab", async () => {
    render(
      <MemoryRouter initialEntries={["/play?tab=coop"]}>
        <Routes>
          <Route path="/play" element={<PlayHub />} />
        </Routes>
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /bright rally: pickleball co-op quest/i })).toBeInTheDocument();
    });
  });
});
