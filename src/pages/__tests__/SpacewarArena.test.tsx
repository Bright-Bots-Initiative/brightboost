import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import SpacewarArena from "../SpacewarArena";
import {
  SPACEWAR_BEST_RECAP_KEY,
  buildSpacewarMatchRecap,
  buildSpacewarUpgrades,
  persistBestSpacewarRecap,
  readBestSpacewarRecap,
} from "../spacewarMeta";
import { api } from "@/services/api";

vi.mock("@/services/api", () => ({
  api: {
    getAvatar: vi.fn(),
    getProgress: vi.fn(),
  },
}));

vi.mock("../../components/unity/UnityWebGL", () => ({
  default: ({ onInstanceReady }: any) => {
    onInstanceReady?.({ SendMessage: vi.fn() });
    return <div data-testid="unity-webgl">Unity game</div>;
  },
}));

describe("SpacewarArena", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    localStorage.clear();
    vi.stubGlobal("matchMedia", vi.fn().mockReturnValue({
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }));
    (api.getAvatar as any).mockResolvedValue({ archetype: "explorer", level: 2, xp: 50 });
    (api.getProgress as any).mockResolvedValue([
      { activityId: "bounce-buds", status: "COMPLETED" },
      { activityId: "gotcha-gears", status: "COMPLETED" },
      { activityId: "other", status: "COMPLETED" },
    ]);
  });

  it("maps completed activity ids to STEM ship upgrades", () => {
    const upgrades = buildSpacewarUpgrades(["bounce-buds", "tank-trek", "nope"]);
    expect(upgrades.map((upgrade) => upgrade.key)).toEqual([
      "gravityControl",
      "navigationAssist",
    ]);
  });

  it("builds a deterministic Spacewar recap payload", () => {
    const recap = buildSpacewarMatchRecap({
      winner: 1,
      player1Score: 5,
      player2Score: 1,
      difficulty: "normal",
      activeUpgradeIds: ["bounce-buds"],
      timestamp: "2026-04-28T00:00:00.000Z",
    });

    expect(recap).toMatchObject({
      winnerLabel: "Player 1",
      strategyLabel: "Sharp Shooter",
      scoreMargin: 4,
      difficulty: "normal",
      activeUpgradeIds: ["bounce-buds"],
    });
  });

  it("stores and reads local session best recap safely", () => {
    const recap = buildSpacewarMatchRecap({
      winner: 1,
      player1Score: 4,
      player2Score: 2,
      difficulty: "easy",
      activeUpgradeIds: [],
      timestamp: "2026-04-28T01:00:00.000Z",
    });

    persistBestSpacewarRecap(recap);
    const best = readBestSpacewarRecap();

    expect(best).toMatchObject({ player1Score: 4, scoreMargin: 2 });
    expect(localStorage.getItem(SPACEWAR_BEST_RECAP_KEY)).toBeTruthy();
  });

  it("renders mission card and updates recap UI from unityMatchOver event", async () => {
    render(<SpacewarArena />);

    expect(await screen.findByRole("region", { name: /duel mission card/i })).toBeInTheDocument();
    expect(screen.getByText(/gravity control/i)).toBeInTheDocument();

    window.dispatchEvent(new CustomEvent("unityMatchOver", {
      detail: { winner: 1, player1Score: 5, player2Score: 3, timestamp: "2026-04-28T02:00:00.000Z" },
    }));

    expect(await screen.findByRole("heading", { name: /strategy recap/i })).toBeInTheDocument();
    expect(screen.getByText(/final score/i)).toBeInTheDocument();
    expect(screen.getByText(/5 - 3/)).toBeInTheDocument();
    expect(screen.getByText(/best duel score/i)).toBeInTheDocument();
  });

  it("keeps rendering Spacewar safely when avatar/progress APIs fail", async () => {
    (api.getAvatar as any).mockRejectedValue(new Error("avatar down"));
    (api.getProgress as any).mockRejectedValue(new Error("progress down"));

    render(<SpacewarArena />);

    await waitFor(() => {
      expect(screen.getByTestId("unity-webgl")).toBeInTheDocument();
    });
    expect(screen.getByRole("region", { name: /duel mission card/i })).toBeInTheDocument();
  });

  it("still allows difficulty selection changes", async () => {
    render(<SpacewarArena />);

    await screen.findByTestId("unity-webgl");
    fireEvent.click(screen.getByRole("radio", { name: /hard/i }));

    expect(localStorage.getItem("bb_spacewar_difficulty")).toBe("hard");
  });

  it("renders teacher classroom reflection prompts in recap", async () => {
    render(<SpacewarArena />);
    await screen.findByTestId("unity-webgl");

    window.dispatchEvent(new CustomEvent("unityMatchOver", {
      detail: { winner: 2, player1Score: 2, player2Score: 5 },
    }));

    const summary = await screen.findByText(/classroom reflection/i);
    fireEvent.click(summary);
    expect(screen.getByText(/what strategy helped you avoid the sun/i)).toBeInTheDocument();
  });
});
