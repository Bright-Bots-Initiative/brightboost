import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import GameShell from "../shared/GameShell";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock("@/components/activities/ActivityHeader", () => ({
  default: ({ title }: { title: string }) => <div>{title}</div>,
}));

vi.mock("@/hooks/usePersonalBest", () => ({
  usePersonalBest: () => null,
}));

describe("GameShell accessibility", () => {
  beforeEach(() => {
    vi.stubGlobal("matchMedia", vi.fn().mockReturnValue({
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }));
  });

  it("renders control instructions on briefing and focuses start/results headings", async () => {
    const user = userEvent.setup();

    render(
      <GameShell
        gameKey="access-test"
        title="Access Test"
        onComplete={() => {}}
        briefing={{
          title: "Mission",
          story: "Story",
          icon: "🎮",
          controlInstructions: {
            keyboard: ["Use Tab and Enter."],
            buttons: ["Choose an action."],
          },
        }}
      >
        {({ onFinish }) => (
          <button
            type="button"
            onClick={() => onFinish({ gameKey: "access-test", score: 1, total: 1, streakMax: 1, roundsCompleted: 1 })}
          >
            finish
          </button>
        )}
      </GameShell>,
    );

    const startButton = screen.getByRole("button", { name: /games\.shared\.startMission/i });
    expect(startButton).toHaveFocus();
    expect(screen.getByText("Use Tab and Enter.")).toBeInTheDocument();

    await user.click(startButton);
    expect(screen.getByRole("region", { name: /access test game area/i })).toHaveFocus();

    await user.click(screen.getByRole("button", { name: "finish" }));
    expect(screen.getByRole("heading", { name: /games\.shared\.amazing/i })).toHaveFocus();
  });
});
