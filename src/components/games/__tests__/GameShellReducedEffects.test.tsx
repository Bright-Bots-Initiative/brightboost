import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi, beforeEach } from "vitest";
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

describe("GameShell reduced effects integration", () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.stubGlobal("matchMedia", vi.fn().mockReturnValue({
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }));
  });

  it("renders reduced-effects toggle and applies reduced-effects data attribute", async () => {
    const user = userEvent.setup();
    render(
      <GameShell gameKey="test" title="Test" onComplete={() => {}}>
        {({ onFinish, reducedEffects }) => (
          <button type="button" onClick={() => onFinish({
            gameKey: "test",
            score: 1,
            total: 1,
            streakMax: 1,
            roundsCompleted: 1,
          })}>
            child-{reducedEffects ? "on" : "off"}
          </button>
        )}
      </GameShell>,
    );

    expect(screen.getByRole("button", { name: /reduced effects: off/i })).toBeInTheDocument();
    const shell = screen.getByRole("button", { name: "child-off" }).closest("[data-reduced-effects]");
    expect(shell).toHaveAttribute("data-reduced-effects", "false");

    await user.click(screen.getByRole("button", { name: /reduced effects: off/i }));
    expect(screen.getByRole("button", { name: "child-on" })).toBeInTheDocument();
    expect(shell).toHaveAttribute("data-reduced-effects", "true");
  });
});
